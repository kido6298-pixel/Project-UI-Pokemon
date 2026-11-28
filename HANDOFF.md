
## Singles 6-to-3 verification
- Custom Generation IV rules verified.
- Six Pokemon registered per player.
- Three Pokemon selected per player.
- Level 50 battle completed successfully.
- Forced switching, weather and abilities verified.
- Local battle log saved.
- Selection and move decisions are currently fixed.
- Full Battle Revolution compatibility remains unverified.

## Next development
- Separate simulator and decision logic.
- Implement legal action enumeration.
- Implement voluntary switching.
- Implement random and rule-based battle agents.
- Implement batch simulation and statistical analysis.

## Simulation framework
- src/actions.js: Generates candidate battle actions.
- src/agents/random_agent.js: Random decision agent.
- src/simulator.js: Independent battle simulation interface.
- src/test_teams.js: Temporary test teams.
- src/random.js: Seeded random number generator.

## Verified tests
- tests/battle_test.js
- tests/rules_test.js
- tests/battle_63_test.js
- tests/actions_test.js
- tests/simulator_test.js
- tests/batch_test.js
- tests/reproducibility_test.js

## Benchmark
- Battles: 100
- Completed: 100
- Errors: 0
- Elapsed: 0.717 seconds
- Speed: 139.4 battles/second
- Average turns: 16.38
- Average decisions: 38.34
- Turn limit reached: 0

## Reproducibility
- Battle engine seed and agent seeds are independent.
- Battle result, decisions and normalized battle logs matched.
- Timestamp lines are excluded from comparison.

## Known limitations
- Random agents have no strategic intelligence.
- Test teams are not competitively optimized.
- Action legality is not exhaustively verified.
- Hidden opponent information is not yet modeled.
- Full Battle Revolution compatibility is unverified.
- Turn limit and timeout paths require additional testing.
- Learning databases are not implemented.
- No integration with existing Project U.I.

## Next implementation
1. Structured player-visible battle state.
2. Opponent information tracking.
3. Generation IV damage prediction.
4. Rule-based strategic agent.
5. Seeded comparative evaluation.
6. Team selection and construction optimization.
7. Experience database and strategy improvement.

## Player-visible information and stability
- Added agent.observe() for player-specific battle events.
- Configured opponent HP percentage reporting.
- Preserved exact HP for the player's own Pokemon.
- Fixed bare tie event recognition.
- Added diagnostic logs for missing battle results.
- Passed 1000 seeded battles with zero errors.
- Benchmark: 187.6 battles/second.
- Next: implement structured battle state.
- Full hidden-information isolation and Battle Revolution fidelity remain unverified.

## Strategic AI v0.1 milestone
- Implemented player-visible battle state tracking.
- Added stat boosts, entry hazards, screens and field effects.
- Added Gen 4 damage prediction using @smogon/calc.
- Added defensive scenario evaluation.
- Added basic speed and move priority prediction.
- Implemented damage-based strategic agent.
- Preserved v0.1 as a baseline agent.

### Benchmark
- Total battles: 4000
- Strategic vs Random: 2000
- Strategic wins: 1798
- Strategic losses: 200
- Draws: 2
- Strategic win rate: 89.9%
- Team 1 improvement: +42.7 percentage points
- Team 2 improvement: +37.8 percentage points
- Errors: 0
- Turn limit results: 0
- Move evaluations: 70661
- Fallbacks: 0
- Benchmark file: benchmarks/strategic_v01.json

### Next
- Verify exact stat reconstruction.
- Verify damage predictions against simulator outcomes.
- Implement incoming damage and action order evaluation.
- Compare v0.2 against the frozen v0.1 baseline.

### Limitations
- Random team selection and forced switches.
- No strategic voluntary switching.
- No strategic status move evaluation.
- Opponent sets are hypothetical.
- Speed prediction is not yet integrated into decisions.
- Full Gen 4 mechanics and information isolation remain unverified.
- Benchmark uses only two test teams.

## Strategic AI v0.2 milestone

