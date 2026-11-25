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

