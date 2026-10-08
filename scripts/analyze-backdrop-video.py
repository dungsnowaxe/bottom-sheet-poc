#!/usr/bin/env python3
"""Flag backdrop flicker candidates without confusing sparse video with a pass.

Requires ffmpeg, ffprobe, numpy and Pillow. Grayscale levels are decoded video
levels (0..255), not physical display luminance. Intended for the Android
backdrop-noise-hold-android flow, with an initially closed, stationary page.
"""
import argparse
import csv
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROI = (0.10, 0.12, 0.80, 0.18)  # x, y, width, height; above the moving sheet
SIZE = (288, 144)


def probe_and_decode(path, roi=ROI):
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_streams",
        "-show_frames", "-show_entries",
        "stream=width,height:frame=best_effort_timestamp_time", "-of", "json", str(path),
    ]))
    stream = probe["streams"][0]
    times = np.array([float(f["best_effort_timestamp_time"]) for f in probe["frames"]])
    if len(times) < 3 or np.any(np.diff(times) <= 0):
        raise ValueError("Need at least three frames with strictly increasing presentation timestamps")
    w, h = stream["width"], stream["height"]
    x, y, rw, rh = roi
    crop = (round(rw*w), round(rh*h), round(x*w), round(y*h))
    if min(crop[:2]) < 2 or crop[2]+crop[0] > w or crop[3]+crop[1] > h:
        raise ValueError("ROI lies outside the video")
    width, height = SIZE
    raw = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(path), "-vf",
        f"crop={crop[0]}:{crop[1]}:{crop[2]}:{crop[3]},scale={width}:{height},format=gray",
        "-fps_mode", "passthrough", "-enc_time_base", "1:90000", "-f", "rawvideo", "-",
    ])
    frames = np.frombuffer(raw, np.uint8).reshape(-1, height, width).astype(np.float64)
    if len(frames) != len(times):
        raise ValueError("Decoded frame count does not match PTS count; refusing to interpolate")
    return times, frames


def opening_indices(means):
    # Ignore tiny press/compression changes. The flow must have exactly two
    # well-separated, substantially darkened holds; never guess on arbitrary videos.
    drop = means[0] - means.min()
    if drop < 20:
        raise ValueError("No substantial dimming: wrong region, wrong flow, or unsupported video")
    dark = means < means[0] - max(8, drop * 0.10)
    starts = np.flatnonzero(dark & ~np.r_[False, dark[:-1]])
    if len(starts) != 2:
        raise ValueError(f"Expected exactly two dark holds, found {len(starts)}")
    return starts


def window_indices(times, frames, starts):
    # Blur can start well before native dimming. Brightness alone must not choose
    # the onset and silently omit the very sharp-to-blurred handoff under test.
    contrast = (np.abs(np.diff(frames, axis=1)).mean(axis=(1, 2)) +
                np.abs(np.diff(frames, axis=2)).mean(axis=(1, 2)))
    if contrast[0] < 0.5:
        raise ValueError("ROI lacks visual structure; cannot locate blur onset")
    sharp = contrast >= contrast[0] * 0.97
    means = frames.mean(axis=(1, 2))
    sufficiently_bright = means >= means[0] - 2
    windows = []
    previous_hold_end = 0
    for start in starts:
        prior = np.flatnonzero(sharp & sufficiently_bright &
                              (np.arange(len(times)) >= previous_hold_end) &
                              (np.arange(len(times)) < start))
        if not len(prior):
            raise ValueError("Opening lacks a preceding sharp, closed baseline")
        leading = int(prior[-1])
        end = times[start] + 0.85
        ids = np.flatnonzero((np.arange(len(times)) >= leading) & (times <= end))
        if len(ids) < 3:
            raise ValueError("Opening has too few samples")
        windows.append(ids)
        # Locate the next closed interval, excluding the current dark hold.
        bright_after = np.flatnonzero((np.arange(len(times)) > start) & sufficiently_bright)
        previous_hold_end = int(bright_after[0]) if len(bright_after) else len(times)
    return windows


