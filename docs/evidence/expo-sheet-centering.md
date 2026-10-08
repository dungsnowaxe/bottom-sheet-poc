# Expo auto-sheet centering verification

## Defect and fix

The reported Android confirmation sheet had a left-aligned RN host narrower than the native sheet. `ExpoSurface` used `width - 32` even though the native sheet was configured with `contentPadding={0}`. The shared RN header/body already add their own symmetric 20-point padding.

In `src/lab/SheetSurface.tsx`, auto-sized content now uses the numeric window width **without subtracting another inset**. A numeric width is retained because percentage sizing inside the intrinsic-size RN host did not produce a valid layout during verification. Scroll-sized content retains its existing flex layout.

## Argent verification

Verified on release builds installed on Medium_Phone / Android API 35 and iPhone 17 simulator / iOS 26.5:

1. Reproduced the idle confirmation through the UI and saved a full-resolution before screenshot.
2. Recorded `.argent/flows/expo-confirmation-layout.yaml`, which stops at the idle sheet with both actions present.
3. Rebuilt both release binaries, replayed the path and saved after screenshots and Argent `describe` trees.
4. Inspected both after screenshots for horizontal alignment, clipping and text wrapping.
5. Ran Argent `screenshot-diff` on each platform and inspected the context diff. Changes were localized to the widened actions, recentered labels and Android description wrapping: 0.77% changed pixels on Android, 0.62% on iOS. These are expected changes, not an unchanged-baseline regression pass.
6. Replayed the layout flow a second time without intervening rescue; both passed. Also replayed `expo-confirmation-smoke` and `expo-list-smoke` on both platforms; all passed.

### Observed button gutters

Approximate physical pixels derived from Argent's normalized button bounds, which are rounded to three decimals. Both Remove and Cancel have the same horizontal frame. iOS values include the native sheet's outer inset.

| Target / capture size | Before left / right | After left / right |
|---|---:|---:|
| Android, 1080 × 2400 | 53 / 136 px | 53 / 52 px |
| iOS, 1206 × 2622 | 82 / 174 px | 82 / 81 px |

The post-fix gutters are symmetric within the rounding precision of the discovery output. The screenshots confirm the actions are centered and content is not clipped.

## Local evidence

Under ignored `artifacts/`:

- `expo-confirmation-layout-android-before.png` / `expo-confirmation-layout-android-after.png`
- `expo-confirmation-layout-ios-before.png` / `expo-confirmation-layout-ios-after.png`
- `expo-confirmation-layout-{android,ios}-after-tree.json`
- `expo-centering-diff-{android,ios}.json` and corresponding diff directories
- `expo-layout-{android,ios}-after-replay.json` / `expo-layout-{android,ios}-second-replay.json`
- `expo-confirmation-{android,ios}-centered.json` / `expo-list-{android,ios}-centered.json`

This is verification of the reported alignment defect on these two targets, not exhaustive visual certification of every scenario/device. The flow's element checks alone do **not** assert centering; screenshots and frame measurements supply that evidence. No unreviewed visual baseline was committed.