### Completed
- Exact stat reconstruction module.
- Stat reconstruction test: 5832 values, zero errors.
- Live stat verification: 22792 values, zero errors.
- Damaged Pokemon HP verification: 2378 checks.
- Incoming damage prediction.
- Speed and move priority integration.
- Pre-action knockout risk evaluation.
- Strategic AI v0.2 implementation.

### Benchmark
- Total battles: 6000
- Errors: 0
- Turn limits: 0
- V0.2 vs V0.1 wins: 1013
- Losses: 971
- Draws: 16
- Win rate: 50.65%
- Score rate: 51.05%
- V0.2 vs Random: 90.65%
- V0.1 vs Random: 89.90%
- Team 1 improvement: +0.3 percentage points
- Team 2 improvement: +1.4 percentage points
- Threat evaluations: 366850
- Risk decisions: 5590
- Fallbacks: 0
- Total runtime: 47.35 seconds

### Limitations
- Improvement is small and not statistically established.
- Opponent move prediction is limited to revealed moves.
- Opponent offensive scenarios are heuristic.
- No strategic voluntary switching.
- Forced switches and team selection remain random.
- Full Gen 4 damage accuracy remains unverified.
- Only two test teams have been benchmarked.

### Next: Strategic AI v0.3
- Evaluate incoming damage after switching.
- Evaluate defensive type compatibility.
- Evaluate entry hazards.
- Evaluate offensive pressure after switching.
- Improve forced switch decisions.
- Prevent unnecessary switching loops.
- Benchmark against frozen v0.1 and v0.2 agents.

## Strategic AI v0.3

Completed:
- Switch-in damage evaluation
- Generation 4 entry hazard evaluation
- Offensive matchup and speed evaluation
- Integrated switch value evaluation
- Strategic forced replacement
- Experimental voluntary switching
- Basic consecutive-switch suppression

Benchmark:
- Optimization: 5,200 battles
- Validation: 8,000 battles
- Total: 13,200 battles
- Turn-limit terminations: 0

Validation results against v0.2:
- Forced replacement only: 52.775% score
- Conservative switching A: 52.40%
- Conservative switching B: 52.35%
- Initial v0.3: 50.25%

Adopted policy:
- Keep v0.2 attack selection.
- Optimize forced replacement.
- Disable voluntary switching by default.
- Preserve experimental switching implementation.

Limitations:
- Fixed test teams only.
- General strength improvement is not established.
- Unknown enemy moves are not predicted.
- Switch-in abilities are not fully modeled.
- Multi-turn search is not implemented.
- Evaluation weights are heuristic, not learned.
- Entry hazard integration requires live battle verification.
- Voluntary switching requires a better evaluation model.

Next:
- Improve battle evaluation and material preservation.
- Implement multi-turn action comparison.
- Reintroduce strategic voluntary switching.
- Add status and setup move evaluation.
- Expand benchmark team diversity.
- Implement strategic team selection.
- Develop self-play learning.


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

### Completed
- Probabilistic enemy build generation.
- Multiple ability candidates.
- Enemy build selection and multi-build prediction.
- Bayesian-style updates from move order and received damage.
- Persistent per-Pokemon evidence and probability reconstruction.
- Live battle evidence extraction.
- Historical battle context capture.
- Life Orb observation and synchronization.
- Realistic test team generation.
- Exact HP display inversion.
- Defensive inference from outgoing damage.
- Integrated offensive, defensive and speed inference.
- Paired accuracy comparison and statistics validation.

### Validation
- 200 seeded battles completed.
- 2546 received damage observations.
- 2546 outgoing damage observations.
- 714 move order observations.
- Zero processing errors and battle limits.
- 80600 HP round-trip checks passed.

### Paired accuracy
Original test teams:
- 497 matched Pokemon records.
- MAE: 9.759 -> 4.988.
- Improvement: 48.89%.

Realistic test teams:
- 491 matched Pokemon records.
- MAE: 6.445 -> 1.949.
- Improvement: 69.77%.
- Improved: 437.
- Unchanged: 47.
- Worsened: 7.
- All 12 tested species improved on average.

