- Verified custom Generation IV singles 6-to-3 rules.
- Completed automated 3v3 battle.
- Verified forced switching and weather effects.
- Added local battle log output.

## Simulation framework
- Separated simulation and decision logic.
- Implemented 120 ordered team selections.
- Implemented random battle agent.
- Added voluntary switching.
- Added structured decision logs.
- Fixed duplicate stream cleanup error.
- Completed 100 battles without errors.
- Measured 139.4 battles per second.
- Verified seeded battle reproducibility.

## Player observation
- Added player-specific observation interface.
- Corrected HP reporting configuration.
- Fixed draw detection.
- Passed HP privacy and reproducibility tests.
- Passed 1000-battle stress test.

## Strategic AI v0.1
- Added structured battle state.
- Added Gen 4 damage and speed prediction.
- Added damage-based strategic decisions.
- Completed 4000-battle benchmark.
- Achieved 89.9% win rate against RandomAgent.
- Preserved v0.1 baseline and benchmark results.

## Strategic AI v0.2
- Added exact own Pokemon stat reconstruction.
- Added incoming damage and action order evaluation.
- Added pre-action knockout risk scoring.
- Completed 6000-battle benchmark without errors.
- Achieved 50.65% win rate against v0.1.
- Achieved 90.65% win rate against RandomAgent.
- Preserved v0.2 benchmark results.

## Strategic AI v0.3

- Added switch safety and entry hazard evaluation.
- Added offensive matchup evaluation.
- Added integrated switch value evaluation.
- Added strategic forced replacement.
- Tested 13,200 battles across switch policies.
- Selected forced replacement optimization as default.
- Preserved experimental voluntary switching.


## Strategic AI v0.4 - Two-turn search milestone

Implemented:
- Board value evaluation and partial-information board state.
- Probabilistic attack and switch prediction.
- Adaptive two-turn action search.
- Unknown enemy attack candidate estimation.
- Entry hazard normalization.
- Strategic voluntary switching.

Initial integration:
- 20 battles, 8 wins, 12 losses.
- 207444 search evaluations.
- Average decision time: 76.21 ms.
- Zero errors, fallbacks or turn limits.

Switch optimization:
- 700 training battles across seven variants.
- 1000 independent validation battles across five variants.
- Model E selected provisionally.
- Switch penalty: 0.30.
- Consecutive switch penalty: 0.50.
- Validation: 118 wins, 81 losses, 1 draw.
- Validation score: 59.25%.
- Baseline validation score: 52.50%.
- No-switch validation score: 52.75%.
- Model E consecutive switches: 0.
- Model E validation switch rate: 17.40%.

Reproducibility:
- Original v0.4 preserved as strategic_agent_v04_baseline.js.
- Optimization and validation scripts reference the frozen baseline.
- Aggregate benchmark results saved under benchmarks.

Limitations:
- Fixed test teams only.
- Enemy configuration uses a single estimated build.
- Enemy move probabilities are heuristic.
- Opponent switching and status moves are not modeled.
- No autonomous learning yet.
- Statistical significance has not been established.

Next:
- Improve enemy build and move estimation.
- Optimize risk weight and search discount.
- Validate across diverse team compositions.
- Complete v0.4 final benchmark.


## Enemy inference engine - Steps 57-85

- Added probabilistic enemy builds and ability candidates.
- Added move-order and damage-based inference.
- Added live evidence extraction and persistent enemy beliefs.
- Added HP display inversion and defensive inference.
- Added realistic-team validation and paired benchmarks.
- Fixed outgoing damage statistics aggregation.
- Completed 200 battles with zero processing errors.
- Improved paired realistic-team MAE by 69.77%.
- Prepared multi-build strategic integration for v0.5.

## Strategic AI v0.5 optimized

### Added
- Posterior build selection and live build refresh.
- Multi-build strategic agent v0.5.
- Exact calculation cache.
- HP dependency analysis and normalized damage cache.
- Lightweight cache implementation.
- Optimized attack-turn evaluation.
- Intermediate and optimized agent variants.
- Unit tests, integration tests and benchmark snapshots.

### Fixed
- Floating-point HP percentage precision in posterior refresh.

