# Project verification helpers

Paths below are relative to this reference file. The repository root is `../../../..`.
Run commands from that root. Inspect the helpers before execution; do not assume they are
available after copying this skill to another project.

## Existing tools

- [Capture runner](../../../../scripts/capture-backdrop-noise.mjs): Android only; stages a
  fresh release-app comparison screen, checks readiness, and replays the saved fragment.
  Native-resolution `adb screenrecord`, 40 Mbps, 28-second safety cap. One video recorder;
  stop reminder, recorder-specific PID cleanup, finalized pull and capture/replay metadata.
- [Pixel analyzer](../../../../scripts/analyze-backdrop-video.py): actual PTS, two opening
  windows, loss-of-sharpness onset detection, fixed grayscale ROI, brightness and fitted
  spatial-residual candidate channels; emits JSON, CSV and timestamped contact sheets.
- [Detector contracts](../../../../scripts/test_backdrop_video.py): synthetic positive
  and negative tests, including late flashes that must not adjust their own thresholds.
- [Argent fragment](../../../../.argent/flows/backdrop-noise-hold-android.yaml): first open,
  2.5-second hold, Close, 1.5-second closed hold, reopen, 2.5-second hold, Android Back.

**This fragment is not a self-contained launch/setup QA test.** The capture runner supplies
its prerequisite. For a formal CI regression, use `argent-qa-flows` to record deterministic
setup and all acceptance checks; preserve that skill's fresh-service/two-pass requirements.
The current helpers do not automatically enforce a native timing or shipping gate.

## Reproduce a scoped capture

Prerequisites: booted/connected Android target; the intended release APK installed;
`adb`, Node, `ffmpeg`/`ffprobe`, the project's installed Argent CLI, NumPy and Pillow.
Use the Android setup skill to discover the actual serial; do not assume the example serial.

```sh
# From the repository root; diagnostic Python dependencies stay outside the app.
python3 -m venv /tmp/sheetlab-vision
/tmp/sheetlab-vision/bin/python -m pip install numpy pillow

# Use a fresh output directory to preserve previous evidence.
node scripts/capture-backdrop-noise.mjs \
  --device emulator-5554 --case true-blur \
  --out artifacts/backdrop-noise/before

/tmp/sheetlab-vision/bin/python scripts/analyze-backdrop-video.py \
  artifacts/backdrop-noise/before/true-blur.mp4 \
  --output artifacts/backdrop-noise/before/true-blur-analysis.json
```

Supported cases: `expo-dimmed`, `expo-blur`, `gorhom-dimmed`, `gorhom-blur`,
`true-dimmed`, `true-blur`. Omit `--case` to capture all six. These are observational
comparisons, not an isolated causal A/B test because scenario content can differ.
Use a new `after` output directory with the same device/build conditions after one fix.

## Interpret the analyzer narrowly

Current defaults are exploratory, **not universal perceptual or production budgets**:

- ROI: normalized `(0.10, 0.12, 0.80, 0.18)`; 864×432 → 288×144 at the original resolution.
- Brightness rebound: `0.5` decoded grayscale levels out of 255.
- Fitted spatial residual: `1.5` grayscale RMS.
- Transition maximum sample gap: `25 ms`, a diagnostic coverage gate for the original
  nominally 60 Hz environment—not a proof that every panel frame was observed.

Choose and document thresholds for the target/design **before** comparing changes.
Do not loosen them after a failure or convert these values into a “no jank” requirement.
The CLI accepts `--roi`, `--luma-threshold`, `--residual-threshold`, and
`--required-max-gap-ms`. If default scope cannot observe the reported symptom, extend
coverage and its tests rather than passing a narrower metric off as verification.

- `no-candidate-in-observed-frames`: scoped samples below the configured thresholds;
  **not** proof that the entire screen, hold, dismissal or physical panel is flicker-free.
- `candidates-detected`: review the flagged frame and neighbors; expected light tint,
  compression or compositing may explain it. Check temporal coverage separately.
- `inconclusive`: insufficient transition coverage even without a candidate.
- Exit `0`: both opening windows have no candidate under the coverage heuristic.
- Exit `2`: candidate or insufficient coverage. Invalid input/setup also fails execution;
  do not swallow errors with `|| true` or mistake command completion for a verdict.

Known limits: two substantially darkened holds required; grayscale/downsampled ROI only;
opening windows only, ending 850 ms after substantial darkening. No direct acceptance for
whole-held-open stability, closing/swiping/outside-tap transitions, rapid interruption,
reduced motion, colored/subpixel noise or panel-level flicker. Add dedicated evidence for
those requirements. A flat/static video cannot serve as a clean opening regression pass.

## Native timing and final checks

Use `argent-native-profiler` to profile the same correctly staged flow **without video**.
Finalize the profiler, preserve its trace/report, and compare repeated before/after native
frame evidence. Missing release-build call stacks limit attribution; do not hand-edit
CNG native directories to obtain them. Follow current Expo build/config documentation.

```sh
/tmp/sheetlab-vision/bin/python -m unittest discover \
  -s scripts -p 'test_backdrop_video.py' -v
bun run lint
bunx tsc --noEmit
bun test
```

Before a stability handoff, record:

| Evidence | Required detail |
| --- | --- |
| Setup | Platform, device, OS, refresh rate, build, content and verified start state |
| Intervention | One changed factor and the hypothesized mechanism |
| Interaction | Exact flow/setup owner, executed assertions, both repeat results |
| Pixels | ROI/resolution, actual PTS gaps, thresholds, candidate times and review |
| Native frames | Observation window, budget, repeated timing/jank results and recording overhead |
| Limitations | Unobserved phases/regions/devices, missing stacks and unresolved candidates |
| Verdict | Verified in stated scope, inconclusive/blocked, or regression—not a global guarantee |