### Remaining limitations
- Fixed teams do not establish generalization.
- Candidate EV spreads and unknown items remain incomplete.
- Ability priors are heuristic.
- Historical item consumption and ability changes remain incomplete.
- Critical hits, lethal damage and complex moves are excluded.
- Contradictions and inference runtime require further improvement.
- Current HP must be refreshed before strategic evaluation.
- Confidence calibration remains unverified.

### Next phase
Strategic AI v0.5:
1. Select representative builds from posterior probabilities.
2. Connect live inference to strategic decisions.
3. Evaluate actions across multiple possible enemy builds.
4. Preserve uncertainty and avoid excessive computation.
5. Benchmark against v0.4 using identical seeds.
6. Validate on additional teams.

The existing strategic AI v0.4 remains unchanged.
The original Project U.I. application and UserData remain untouched.

## Strategic AI v0.5 - STEP 88-113

### Current recommended agent

- src/agents/strategic_agent_v05_optimized.js
- Export: StrategicAgentV05Optimized
- Original and intermediate agents are retained for comparison.

### Enemy build inference integration

- Posterior build selection using probability and coverage.
- Maximum selected builds: 5.
- Target probability coverage: 0.95.
- Selected probabilities are renormalized.
- Current HP reconstructed from displayed HP percentage.
- Current status, boosts, known item and ability refreshed.
- Prior build estimation used when evidence is unavailable.
- Multiple enemy builds evaluated through adaptive two-turn search.
- Build risk weight: 0.25.
- Action risk weight: 0.5.
- Second-turn discount: 0.85.
- Switching penalties inherited from optimized v0.4.

### Performance optimization

1. Exact calculation caching.
2. HP-independent damage cache normalization.
3. Lightweight cloning for damage results.
4. Fast attack-turn outcome aggregation.

Important modules:

- calculation_cache.js
- cached_calculations.js
- hp_dependencies.js
- hp_cached_calculations.js
- fast_calculation_cache.js
- fast_hp_cached_calculations.js
- attack_turn_fast.js
- attack_prediction_fast.js
- adaptive_prediction_fast.js
- multi_build_prediction_fast.js

### Integration benchmark

Same 20 seeded battles against Strategic AI v0.4.

- Wins: 11
- Losses: 8
- Draws: 1
- Search decisions: 190
- Posterior uses: 142
- Prior uses: 48
- Selected builds: 661
- Average builds: 3.478947
- Average probability coverage: 82.6601%
- Search evaluations: 950938
- Voluntary search switches: 42
- Search errors: 0
- Inference errors: 0
- Fallbacks: 0
- Turn-limited battles: 0

Normal execution times:

- Original v0.5: 73.456 seconds
- Basic cache: 50.769 seconds
- HP-independent cache: 43.274 seconds
- Lightweight cache: 37.360 seconds
- Optimized integration: 34.847 seconds

Optimized version:

- Approximately 2.108x faster than original normal execution.
- Approximately 52.56% reduction in total runtime.
- Approximately 1.742 seconds per battle.
- Damage cache hit rate: 86.0579%.
- Speed cache hit rate: 98.8521%.
- No cache evictions in the integration benchmark.

### Exact equivalence verification

- Battles: 20
- Decision checks: 190
- Candidate checks: 680
- Build checks: 661
- Mismatches: 0

The equivalence report uses a profiled original run of
74.047 seconds and reports 2.125x speedup.
Normal execution comparison is approximately 2.108x.

### Unit verification

- HP independence: 63468 checks.
- HP cache equality: 93972 checks.
- Lightweight cache equality: 6000 checks.
- Lightweight cache microbenchmark: 5.994x.
- Attack-turn equality: 10000 cases.
- Attack-turn outcomes: 57096 checks.
- Attack-turn microbenchmark: 1.537x.
- Mutation protection and LRU behavior verified.

### Known limitations

- Integration equivalence covers only the tested teams and seeds.
- Competitive strength requires larger independent benchmarks.
- Posterior build probabilities may remain stale after newly
  revealed items or abilities until additional evidence is processed.
