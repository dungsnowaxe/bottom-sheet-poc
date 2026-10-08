# Lessons from the bottom-sheet backdrop investigation

These observations explain why the skill requires both preventative design and temporal
verification. They are historical evidence, not assumptions about a future dependency version.

## What improved and what remains unknown

- Inserting a full-intensity blur on open produced an abrupt sharp-to-blurred onset.
  Keeping the target/layer mounted within the blur scenario and fading the result visibly
  improved that onset. This did **not** prove all flicker was eliminated.
- Disabling background buttons changed their appearance during presentation. Preserving
  their appearance specifically for backdrop scenarios removed that extra background change
  without re-enabling input or changing disabled styling globally.
- Switching a native-driven React Native Animated opacity fade to Reanimated did not
  demonstrate a conclusive further smoothness improvement. Do not diagnose JS-thread
  animation merely from the previous animation library's name.
- The shared blur opacity used its own 300 ms timing; each sheet retained its own dimmer.
  One unified presentation-progress signal was not available across all adapters.
  Light-tint blur and darkening could therefore advance independently. This is an
  implementation risk and candidate explanation, **not a proven cause of the reported flash**.
- An earlier onset problem also reproduced on iOS. Do not declare the overall design
  problem Android-only just because one platform made it more noticeable. Respect the
  user's Android-only investigation scope while keeping causality claims separate.

## What the measurements actually found

The later investigation used Android 15/API 35 on a 1080×2400, nominally 60 Hz emulator
and the existing release app. Two rounds covered Expo UI, Gorhom and TrueSheet, dimmed
and blur, with first open and reopen: 12 successful interaction replays, 24 measured openings.

- One Expo blur reopening sample rebounded by **0.559/255 decoded gray levels**. It was
  a review candidate, not proof of app-generated noise or a defect in `expo-blur`.
- Pixel verdicts: **2 no-candidate-in-observed-frames, 21 inconclusive, 1 candidates-detected**.
  Large PTS gaps prevented a credible absence claim in most captures.
- A separate TrueSheet blur replay under Perfetto, **without video**, reported 31 janky
  frames, worst 122 ms, with app/compositor deadline misses and buffer stuffing.
  It established native timing instability on that emulator/run, not its root cause.
- Usable native call stacks were unavailable in the release trace. No attribution to
  Expo BlurView, Reanimated, a sheet library or Android itself was established.
- A cold-start deep link was initially lost while the app booted. Setup failed and the
  resulting Home-screen recording was excluded. The runner now waits for readiness and
  rejects failed gates rather than measuring the wrong screen.
- Nominal 30 fps Argent footage could miss a short event on a 60 Hz display. Native
  capture also had variable cadence. Neither an FPS label nor a smooth exported movie
  is sufficient evidence of actual capture coverage.
- Darkening-only onset detection missed early blur. The detector was corrected to include
  the last sharp/bright sample; the synthetic regression checks blur starting before dimming.

The detailed report, if retained locally, is at
[artifacts/backdrop-noise-investigation.md](../../../../artifacts/backdrop-noise-investigation.md).
Raw videos/traces may be ignored or absent in another checkout; do not require them to use
this skill and do not invent missing evidence.

## Do not turn hypotheses into fixes

Neither “Expo blur is buggy” nor “Android/emulator artifact” was established. Before a
library-specific fix, compare a matching translucent overlay, static real blur and animated
real blur on the same screen, then repeat native profiling. Before claiming the symptom is
resolved, verify that the measured event actually matches what the human reported.

The prevention lesson is **stable ownership and lifecycle plus discriminating regression
coverage**, not “use Reanimated and flicker can never happen.”