def analyze_window(times, frames, baseline, luma_threshold=0.5,
                   residual_threshold=1.5, required_gap_ms=25.0):
    """Analyze a single opening; caller must exclude intentional dismissal.

    The affine clear/final/constant basis allows independent blur cross-fade and
    uniform dimming, rather than calling every intended pixel change noise.
    Residuals are *review candidates*, not proof that pixels came from the app:
    quantization, compression and non-linear compositing can also produce them.
    """
    if len(times) < 3 or np.any(np.diff(times) <= 0):
        raise ValueError("Opening needs at least three increasing frame timestamps")
    means = frames.mean(axis=(1, 2))
    reference = np.median(frames[-min(3, len(frames)):], axis=0)
    basis = np.stack([baseline.ravel(), reference.ravel(),
                      np.ones(baseline.size)], axis=1)
    images = frames.reshape(len(frames), -1)
    coefficients = np.linalg.lstsq(basis, images.T, rcond=None)[0]
    residual = images - (basis @ coefficients).T
    residual_rms = np.sqrt(np.mean(residual**2, axis=1))
    # Tail statistics are diagnostic, not permission to raise the thresholds:
    # a real late flash must not calibrate itself out of existence.
    tail = min(3, len(frames))
    residual_limit = residual_threshold
    tail_luma_range = float(np.ptp(means[-tail:]))
    luma_limit = luma_threshold
    rebound = means - np.minimum.accumulate(means)
    brightest_rebound = int(np.argmax(rebound))
    reference_mean = float(reference.mean())
    close_to_final = np.abs(means - reference_mean) <= luma_limit
    # First frame from which *all* later samples stay near final brightness.
    stays_final = np.logical_and.accumulate(close_to_final[::-1])[::-1]
    settled = int(np.flatnonzero(stays_final)[0]) if stays_final.any() else len(frames)-1
    motion_end = max(1, settled)
    gaps_ms = np.diff(times[:motion_end+1]) * 1000
    max_gap = float(gaps_ms.max())
    coverage_ok = max_gap <= required_gap_ms and motion_end >= 3
    candidates = []
    if rebound[brightest_rebound] > luma_limit:
        candidates.append({"kind": "brightness-reversal", "frame": brightest_rebound,
                           "time_s": float(times[brightest_rebound]),
                           "level": float(rebound[brightest_rebound])})
    for i in np.flatnonzero(residual_rms > residual_limit):
        candidates.append({"kind": "spatial-residual", "frame": int(i),
                           "time_s": float(times[i]), "rms": float(residual_rms[i])})
    status = ("candidates-detected" if candidates else
              "no-candidate-in-observed-frames" if coverage_ok else "inconclusive")
    return {
        "status": status, "samples": len(frames),
        "start_s": float(times[0]), "end_s": float(times[-1]),
        "settled_sample_s": float(times[settled]),
        "active_max_gap_ms": max_gap, "temporal_coverage_ok": bool(coverage_ok),
        "max_rebound_levels": float(rebound.max()),
        "max_spatial_residual_rms": float(residual_rms.max()),
        "luma_threshold_levels": luma_limit, "residual_threshold_rms": residual_limit,
        "tail_luma_range_levels": tail_luma_range,
        "tail_residual_rms_max": float(residual_rms[-tail:].max()),
        "candidates": candidates,
        "series": [{"time_s": float(t), "mean": float(m), "rebound": float(r),
                    "residual_rms": float(e)}
                   for t, m, r, e in zip(times, means, rebound, residual_rms)],
    }


