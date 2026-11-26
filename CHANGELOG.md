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