- Enemy HP uses a midpoint estimate.
- Consumed items and unknown items require better distinction.
- Candidate builds and move hypotheses are incomplete.
- Second-turn search can be optimistic across hidden builds.
- Status moves, setup moves and complex damage mechanics are incomplete.
- Team preview selection is not yet strategic.
- Full Battle Revolution rule compatibility is not verified.
- Parallel simulation and self-learning are not implemented.
- Some comparison tests require locally generated logs.

### Next development steps

1. Deterministic parallel battle simulation using worker_threads.
2. Compare sequential and parallel battle results.
3. Benchmark worker counts and memory consumption.
4. Expand v0.5 strength validation.
5. Implement v0.6 status moves, setup and board control.
6. Implement v0.7 team selection and selection pressure.
7. Implement v0.8 opponent action prediction.
8. Develop comprehensive strategic AI and self-play learning.
9. Integrate with Project U.I. after independent validation.



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



## STEP 164-184: Strategic AI v0.6 switch mechanics checkpoint (2026-11-28)

### Completed
- Field and hazard prediction integration.
- Reflect, Light Screen, Brick Break and Rapid Spin.
- Taunt, Encore and move restrictions.
- Party state and reserve management.
- Voluntary and forced switching.
- Fainted Pokemon replacement.
- Entry hazards and Toxic Spikes correction.
- Entry abilities and weather activation.
- Intimidate, Download and Trace handling.
- Entry ability ordering and speed ties.
- Weather suppression and effective weather.
- Resolved ability damage calculation.
- Pursuit interception before switching.
- Selected replacement preservation after Pursuit KO.
- Pursuit integration with entry abilities and hazards.
- Gen 4 Pursuit interception eligibility correction.
- Paralysis bypass during Pursuit interception.
- Sleep and freeze interception exclusion.
- Truant interception eligibility check.
- Pursuit interception accuracy correction.

### Latest implementation entry point
- src/turn_prediction_v06_pursuit_corrected.js
- src/turn_prediction_v06_pursuit_corrected_base.js
- src/pursuit_interception_v06_corrected.js
- src/pursuit_switch_v06_corrected.js
- src/pursuit_eligibility_v06.js

Earlier implementations are retained for regression comparison.

### Validation
- STEP 183-A: PASS.
- STEP 183-E: PASS.
- STEP 183-F: PASS.
- Regression tests: 34/34.
- Failed tests: 0.
- Regression duration: 9.7116084999999988 seconds.
- Report: benchmarks/v06_switch_regression.json.
- Gen 4 Pokemon Showdown source inspected.
- Full differential engine testing is not complete.

### Known limitations
- Pressure PP handling requires further engine verification.
- Choice item locking requires further verification.
- Sleep recovery and Truant turn lifecycle are incomplete.
- Simultaneous switch ordering remains approximate.
- Forced entry ability timing has unresolved edge cases.
- Weather duration and global residual ordering are incomplete.
- Full move, item and ability coverage is not complete.
- Strategic AI v0.6 is not yet a completed competitive agent.
- No v0.6 strength benchmark has been completed.
- Strategic AI v0.5 remains the established baseline.

### Isolation
- Project U.I. main application unchanged.
- Existing personal memory databases unchanged.
- Pokemon knowledge remains isolated.
- No automatic knowledge transfer.
- Previous local backup files remain untracked.

### Next development phase
Temporarily prioritize Battle Revolution integration.

Build a separate integration module for:
1. Dolphin environment verification.
2. Battle state acquisition.
3. Controller input.
4. Battle state normalization.
5. Strategic AI decision bridge.
6. Local battle automation.
7. Gemini decision and commentary integration.
8. Project U.I. voice commentary.
9. Controlled online friend battle verification.

Start with read-only state acquisition.
Do not assume real-game connectivity is already functional.
Keep the simulator and real-game adapter independent.
Preserve the ability to disable the Pokemon feature.

Resume v0.6 strategic development after the integration checkpoint.