### Performance
- Original normal execution: 73.456s / 20 battles.
- Optimized execution: 34.847s / 20 battles.
- Approximately 2.108x speedup.
- Exact equivalence confirmed for tested decisions and scores.

### Remaining
- Parallel simulation.
- Larger strength benchmarks.
- Status moves and setup strategy.
- Strategic team selection.
- Opponent action prediction.
- Self-play learning.



## STEP 116-135: Parallel simulation and isolated Pokemon knowledge

### Completed

- Parallel battle execution using worker threads.
- Default worker count: 8.
- Generic battle task and agent factory.
- Persistent JSONL battle results.
- Batch interruption and resume.
- Result integrity and duplicate protection.
- Battle statistics analysis.
- SQLite Pokemon knowledge database.
- Read-only research query interface.
- Knowledge quality and evidence management.
- Manual approval and revocation.
- Knowledge audit history.
- Optional chat gateway, disabled by default.

### Verified results

- Strategic batch: 100 battles.
- V05: 53 wins.
- V04: 47 wins.
- Draws: 0.
- Search and inference errors: 0.
- Fallbacks: 0.
- Limited battles: 0.
- Batch execution: approximately 45.4 seconds.
- Peak RSS: approximately 2134 MB.
- Initial knowledge database: 73728 bytes.
- Production approved claims: 0.
- Production chat gateway: OFF.

### Isolation policy

- Pokemon knowledge must remain independent of Project U.I.
- Never automatically copy Pokemon research into ui_memory.db.
- Research queries are not approved chat knowledge.
- Knowledge states: research, review, approved, revoked.
- Only manually approved claims may pass the chat gateway.
- Revoked claims cannot be retrieved through the gateway.
- The gateway defaults to OFF after process restart.
- Disabled gateway does not open the knowledge database.
- Database failures return no knowledge.
- Main Project U.I. integration remains deferred.

### Known limitations

- Manual approval actor is not authenticated.
- Knowledge correctness is not automatically verified.
- Gateway disconnection cannot erase previously retrieved data.
- Main chat memory-write restrictions are not yet enforced.
- Full battle task definitions are not persisted in the manifest.
- Engine version is supplied by the caller.
- Stale batch locks may require manual recovery.
- Enemy statistics describe decisions, not Pokemon win rates.
- The 100-battle result does not establish V05 superiority.
- Self-learning and team optimization remain unimplemented.

### Next development

1. Resume strategic AI development independently.
2. Improve status moves, setup moves and board control.
3. Develop strategic AI V06.
4. Benchmark against previous AI versions.
5. Improve team selection and opponent prediction.
6. Implement self-play learning and team optimization.
7. Integrate with Project U.I. only after explicit approval.



## STEP 137-163: Strategic AI v0.6 foundations

### Development status

- Strategic AI v0.5 remains the stable baseline.
- v0.6 foundation modules have been implemented separately.
- No v0.6 agent has been connected to the production simulator.
- All 17 v0.6 foundation test scripts passed.
- These results establish unit-level correctness only.
- Competitive strength improvement has not yet been measured.

### Implemented modules

#### Board evaluation and setup

- boost_value.js
- board_value_v06.js
- status_move_effects.js

Features:

- Gen IV stat stage multipliers and stage limits.
- HP-adjusted boost valuation.
- Physical and special attack profile adjustment.
- Calm Mind, Swords Dance, Dragon Dance.
- Nasty Plot, Bulk Up, Agility and non-Ghost Curse.
- Standard immediate recovery moves.
- Provisional board evaluation coefficients.
- Roost timing effects remain unsupported.

#### Turn prediction and status mechanics

- turn_prediction_v06.js
- status_residual.js
- status_action.js
- sleep_prediction.js
- status_action_v06.js
- status_switch_v06.js
- status_infliction.js
- turn_prediction_v06_integrated.js
- end_turn_v06.js
- turn_prediction_v06_full.js

Features:

