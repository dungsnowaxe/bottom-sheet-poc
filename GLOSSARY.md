# Bottom Sheet Comparison

A comparison of bottom sheet experiences for confirmation, editing, wallet selection, and large collections.

## Language

**Scenario**:
A user task with agreed behavior, exercised across the compared sheet approaches.
_Avoid_: Demo (when implying a complete scenario)

**Single-sheet wizard**:
A sequence of steps within one sheet, with earlier selections retained when returning to a previous step.

**Retained sheet stack**:
A sequence of sheets where earlier sheets remain available underneath the current sheet, retaining their selections and position.
_Avoid_: Replacement flow, single-sheet wizard

**Cancel flow**:
Abandoning the entire wallet-selection sequence, including any pending simulated connection.
_Avoid_: Back

**Back**:
Leaving the current wallet-selection step and returning to its predecessor without abandoning the whole sequence.

**Workload**:
A defined set of content and interactions used for a repeatable comparison.

**Baseline run**:
A measurement run without deliberately introduced JavaScript contention.

**JS-busy diagnostic**:
A separate responsiveness experiment with deliberately introduced JavaScript contention, not a normal-operation score.
