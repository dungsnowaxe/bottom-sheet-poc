# Bottom Sheet Lab: measurement protocol

## Scope and evidence standard

Compare Expo UI Universal 57.0.22, Gorhom 5.2.14, and **TrueSheet stable v3.11.18** on Expo SDK 57 (expo 57.0.27) / RN 0.86.3. The starter's RN 0.86.0 was upgraded because Expo Doctor flagged its Hermes V1 regression; never mix measurements from before/after this patch alignment. Legend List is pinned to 3.6.0 and imported from `/react-native`.

There are 15 scenario/library combinations. Each list has light and heavy modes. Report each OS, scenario, row mode, and baseline/JS-busy condition separately. A capability failure takes precedence over timing: a fast implementation that clips the focused input has not passed the form scenario.

Physical-device release measurements support performance conclusions. Simulator/emulator data is exploratory and must be labeled accordingly. Do not extrapolate it to real phones. Do not compare React development-profiler durations against native release traces as equivalent metrics.

## Build and execution

The app uses Expo Continuous Native Generation. Do not edit generated `ios/` or `android/` files. Configuration is in `app.json`; generated projects are ignored.

```sh
bun install
bun run lint
bun run typecheck
bun run test

# Local development builds, then Metro:
bun run ios -- --device '<simulator name or UDID>'
bun run android -- --device '<AVD/device name>'
bun run start

# Local release builds (embedded bundle; no Metro needed):
bun run build:ios:release -- --device '<simulator name or UDID>' --no-bundler
bun run build:android:release -- --device '<AVD/device name>' --no-bundler

# EAS, after configuring your account/project:
bunx eas-cli build --profile development --platform ios
bunx eas-cli build --profile development --platform android
bunx eas-cli build --profile preview --platform all
```

The EAS `preview` profile builds an internal-distribution release binary; iOS physical devices require registration/signing. No account, credentials, or cloud build is provisioned by this POC. The complete matrix requires a custom binary because TrueSheet is not bundled in Expo Go.

The bundle/package identifier is `dev.snowaxe.bottomsheetpoc`, scheme `sheetlab`. Comparison routes are `/compare/expo?scenario=form`, `/compare/gorhom?scenario=stack`, etc. Device test flows should navigate through the UI; deep links are useful for manual setup, not a replacement for testing navigation.

## Deterministic workloads

- Confirmation: removal takes 1,500ms, success/failure selected before opening.
- Form: 20 fields; required display name/email, optional contact-email validation. Multiline fields 19/20. Save stays visible above the keyboard. Protect dirty edits through explicit Close; test interactive dismissal separately.
- Wizard: fixed network-compatible wallet choices; connecting takes 1,500ms. Cancel invalidates the pending task. Back preserves selection; changing network clears wallet choice. Full dismissal resets on reopening.
- Retained stack: 3 actual presentations; earlier sheet content stays mounted. Top dismissal returns to predecessor, Cancel closes all. Native platforms may hide/scale the underlying sheet rather than displaying three exposed edges; state retention and correct restoration are required.
- List: 1,000 initial rows, 1,000-row pages, cap 50,000. Each page/refresh has 600ms mock latency. Refresh cancels an in-flight page and resets to 1,000 rows and offset zero. Close/reopen starts fresh. Fail-next-page is one-shot; Retry retains loaded rows.
- Light rows: 56 units tall, one label and a separator.
- Heavy rows: 164 units tall, nested labels/views, 20 chart bars and 20,000 deterministic arithmetic iterations per row render. This is a synthetic rendering workload, not a realistic asset-list benchmark.
- Baseline: no synthetic contention.
- JS-busy: press **Start JS-busy window** inside the root sheet. After 1s, perform 80ms of synchronous JS work every 250ms for 10s. Logs mark arming/start/end. Only interactions inside the active window belong to this diagnostic. Fixed 80ms/250ms is the target, not a promise that timers run exactly on schedule. Do not merge this diagnostic with baseline scores.

## Acceptance before timing

For every implementation/OS:

