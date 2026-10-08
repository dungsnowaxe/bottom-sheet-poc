---
name: react-native-backdrop-stability
description: >-
  Prevent and investigate flicker, flashes, brightness pumping, spatial noise,
  and jank in React Native bottom-sheet and modal backdrops. Use proactively
  when adding or changing blur, dimming, overlay opacity, sheet presentation,
  dismissal, or animation ownership; also use when verifying that a backdrop
  regression is gone. Requires transition evidence, controlled comparisons,
  and native frame-timing checks rather than settled screenshots alone.
---

# React Native backdrop stability

Design stable transitions first; preserve executable regression evidence afterward.
Do not promise that flicker can never occur on every device. Enforce the gates below,
state what was actually observed, and block a stability claim when evidence is missing.

## 1. Establish the contract before implementation

Record the requested platform, exact sheet implementation, device/OS/refresh rate,
release build, background content, and failing interaction. Keep platform scope explicit.

Define the intended transition: clear → blurred/dimmed → held → clear. Specify behavior
for first open, reopen, each supported dismissal, rapid interruption, reduced motion,
and background changes. Set visual sensitivity, sampling requirements, and a native
frame-time/jank budget **before** comparing a fix; do not move them to obtain green output.

Read installed dependency versions and matching documentation before touching APIs.
For Expo, read `package.json`, fetch the matching versioned docs, and follow the project
installation/CNG rules. Do not use remembered props to disable a native dimmer or obtain
presentation progress. Do not treat an old-Android blur limitation as proof about a newer OS.

## 2. Prevent unstable presentation by construction

### One owner of the backdrop timeline

- Prefer one supported presentation-progress value driving blur opacity, dim opacity,
  and sheet motion. Account for drag, cancellation and reversal—not just programmatic open.
- Explicitly identify which component owns dimming. Do not accidentally stack a custom
  dimmer over a native/library dimmer.
- Remember that blur tint is a color contribution, not merely softer pixels. A light tint
  becoming stronger while another layer darkens can create a brightness rebound.
- If the native adapter cannot expose progress or disable its dimmer, **do not pretend
  equal durations or delays synchronize the effects**. Choose a single-effect fallback,
  a supported integrated backdrop, or an explicitly designed sequence; verify the result.
- Reanimated is this project's preferred animation engine. Changing engines alone does
  not fix competing timelines, native blur initialization, or compositor cost. A native-
  driven React Native Animated fade is not automatically a JS-thread bottleneck.

### Stable layer lifetime and background

- Attach and lay out the blur target before revealing its output. Keep the layer identity,
  target ref, geometry and z-order stable through the transition.
- Prefer a constant blur intensity and cross-fade its result as the initial design.
  Do not insert an already full-strength blur exactly when opening starts. This is a
  design starting point, **not** a guarantee of cheaper native rendering; profile it.
- Keep the layer available until its closing fade finishes. Do not remount, change keys,
  reparent or tear down the blur midway through presentation/dismissal.
- Evaluate hidden-state cost: opacity zero may still incur native work. Use documented,
  measured lifecycle controls if needed; do not keep expensive blur active across the
  entire app merely to avoid a mount flash.
- Disabling background controls must not introduce a second opacity/layout change beneath
  the transitioning backdrop. Preserve appearance where appropriate **while keeping controls
  disabled and accessibility semantics correct**; do not remove disabled styling globally.
- Avoid incidental text/layout/scroll changes behind the effect during presentation.
  Do not freeze legitimately dynamic content or reuse stale/private snapshots silently.
- Make the decorative overlay noninteractive and inaccessible to assistive technology;
  preserve the sheet's focus, dismissal and hit-testing behavior.

### Interruption-safe lifecycle

- Reverse from the current progress; do not reset to zero on every state change.
- Cancel superseded animations and guard stale completion callbacks so an old close
  cannot unmount or hide a newly reopened backdrop.
- Apply reduced-motion behavior consistently to sheet, blur and dimming. Verify final
  state and input/focus even when animations complete immediately.
- If native blur is the measured bottleneck, consider a documented simpler fallback.
  Do not trade frame instability for stale content, broken dismissal or accessibility.

## 3. Distinguish the symptom from its cause

| Observation | What it establishes | What it does not establish |
| --- | --- | --- |
| Brightness rebound | A decoded region became brighter | An Expo bug, random noise, or unintended tint behavior |
| Spatial residual | Pixels differ from the expected image-change model | App-generated noise rather than codec/compositing effects |
| Large video PTS gap | Incomplete capture coverage | An equally long app frame stall |
| Native deadline misses | Irregular frame presentation on that target/run | Which library, thread, GPU path or OS defect caused it |
| Correct settled screenshot | Correct appearance at one instant | Stable opening, dismissal or interruption |
| Passing taps/selectors | The interaction path worked | A flicker-free animation |

