# Bottom-sheet comparison

## Executive summary

This repository contains the runnable POC, shared workloads and a release measurement protocol. It does **not** establish a performance winner. Native sheet animation, JS-rendered content, keyboard layout and list virtualization are different workloads; a native implementation is not automatically faster for all of them.

**Provisional integration recommendation:** start with Gorhom for the complex shared-RN-content requirements in this project. Its integrated inputs, scrollables, footer and explicit modal-stack configuration offer the most directly controllable fit, at the cost of more adapter configuration. Evaluate stable TrueSheet v3 when native presentation is important and fixed scrollable detents are acceptable. Expo Universal is attractive for simple native-feeling sheets, but the missing Android swipe-lock surface prevents certifying strict pending/dirty dismissal protection in this POC.

These are integration/capability recommendations, **not measured performance rankings**. Complete physical-device acceptance and the benchmark protocol before choosing a production implementation.

## Pinned environment

| Item | Version / target |
|---|---|
| Expo / React Native / React | 57.0.27 / 0.86.3 / 19.2.3 |
| Expo UI | 57.0.22 |
| Gorhom | 5.2.14 |
| TrueSheet | **3.11.18, stable v3** |
| Legend List | 3.6.0 |
| iOS local target | iPhone 17 simulator, iOS 26.5 |
| Android local target | Medium_Phone emulator, sdk_gphone64_arm64, API 35 |
| Build mode for device checks | Release, bundled JS; not Expo Go |

Exact native dependency pins and SDK-compatible peers are in `package.json` and `bun.lock`. Both local release builds succeeded. The starter RN 0.86.0 was replaced with Expo's recommended 0.86.3 after Doctor flagged a Hermes regression. EAS profiles are supplied, but no cloud-build or store-submission success is claimed.

## Shared workload and intentional adapters

Every implementation uses the same scenario components, state transitions, mock data, row sizes, synthetic heavy-row expense and task delays. The wallet wizard never invokes a real wallet, and confirmation never removes real data.

| Library | Adapter-specific work | Integration caveats |
|---|---|---|
| Expo Universal | Controlled `isPresented`, `RNHostView`, measured width for auto content, iOS dismissal modifier, RN form/list content | Android rests at partial/full, not arbitrary corresponding heights. Universal exposes no presentation-complete callback. Android back/backdrop can be disabled, but swipe lock is not exposed. Dismiss/remount recovery is explicitly logged as recovery, not successful prevention. |
| Gorhom | Root Gesture Handler/safe-area/modal providers, Reanimated peers, modal refs, `stackBehavior="push"`, top-active Android Back handler, integrated footer, `BottomSheetTextInput` / `BottomSheetScrollView` | More explicit configuration and dependency surface. Legend List uses `useBottomSheetScrollableCreator()` as its `renderScrollComponent`; replacing it with FlatList would not satisfy this experiment. |
| TrueSheet v3 | Native dev/release build, present/dismiss refs and promise handling, native header/footer, scrollable mode, keyboard scroll offset | Scrollable content uses fixed `[0.5, 1]` detents; do not combine v3 scrollables with auto sizing. Native scroll discovery depends on hierarchy. All APIs in this POC are from installed stable v3, not current beta documentation. |

Form inputs remain RN inputs except Gorhom's integrated RN-compatible input. The shared focus-clearance measurement checks viewport, focused input and fixed footer after layout/keyboard/scroll changes. Native keyboard avoidance alone did not keep TrueSheet's last multiline input above its footer on Android; the explicit measurement correction fixed that inspected state.

List paging ignores mount-time/transient native-host geometry. The end-reached callback is subscribed only after a real scroll gesture or the shared Jump-to-end action, rather than consuming Legend List's reached-edge gate with a mount-time no-op. Jump uses the list's `scrollToEnd()` API. Refresh clears the interaction gate and returns to the initial page.

## Capability and verification matrix

**Implemented** means the code exists, not that every acceptance check passed. **Smoke** means the named path was exercised, not exhaustive acceptance. **Open** requires further device evidence. The retained-stack scenario creates three real sheet instances; no sequential replacement fallback is used.

| Scenario | Expo Universal | Gorhom | TrueSheet stable v3 |
|---|---|---|---|
| Async confirmation | Implemented; success smoke on both OS. **Android strict swipe protection unsupported by Universal surface.** | Implemented; pending lock configured; full dismissal/failure/duplicate-submit acceptance open. | Implemented; pending lock configured; full dismissal/failure/duplicate-submit acceptance open. |
| 20-field form | Implemented; full keyboard/validation acceptance open. Android dirty swipe lock has the same limitation. | Implemented with integrated input/scroll/footer; full focus/validation/dismissal acceptance open. | Last-field typing and dirty-close/discard smoke on both OS. Android last multiline input/footer geometry was inspected and corrected; remaining field/keyboard-type acceptance open. |
| Single-sheet wizard | Implemented; full acceptance open. | Implemented; full acceptance open. | Implemented; full acceptance open. |
| Retained stacked wizard | Three-instance implementation; native retention, top-only dismissal and underlying scroll-state acceptance open. | Connecting → Wallet with MetaMask retained → Network with Ethereum retained → Cancel smoke passed on both OS. Swipe/backdrop and all selection combinations remain open. | Three-instance implementation; native retention/top-only-dismissal/scroll-state acceptance open. |
| Legend List stress | Light-list initial 1,000 → Jump-to-end → 2,000 smoke passed on both OS. Full heavy/50k/failure/refresh/detent acceptance open. | Integrated Legend List initial 1,000 → 2,000 smoke passed on both OS. Full heavy/50k/failure/refresh/detent acceptance open. | Native-host Legend List initial 1,000 → 2,000 smoke passed on both OS. Full heavy/50k/failure/refresh/detent acceptance open. |

