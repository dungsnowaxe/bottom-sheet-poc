# Exploratory iOS list trace — not comparative evidence

## Setup

- Release build: Expo UI 57.0.22, Expo 57.0.27, RN 0.86.3, Legend List 3.6.0.
- Target: iPhone 17 simulator, iOS 26.5; **not a physical phone**.
- Native profiler attached explicitly to `bottomsheetpoc` (`dev.snowaxe.bottomsheetpoc`). Expo Go was also running on the simulator.
- Expo light-list sheet at half height, 2,000 rows after paging, near row 1001.
- One recorded 300ms finger fling from `(0.5, 0.88)` to `(0.5, 0.68)`, followed by a visible-header check. Flow: `.argent/flows/expo-list-fling-diagnostic.yaml`.
- Recorder/discovery activity and idle intervals were included. No equivalent Gorhom/TrueSheet run, warm-up/five-run sequence, thermal control, or physical-device replication was performed.
- This capture preceded the final mount-time paging guard. It is not evidence for the final binary's measured performance.

## Tool output

Instruments export succeeded using the `time-profile` CPU schema; no export errors were returned. Automated analysis reported three microhang intervals:

| Relative start | Reported duration |
|---|---:|
| 00:31.825 | 290ms |
| 00:38.652 | 385ms |
| 00:39.083 | 323ms |

The bounded report did not supply attributable CPU stacks, list-frame throughput or memory-over-cycles results. These intervals must **not** be presented as three list-caused hitches, zero CPU bottlenecks, a leak-free result, or proof that Expo is slower than another library. Gesture timestamps and profiler intervals have not been rigorously correlated, and simulator/recorder/host work is a confounder.

The raw trace is retained locally at `artifacts/expo-list-ios-exploratory.trace`; stop/export and analysis results are in `artifacts/expo-native-stop.json` and `artifacts/expo-native-analysis.json`. Artifacts are ignored and are not required to build the app.

## Next measurement

Repeat an identical scenario on the final release binary under the controlled protocol, with app/gesture signposts and stack attribution. Then collect the equivalent library/OS/row-mode matrix and physical-device five-run samples before drawing a performance conclusion. This trace only demonstrates that native collection is available on this simulator.
