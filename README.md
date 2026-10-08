# Bottom Sheet Lab

A mobile-first Expo app comparing **Expo UI Universal BottomSheet**, **Gorhom**, and **TrueSheet stable v3** with shared React Native content on iOS and Android. All data and async operations are local and deterministic; no real removal or wallet connection occurs.

## Current stack

| Dependency | Installed version |
|---|---|
| Expo / React Native / React | 57.0.27 / 0.86.3 / 19.2.3 |
| Expo UI | 57.0.22 |
| Gorhom Bottom Sheet | 5.2.14 |
| TrueSheet (stable v3) | 3.11.18 |
| Legend List | 3.6.0 |

The project uses Bun, Expo Router, Reanimated, and Tailwind CSS/Uniwind. Exact dependencies are recorded in `package.json` and `bun.lock`.

## Scenarios

- **Confirmation:** async mock removal, pending dismissal protection, failure/retry.
- **Long form:** 20 fields, validation, dirty-edit protection, keyboard and fixed Save-footer clearance.
- **Single-sheet wizard:** network → compatible wallet → simulated connecting.
- **Retained sheet stack:** three actual sheet instances; Back restores selections, Cancel closes the flow.
- **Legend List stress:** light/heavy rows, 1,000-row pages up to 50,000, refresh and failure/retry.
- **Dimmed backdrop:** each implementation's normal dimming, outside tap, swipe dismissal, and reopening.
- **Blur backdrop:** a shared Expo BlurView overlay beneath the sheet, combined with the implementation's normal dimming. This does not compare native sheet blur APIs.

## Local development

Install Bun and the native tooling for your target: Xcode for local iOS builds, or the Android SDK and an emulator/device for Android.

```sh
bun install
bun run ios
# Or:
bun run android
```

These scripts generate native projects and build a development client. Use `bun run start` to restart Metro for an installed development client. The complete comparison **requires a development or release build** because TrueSheet includes native code unavailable in Expo Go.

```sh
bun run build:ios:release
bun run build:android:release
```

Release builds bundle JavaScript. See [the benchmark protocol](docs/benchmark-protocol.md) for explicit device selection and measurement setup. `eas.json` also provides `development`, `preview`, `simulator`, and `production` profiles; cloud builds require your own EAS account/project and signing setup.

Native configuration belongs in `app.json`; generated `ios/` and `android/` projects are ignored. The app identifier is `dev.snowaxe.bottomsheetpoc`, with URL scheme `sheetlab`.

## Using the lab

Choose a library and scenario, then select the mock outcome, row workload, and baseline/JS-busy condition where applicable. JS-busy mode exposes an explicit button inside the sheet; selecting the condition does not start contention automatically.

After dismissing the sheet, use **Copy last run JSON** to export JS-observed events for trace annotations. Logs remain in memory and are not saved automatically. They do not measure native FPS or memory.

Expo Universal's Android adapter cannot strictly prevent swipe dismissal while pending or dirty. Recovery is logged as a limitation. Other implemented behaviors still need the acceptance checks documented below; there is no measured performance winner.

## Validation and backdrop diagnostics

```sh
bun run lint
bun run typecheck
bun run test
```

The six Bun tests cover selection rules, form validation, paging, and canceled mock completion. Native gestures, keyboard geometry, and presentation behavior require device evidence.

`scripts/capture-backdrop-noise.mjs` captures Android video while replaying an Argent flow. `scripts/analyze-backdrop-video.py` produces JSON, CSV, and PNG reports from two opening/hold episodes. It requires FFmpeg/ffprobe, NumPy, and Pillow. Detector tests run separately:

```sh
python3 -m unittest discover -s scripts -p 'test_*.py'
python3 scripts/analyze-backdrop-video.py recording.mp4 --output artifacts/backdrop/report.json
```

Analysis flags review candidates and insufficient temporal coverage; it cannot certify that flicker is absent. Capture requires a running Android target, the installed app, adb, and configured Argent tooling.

## Repository and evidence

- `src/app/`: routes; `src/lab/`: scenarios, adapters, models, and telemetry.
- `tests/`: model tests; `scripts/`: backdrop diagnostics; `src/global.css`: style imports.
- [Comparison and verification status](docs/comparison.md): integration caveats and collected evidence.
- [Benchmark protocol](docs/benchmark-protocol.md): acceptance and five-run release measurements for the original five workload scenarios.
- [Recorded flows](.argent/flows/): smoke and diagnostic paths, including backdrop checks; these are not exhaustive acceptance certification.
- [Domain vocabulary](GLOSSARY.md) and [contributor guidelines](AGENTS.md).

Local screenshots, reports, and traces belong in ignored `artifacts/`. Performance conclusions require equivalent native traces and physical-device release runs.