def inspect_video(path, roi=ROI, **thresholds):
    times, frames = probe_and_decode(path, roi)
    means = frames.mean(axis=(1, 2))
    starts = opening_indices(means)
    results = []
    for episode, ids in enumerate(window_indices(times, frames, starts)):
        # Include early blur as well as dimming, stopping 850 ms after substantial
        # darkening. The 2.5 s flow hold keeps intentional dismissal outside scope.
        baseline = frames[ids[0]]
        opening = analyze_window(times[ids], frames[ids], baseline, **thresholds)
        opening["episode"] = "first-open" if episode == 0 else "reopen"
        opening["global_indices"] = ids.tolist()
        results.append(opening)
    return {
        "video": str(path), "roi_normalized": list(roi), "analysis_size": list(SIZE),
        "decoded_frames": len(frames), "presentation_duration_s": float(times[-1]),
        "scope": "two opening windows only; no dismissal/whole-screen/physical-display assertion",
        "openings": results,
    }, times, frames


def write_visuals(report, frames, output):
    # Actual samples only, including their PTS. No frame interpolation/30 fps export.
    width, height = SIZE
    panels = []
    for opening in report["openings"]:
        ids = opening["global_indices"]
        picked = set(np.linspace(0, len(ids)-1, min(12, len(ids))).astype(int).tolist())
        flagged = {c["frame"] for c in opening["candidates"]}
        for candidate in flagged:
            picked.update(range(max(0, candidate-1), min(len(ids), candidate+2)))
        for local in sorted(picked):
            i = ids[local]
            panel = Image.new("RGB", (width, height+35), "#fafafa")
            panel.paste(Image.fromarray(frames[i].astype(np.uint8)).convert("RGB"), (0, 35))
            draw = ImageDraw.Draw(panel)
            color = "#b91c1c" if local in flagged else "black"
            draw.text((5, 3), f"{opening['episode']} / frame {i}", fill=color)
            draw.text((5, 18), f"PTS {opening['series'][local]['time_s']:.4f}s", fill=color)
            if local in flagged:
                draw.rectangle((0, 0, width-1, height+34), outline=color, width=3)
            panels.append(panel)
    cols = 4
    montage = Image.new("RGB", (cols*width, ((len(panels)+cols-1)//cols)*(height+35)), "white")
    for i, panel in enumerate(panels):
        montage.paste(panel, ((i % cols)*width, (i // cols)*(height+35)))
    montage.save(output.with_suffix(".png"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("--output", type=Path, required=True, help="Report JSON path; also writes CSV and PNG")
    parser.add_argument("--roi", type=float, nargs=4, default=ROI, metavar=("X", "Y", "W", "H"))
    parser.add_argument("--luma-threshold", type=float, default=0.5)
    parser.add_argument("--residual-threshold", type=float, default=1.5)
    parser.add_argument("--required-max-gap-ms", type=float, default=25.0)
    args = parser.parse_args()
    if (args.luma_threshold <= 0 or args.residual_threshold <= 0 or
            args.required_max_gap_ms <= 0 or any(v < 0 or v > 1 for v in args.roi)):
        parser.error("Thresholds must be positive; normalized ROI values must lie in [0,1]")
    report, _, frames = inspect_video(
        args.video, tuple(args.roi), luma_threshold=args.luma_threshold,
        residual_threshold=args.residual_threshold, required_gap_ms=args.required_max_gap_ms,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2)+"\n")
    with args.output.with_suffix(".csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["episode", "frame", "time_s", "mean", "rebound", "residual_rms"])
        writer.writeheader()
        for opening in report["openings"]:
            for index, row in zip(opening["global_indices"], opening["series"]):
                writer.writerow({"episode": opening["episode"], "frame": index, **row})
    write_visuals(report, frames, args.output)
    for opening in report["openings"]:
        print(f"{opening['episode']}: {opening['status']}; max gap "
              f"{opening['active_max_gap_ms']:.1f} ms; rebound "
              f"{opening['max_rebound_levels']:.3f}; residual RMS "
              f"{opening['max_spatial_residual_rms']:.3f}")
    # Candidate or insufficient coverage must never give automation a green exit.
    return 0 if all(o["status"] == "no-candidate-in-observed-frames" for o in report["openings"]) else 2


if __name__ == "__main__":
    raise SystemExit(main())