- Probability-based action order and damage outcomes.
- Damage recalculation after stat changes.
- Recovery before or after incoming damage.
- Paralysis, freeze and sleep action probabilities.
- Normal sleep, Rest sleep duration and Early Bird.
- Gen IV Magic Guard paralysis behavior.
- Burn, poison and escalating toxic damage.
- Toxic counter reset on switching.
- Status infliction and basic immunity checks.
- Weather damage and weather-related abilities.
- Leftovers, Black Sludge and status orbs.
- Lum Berry and Chesto Berry.
- Shed Skin probability branches.
- Weather suppression.
- Corrected toxic rounding in end_turn_v06.js.

#### Field control and hazards

- field_control_v06.js
- hazard_value_v06.js
- hazard_removal_v06.js

Features:

- Stealth Rock, Spikes and Toxic Spikes.
- Hazard layer limits.
- Haze stat stage reset.
- Reserve Pokemon hazard pressure evaluation.
- Rapid Spin hazard removal.
- Grounded Poison Pokemon Toxic Spikes absorption.
- Provisional future entry probability of 0.7.

#### Move restrictions

- move_restriction_v06.js

Features:

- Gen IV Taunt duration branches: 3-5 turns.
- Gen IV Encore duration branches: 4-8 turns.
- Status move restriction.
- Encore move override.
- Last move and PP validation.
- Restriction expiration and switch reset.
- Oblivious does not prevent Taunt in Gen IV.
- Mental Herb does not cure Taunt or Encore in Gen IV.

#### Screens

- screen_control_v06.js

Features:

- Reflect and Light Screen.
- Standard duration of 5 turns.
- Light Clay duration of 8 turns.
- Item suppression and Klutz handling.
- Physical and special damage separation.
- Critical and fixed damage bypass.
- Screen expiration and removal.
- Damage calculator field adapter.

#### Switching and forced switching

- switch_control_v06.js

Features:

- Shared switch-out and switch-entry prediction.
- Roar and Whirlwind priority of -6.
- Uniform probability branches over eligible reserves.
- Stat stage and move restriction reset.
- Toxic counter reset.
- Natural Cure on switching out.
- Entry hazard damage and Toxic Spikes absorption.
- Entry status and immediate berry consumption.
- Suction Cups, Soundproof and Ingrain checks.
- Basic Mold Breaker interaction.
- Entry KO detection and pending action cancellation flag.

### Known limitations

- Individual mechanics are not yet fully integrated.
- Existing hazard evaluation requires Gen IV parity review.
- Magic Guard Toxic Spikes immunity needs correction.
- Toxic rounding differs between the legacy residual module
  and the corrected end-turn module.
- Exact inter-Pokemon residual event order is not implemented.
- Weather and screen duration tracking require integration.
- Accuracy and evasion stage effects remain incomplete.
- Critical hits and secondary attack effects remain incomplete.
- Confusion and several other volatile effects remain unsupported.
- PP consumption and Struggle transitions remain incomplete.
- Encore and Taunt interaction requires engine parity testing.
- Entry abilities such as Intimidate and Sand Stream
  are not implemented in the shared switch predictor.
- Entry KO replacement chains are not implemented.
- Brick Break screen removal timing is not integrated.
- Rapid Spin substitute and other special cases need review.
- Hazard entry order and absorption require engine validation.
- Opponent reserve information must remain observation-safe.
- Move legality and complete Battle Revolution rule parity
  are not yet established.
- Evaluation weights are provisional.
- No self-learning or knowledge approval is performed.

### Next development phase

1. Integrate field control into the v0.6 turn predictor.
2. Integrate move restrictions and screen timing.
3. Integrate voluntary and forced switching.
4. Correct identified Gen IV mechanics discrepancies.
5. Implement whole-team board evaluation.
6. Implement multi-action and two-turn prediction.
7. Connect a separate StrategicAgent v0.6.
8. Validate against Pokemon Showdown Gen IV engine.
9. Benchmark against frozen StrategicAgent v0.5.
10. Optimize performance and validate on held-out teams.

### Isolation policy

- Preserve v0.5 as a rollback baseline.
- Do not modify the main Project U.I. application.
- Do not modify the main conversation memory database.
- Keep Pokemon research data and approved knowledge separate.
- Pokemon chat gateway remains disabled by default.
- Do not commit local databases, logs or temporary backups.
- Do not approve knowledge automatically.

