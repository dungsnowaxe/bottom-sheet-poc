# Recorded smoke and diagnostic flows

These are recorded/repaired device paths, not the full acceptance suite or a controlled five-run performance batch. Library/scenario code is shared; each library's list bootstrap selects that library through the UI.

| Flow | Latest iOS release replay | Latest Android release replay | Scope |
|---|---|---|---|
| `expo-confirmation-smoke` | Pass | Pass | Mock successful confirmation |
| `expo-confirmation-layout` | Two full passes | Two full passes | Stops at idle confirmation for screenshot/bounds inspection; does not automatically assert centering |
| `gorhom-stack-ios` | Pass | Pass | Retained selections through Connecting → Wallet → Network, then Cancel |
| `true-form-android` | Pass | Pass | Last-field typing, dirty Close, Discard |
| `expo-list-smoke` | Pass | Pass | Exactly 1,000 initial → Jump → 2,000 light rows |
| `gorhom-list-smoke` | Pass | Pass | Same list checks using integrated Legend List |
| `true-list-smoke` | Pass | Pass | Same list checks using native-host Legend List |

The `-ios` and `-android` names reflect the original recording target, not a platform restriction. These seven flows restart the app and can be replayed with an explicit target:

```sh
bunx argent run flow-execute --name expo-list-smoke \
  --project_root "$PWD" --device '<UDID or Android serial>' --json
```

Inspect `ok`, failure/error counts and individual steps; a CLI transport succeeding is not necessarily a test pass. Read readiness warnings, especially keyboard caret/spinner stillness warnings.

## Fragments

- `true-form-clearance`: Android-only structural value check, ending with the last input focused and keyboard visible. Requires the TrueSheet form comparison route, sheet dismissed, fresh next draft. First complete `true-form-android` to establish the closed comparison route, inspect it, then acknowledge the prerequisite. The verified Android screenshot demonstrates input/footer clearance; mere element visibility is not geometry proof.
- `expo-list-fling-diagnostic`: Expo light list already open at half height, 2,000 rows, near row 1001. One 300ms fling. Its exploratory native trace preceded the final paging fix; do not treat it as a final-build baseline or performance ranking.

Only after verifying a fragment's current prerequisite, use `--prerequisiteAcknowledged true`. Neither fragment is a standalone end-to-end test.

Evidence and unverified acceptance cases: `docs/comparison.md`. Native collection protocol: `docs/benchmark-protocol.md`. Generated JSON, screenshots and traces are local ignored `artifacts/` files; no visual baselines were certified or committed.
