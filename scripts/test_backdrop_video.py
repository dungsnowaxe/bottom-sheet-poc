"""Detector contracts: injected artifacts must be caught; intentional fades must not.

These tests validate the measurement logic, not the app or human perceptibility.
Real H.264/compositor false-positive calibration still needs device recordings.
"""
import importlib.util
from pathlib import Path
import unittest

import numpy as np

spec = importlib.util.spec_from_file_location(
    "backdrop_video", Path(__file__).with_name("analyze-backdrop-video.py"))
video = importlib.util.module_from_spec(spec)
spec.loader.exec_module(video)


class BackdropDetectorTests(unittest.TestCase):
    def setUp(self):
        rng = np.random.default_rng(34)
        self.clear = rng.uniform(160, 230, size=(24, 36))
        blur = sum(np.roll(self.clear, (dy, dx), (0, 1))
                   for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9
        self.times = np.arange(60)/60
        p = np.minimum(self.times/0.3, 1)
        # Independent blur and dim timings are intentionally allowed.
        dim = 1 - 0.5*np.minimum(self.times/0.2, 1)
        self.frames = np.array([
            d*((1-b)*self.clear + b*blur) for b, d in zip(p, dim)
        ])

    def analyze(self, frames=None, times=None):
        return video.analyze_window(
            self.times if times is None else times,
            self.frames if frames is None else frames, self.clear,
        )

    def test_intended_blur_plus_dimming_has_no_candidate(self):
        result = self.analyze()
        self.assertEqual(result["status"], "no-candidate-in-observed-frames")
        self.assertEqual(result["candidates"], [])

    def test_single_sample_flash_is_detected(self):
        frames = self.frames.copy()
        frames[35] += 1.0
        result = self.analyze(frames)
        candidates = result["candidates"]
        self.assertTrue(any(c["kind"] == "brightness-reversal" and c["frame"] == 35
                            for c in candidates))
        self.assertEqual(result["status"], "candidates-detected")

    def test_late_flash_cannot_raise_its_own_threshold(self):
        frames = self.frames.copy()
        frames[-1] += 1.0
        result = self.analyze(frames)
        self.assertEqual(result["luma_threshold_levels"], 0.5)
        self.assertTrue(any(c["kind"] == "brightness-reversal" and c["frame"] == 59
                            for c in result["candidates"]))

    def test_zero_mean_spatial_noise_is_detected(self):
        frames = self.frames.copy()
        pattern = (np.indices(self.clear.shape).sum(0) % 2)*2-1
        frames[32] += pattern * 8
        result = self.analyze(frames)
        self.assertLess(result["max_rebound_levels"], 0.5)
        self.assertTrue(any(c["kind"] == "spatial-residual" and c["frame"] == 32
                            for c in result["candidates"]))

    def test_small_quantization_like_noise_is_below_sensitivity_floor(self):
        rng = np.random.default_rng(99)
        frames = self.frames + rng.uniform(-0.35, 0.35, self.frames.shape)
        self.assertEqual(self.analyze(frames)["candidates"], [])

    def test_frame_gap_cannot_be_reported_as_a_clear_transition(self):
        ids = np.r_[0:4, 12:60]
        result = self.analyze(self.frames[ids], self.times[ids])
        self.assertEqual(result["status"], "inconclusive")
        self.assertFalse(result["temporal_coverage_ok"])
        self.assertGreater(result["active_max_gap_ms"], 100)

    def test_duplicate_pts_is_rejected(self):
        times = self.times.copy()
        times[4] = times[3]
        with self.assertRaises(ValueError):
            self.analyze(times=times)

    def test_insufficient_samples_are_rejected(self):
        with self.assertRaises(ValueError):
            self.analyze(self.frames[:2], self.times[:2])

    def test_wrong_start_state_is_rejected(self):
        with self.assertRaises(ValueError):
            video.opening_indices(np.ones(60)*100)

    def test_blur_onset_before_dimming_is_not_omitted(self):
        # Texture disappears starting at 150 ms; darkening starts much later.
        t = np.arange(70)/60
        blur = np.minimum(np.maximum((t-0.15)/0.3, 0), 1)
        dim = 1 - 0.5*np.minimum(np.maximum((t-0.7)/0.2, 0), 1)
        mean = self.clear.mean()
        frames = np.array([d*((1-b)*self.clear+b*mean) for b, d in zip(blur, dim)])
        starts = np.flatnonzero(frames.mean((1, 2)) < mean-8)[:1]
        ids = video.window_indices(t, frames, starts)[0]
        self.assertLessEqual(t[ids[0]], 0.2)
        self.assertGreater(t[ids[-1]], 1.0)

    def test_exactly_two_holds_are_required(self):
        means = np.r_[np.ones(10)*200, np.ones(10)*100,
                      np.ones(10)*200, np.ones(10)*100, np.ones(10)*200]
        self.assertEqual(video.opening_indices(means).tolist(), [10, 30])
        with self.assertRaises(ValueError):
            video.opening_indices(means[:30])


if __name__ == "__main__":
    unittest.main()