1. Confirmation: cancel, rapid double submission, pending swipe/backdrop/Back, success, failure, Retry, reopen reset.
2. Form: focus fields 1/10/20, type and change focus/keyboard types; verify input rectangle is above both keyboard and footer; Save remains touchable. Save invalid data preserves other fields and reveals the error. Hide keyboard and verify usable height. Dirty Close offers Keep editing/Discard. Test swipe/backdrop/Android Back independently.
3. Single wizard: choose Ethereum/MetaMask; Back; change to Solana; MetaMask must not carry over. Cancel Connecting before 1,500ms; no late success. Failure/Retry and success. Dismiss/reopen resets.
4. Stack: the same checks plus top-only swipe/backdrop/Back and explicit Cancel-all; earlier sheets restore with prior selection. Observe native stack lifecycle, not just the displayed title.
5. List, each row mode: half/full transitions, repeated flings, no lost gestures/blank viewport, automatic paging, failure/Retry, actual pull-to-refresh, refresh/page race, cap/end state, close/reopen reset. Jump-to-end is a setup aid, not a substitute for fling measurements.

For visual checks, collect screenshots or video of the focused input, footer and keyboard together. An accessibility element existing in a tree does not prove it is unobscured. Capture evidence at partial and full detents. Mark failure and unverified cells explicitly.

## Five measured runs

1. Record hardware/model, OS, build hash/configuration, package versions, display refresh rate, thermal/power state, profiler configuration and interaction flow revision. Keep device orientation fixed in portrait.
2. Run one unmeasured warm-up per library/workload. Separate cold mounting from warm reopening; do not mix them.
3. Use the same recorded semantic interaction flow for each candidate. Rotate order across rounds: E/G/T, G/T/E, T/E/G, E/T/G, T/G/E. These orders counter some order effects but do not provide statistical randomization guarantees.
4. Reset scenario state between measured runs; keep the same mock outcome and row mode. Do not change source or rebuild during a five-run batch.
5. Collect native frames/hitches and memory with iOS Instruments (`xctrace`) or Android Perfetto. Record taps in the trace where available. Compare the same measurement boundary and tool settings.
6. Report five individual values, median, min/max and any failures, not just the best run. No invented combined performance score. Five runs are diagnostic evidence, not a universal superiority claim.

### Metric boundaries

- **Presentation latency**: native input event to native presentation completion/first stable visible content, using an equivalent native boundary for all three. Expo Universal has no presentation-complete callback, so its content-layout callback is not interchangeable with TrueSheet `onDidPresent` or Gorhom settled-detent callback. Use a native trace/video method for an equal boundary, or leave this metric unmeasured.
- **Hitches**: native frame timing during equivalent drag, fling, keyboard and stack transitions. Define the hitch threshold relative to the device's frame budget and profiler metric; record both count and duration. JS requestAnimationFrame intervals are not UI FPS.
- **Memory**: native process memory at idle, after opening, and after 20 open/close cycles with identical content. Specify settled wait and metric (e.g. RSS/physical footprint/PSS); never compare different memory metrics across OS as equal. Growth alone is not proof of a leak.
- **JS-busy responsiveness**: classify which native gestures/animations continue and which JS actions stall; report observed completion/latency separately.

## In-app event log

After closing a sheet, **Copy last run JSON** copies a bounded, non-reactive event log. Save it next to the native trace before leaving the comparison route. It includes condition, outcome, row mode, OS/build, lifecycle callbacks, paging, keyboard events and mock outcomes. It is not persisted automatically.

All timestamps are **JS-observed**. Native callback delivery may be delayed under contention. `content-layout-not-presented` is deliberately named to avoid treating layout as completed presentation. These logs do not measure native frame rate, native memory, or equal cross-library presentation latency. Run them as annotation aids, not as an unqualified ranking.

## Recorded flows

See `.argent/flows/` for flows that were actually recorded and replayed. A saved smoke path is not the full acceptance matrix or the full benchmark workload. Consult `docs/comparison.md` for what was observed. Do not claim a flow or measurement passed merely because a plan/YAML exists.

```sh
bunx argent run flow-execute --name expo-confirmation-smoke \
  --project_root "$PWD" --device '<UDID or serial>' --json
```