For a source claim, use a controlled comparison. Keep the same screen, content, sheet,
build and interactions; change **one factor per run**:

1. Plain translucent overlay instead of real blur, with the same animation.
2. Real blur held at fixed opacity during the sheet transition.
3. Real blur with the animated opacity.
4. Supported single-owner versus independently timed dim/blur, if available.

Separate cold first-open and warm reopen behavior. Repeat conditions and counterbalance
order when comparing performance. A differently worded dimmed scenario is a useful control,
but not an isolated A/B test of blur cost. Profile before optimizing; keep a change only
when the target metric improves without introducing correctness regressions.

## 4. Observe the transition, not just its endpoint

Use the device-setup/interaction skills for the target. For repeated interactions load
[argent-create-flow](../argent-create-flow/SKILL.md); for formal acceptance/regression
coverage also load [argent-qa-flows](../argent-qa-flows/SKILL.md).

- Verify the intended screen identity, closed sheet and baseline before recording.
  After a cold launch, wait for app readiness before deep-linking; reject failed setup.
- Begin capture **before** the opening action. Capture early blur initialization as well
  as dimming; brightness-only onset detection can omit the sharp-to-blurred handoff.
- Record first open, held-open, close, reopened, and the supported interruption/dismissal
  paths. Use readiness gates before subsequent actions; do not start recording only after idle.
- A fixed hold is an observation window, not proof of idle or correct state. Establish
  a selector as visible before using its later absence as evidence.
- Preserve actual presentation timestamps and original frames. Display refresh rate,
  nominal encoder FPS and average video FPS do not prove actual per-frame coverage.
  Never interpolate/duplicate frames to manufacture a smooth result.
- Scope a fixed background ROI above the moving sheet, excluding dynamic controls and
  system chrome. Include texture, edges and neutral areas. Use additional/full-resolution
  regions or RGB analysis when subtle local/chromatic artifacts might be missed.
- Model intended changes; blur, tint and dimming can evolve independently. Monotonic mean
  brightness is not a universal blur invariant. Review candidates against the design.
- Do not let an unstable tail raise its own thresholds and hide a late flash. Test the
  detector with injected one-frame brightness pulses, zero-mean spatial noise, benign
  fades/quantization, missing frames and invalid starting states.

Use [argent-screen-recording](../argent-screen-recording/SKILL.md) for recording lifecycle.
Capture at sufficient **actual** cadence for the suspected event. An event-driven gap can
be harmless stillness or missing evidence; without independent proof it is not a clean pass.
Avoid simultaneous video recorders when measuring animation cost. Cap recordings, schedule
stop reminders, finalize in cleanup, and signal only the recorder started for this task.

## 5. Verify native timing independently

Load [argent-native-profiler](../argent-native-profiler/SKILL.md). Run the same recorded
path without video capture to separate encoder overhead from frame presentation problems.
For React/JS bottlenecks also load [argent-react-native-optimization](../argent-react-native-optimization/SKILL.md).

Save native frame evidence, counts, denominators/window scope, worst/tail durations and
jank reasons. Do not label every wait as CPU work or infer a hotspot without usable stacks.
Use a physical device before making a device-quality claim; emulator/host load is a confound,
not permission to ignore a reproduced symptom. If only the physical panel flickers, use
high-speed external footage—screen recording cannot verify panel behavior.

## 6. Stability gate and handoff

Complete a stability claim only when all applicable conditions are satisfied:

- [ ] The unchanged deterministic path passes twice with all structural checks executed.
- [ ] Visual candidates are absent or explicitly explained/reviewed in adequately sampled
      before/after transitions; a heuristic candidate is not automatically a confirmed defect.
- [ ] Native timing meets the predeclared device-specific budget across repeated runs.
- [ ] First-open/reopen and supported closing/interruption/reduced-motion paths are covered.
- [ ] Focus, interaction locking, outside dismissal, content freshness and accessibility remain correct.
- [ ] Lint, typecheck and relevant tests pass; raw evidence and reproduction commands are saved.

Keep **interaction pass**, **pixel observation**, **native timing**, and **root-cause confidence**
as separate verdicts. Insufficient sampling, wrong start state, unexplained candidates or
unmet timing budget means **inconclusive/blocked**, not “noise gone.” A bounded successful
result applies only to the stated devices, paths, regions and sensitivity—not all future frames.

Read [project-checks](references/project-checks.md) for this repository's helpers and their
limits. Read [session-lessons](references/session-lessons.md) when investigating the original
backdrop issue; it records evidence without turning hypotheses into established causes.
