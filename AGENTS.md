# Repository Guidelines

## Project Structure & Module Organization

This Bun-based Expo SDK 57 / React Native app compares Expo UI, Gorhom v5, and TrueSheet stable v3 across seven shared scenarios. Prioritize mobile behavior and iOS/Android compatibility.

- `src/app/`: Expo Router routes, including `compare/[library].tsx` and `report.tsx`. Keep non-route code outside this directory.
- `src/lab/`: scenarios, sheet adapters, deterministic models, telemetry, and shared UI.
- `src/global.css`: Tailwind/Uniwind imports.
- `tests/`: Bun model tests; `scripts/`: backdrop capture, analysis, and Python detector tests.
- `docs/`: comparison, protocol, and evidence; `GLOSSARY.md`: vocabulary; `.argent/flows/`: device paths.
- `ios/`, `android/`, and `artifacts/`: generated/local, ignored outputs.

## Build, Test, and Development Commands

```sh
bun install                     # Install dependencies
bun run start                   # Start Metro
bun run ios                     # Build/run iOS development client
bun run android                 # Build/run Android development client
bun run build:ios:release       # Local iOS release build
bun run build:android:release   # Local Android release build
bun run lint                    # Expo ESLint flat configuration
bun run typecheck               # Strict TypeScript check
bun run test                    # Bun tests in tests/
```

Run lint and typecheck before declaring work complete; run model tests for behavior changes. EAS profiles in `eas.json` cover development, preview, simulator, and production.

## Coding Style & Naming Conventions

Follow existing two-space indentation, single quotes, and semicolons. Use TypeScript, PascalCase component filenames, camelCase functions, and `use`-prefixed hooks. Preserve stable `testID` values used by device flows. Keep workloads shared across adapters.

## Testing Guidelines

Use `bun:test` in `tests/*.test.js` for scenario rules and cancellation. No coverage threshold is configured. Verify native gestures, keyboard clearance, stacks, and backdrop transitions on devices. Python detector tests run with `python3 -m unittest discover -s scripts -p 'test_*.py'` (NumPy/Pillow required). Distinguish smoke evidence from full acceptance and performance measurements.

## Commit & Pull Request Guidelines

History contains only `Initial commit`; no message convention is established. Use concise imperative subjects. PRs should describe behavior, affected libraries/platforms, checks run, and relevant issues. Include screenshots or transition recordings for visible changes and disclose unverified cases.

## Configuration & Agent Instructions

Use `bunx expo install` for dependencies; configure native behavior in `app.json`, never generated projects. The complete matrix requires a custom build. Before changing Expo/React Native APIs, check installed versions and matching versioned Expo docs; consult Expo's `llms.txt` for other Expo topics. Use Context7 for library questions. Keep credentials and local captures out of commits.