No scenario has yet earned exhaustive cross-platform acceptance. For blocking production requirements, an open check must not be interpreted as a pass. In particular, Expo Android's recovery behavior does not meet the requirement to prevent dismissal while pending or dirty.

## Evidence collected

Local generated evidence is under ignored `artifacts/`; repeatable smoke paths are under `.argent/flows/`. Evidence records are not replacements for a complete acceptance suite.

- Expo confirmation success smoke replay on iOS and Android.
- Follow-up visual verification fixed Expo auto-sheet's asymmetric content width. Argent screenshots, button bounds and before/after diffs confirmed centering on Android and iOS; [centering evidence](evidence/expo-sheet-centering.md). The original element-only smoke checks had missed this defect.
- Gorhom retained-stack replay on iOS and Android with prior selections visibly preserved during Back navigation.
- TrueSheet form replay on iOS and Android; Android post-fix last-input clearance captured while keyboard and Save were both visible.
- All three light-list smoke flows replayed on both OS, asserting exactly 1,000 initial rows and 2,000 after one Jump-to-end action. These do not certify normal repeated flings, heavy rows, refresh, failure/retry or the 50k cap on native devices.
- Before/after Android form screenshots were compared: **5.73% pixel mismatch**. This indicates intended layout/content change, **not** a regression-test pass. Typed text, caret and status bar differ; visual inspection and the input/footer geometry support the clearance finding.
- One exploratory iOS Instruments capture for Expo's light list. See [the diagnostic evidence note](evidence/expo-list-ios-exploratory.md). It is not an equivalent three-library benchmark and cannot support a winner or causal hotspot conclusion.
- Lint, TypeScript and six model tests pass. Model tests cover network/wallet state, validation, deterministic row IDs/cap and canceled mock completion. They do not simulate native sheet acceptance.
- Expo Doctor passed 21/21 after alignment of SDK dependencies and Router peers.

### Performance results: not established

| Required metric | Current status |
|---|---|
| Comparable opening/closing native latency | Not collected. Expo content-layout callbacks are not presentation completion. |
| Scroll hitches / native frame evidence by library, OS and row mode | Only one exploratory iOS trace; controlled matrix outstanding. |
| Memory over repeated open/close cycles | Not collected; no leak-free claim. |
| Five-run median/range after warm-up, rotating library order | Outstanding. |
| Baseline vs controlled JS-busy diagnostics | Diagnostic controls implemented; equivalent controlled measurements outstanding. |
| Physical iOS and Android release validation | No physical phone measurements collected. |

The bounded, non-reactive in-app event log records JS-observed milestones and cancellations. It can annotate a native trace but is neither FPS nor native memory, and differing library callback semantics must not be compared as equal presentation latency.

## Scenario-specific guidance

- **Strict pending confirmation / dirty form:** Gorhom or TrueSheet are better candidates for certification. Do not select Expo Universal Android for a requirement that depends on a swipe lock its public surface does not expose.
- **Long RN forms:** begin with Gorhom's integrated input/scroll/footer path; retain measured input/footer clearance checks. TrueSheet's native keyboard handling still required explicit clearance for the tested multiline/footer case.
- **Single-sheet wizard:** all three have a shared-content implementation; choose after native acceptance rather than architecture claims.
- **Retained stacked wizard:** Gorhom currently has the strongest local evidence in this POC. Expo/TrueSheet candidates need equivalent retained-state and top-only-dismissal evidence, including gestures and Android Back.
- **Large Legend Lists:** do not choose a winner yet. Validate the integration and collect separate light/heavy, partial/full and baseline/JS-busy release measurements. A native sheet cannot eliminate the shared heavy-row JS work.

## Remaining work before a final selection

1. Complete all acceptance checks in [the benchmark protocol](benchmark-protocol.md), including failure/retry, canceled late completions, dirty-dismiss routes and both detents.
2. Preserve acceptance-driven regression flows with two consecutive full passes; current files are smoke/diagnostic paths, not a certified full 15-combination suite.
3. Run controlled release measurements on identified physical iOS and Android phones, recording OS/hardware/thermal state and exact build revision. Warm up, then collect five runs per workload with rotating library order.
4. Collect attributable native hitch evidence and memory across repeated open/close cycles. Investigate the exploratory trace only after reproducing under controlled conditions.
5. Update this report with actual medians/ranges, unsupported capabilities and scenario-specific recommendations. Never fill gaps with theoretical architecture scores.

## Source references

- [Expo SDK 57 Universal BottomSheet](https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/bottomsheet/)
- [Expo SDK 57 RNHostView](https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/rnhostview/)
- [Gorhom v5](https://gorhom.dev/react-native-bottom-sheet/)
- [Gorhom third-party scroll integration](https://gorhom.dev/react-native-bottom-sheet/third-party-scrollable)
- [TrueSheet repository](https://github.com/lodev09/react-native-true-sheet) — installed `3.11.18` types/source were used to avoid v4 API drift.
- [Legend List](https://github.com/LegendApp/legend-list) — installed v3.6.0 types/source were checked for scroll callback ordering.
