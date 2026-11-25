const { Dex } = require('pokemon-showdown');
const { Pokemon, Generations } = require('@smogon/calc');

const {
    StrategicAgentV03
} = require('./strategic_agent_v03');

const { getActions } = require('../actions');
const { buildOwnConfig } = require('../pokemon_config');

const {
    evaluateAdaptiveAction
} = require('../adaptive_prediction');

const {
    getAttackCandidates,
    isSimpleAttack
} = require('../move_candidates');

const {
    normalizeHazards
} = require('../hazard_normalization');

const {
    LiveEnemyInference
} = require('../live_enemy_inference');

const {
    estimateEnemyBuilds
} = require('../enemy_builds');

const {
    selectPosteriorBuilds
} = require('../posterior_build_selection');

const {
    refreshPosteriorBuilds
} = require('../posterior_build_state');

const {
    evaluateMultiBuildAction
} = require('../multi_build_prediction_cached');

const {
    HPCachedCalculations
} = require('../hp_cached_calculations');

const dex = Dex.mod('gen4');
const gen = Generations.get(4);

class StrategicAgentV05HPCached extends StrategicAgentV03 {
    constructor(side, random = Math.random) {
        super(side, random);

        this.searchDecisions = 0;
        this.searchEvaluations = 0;
        this.searchFallbacks = 0;
        this.searchSwitches = 0;
        this.searchErrors = 0;
        this.searchTimeMs = 0;
        this.lastError = null;
        this.searchHistory = [];

        this.cacheStats = {
            damageHits: 0,
            damageMisses: 0,
            speedHits: 0,
            speedMisses: 0,
            damageEvictions: 0,
            speedEvictions: 0
        };

        this.inference = new LiveEnemyInference(side);

        this.buildLimit = 5;
        this.targetCoverage = 0.95;
        this.buildRiskWeight = 0.25;

        this.posteriorUses = 0;
        this.priorUses = 0;
        this.buildSelections = 0;
        this.totalSelectedBuilds = 0;
        this.totalCoverage = 0;
        this.inferenceErrors = 0;
        this.lastInferenceError = null;
    }

    observe(line) {
        super.observe(line);

        try {
            this.inference.observe(line);
        } catch (error) {
            this.inferenceErrors++;
            this.lastInferenceError = error.message;
        }
    }

    async choose(request) {
        try {
            this.inference.updateRequest(request);
        } catch (error) {
            this.inferenceErrors++;
            this.lastInferenceError = error.message;
        }
        this.state.updateRequest(request);

        if (request.teamPreview ||
            request.forceSwitch?.[0]) {
            return super.choose(request);
        }

        const started = performance.now();

        const calculations = new HPCachedCalculations();

        try {
            const actions = getActions(request);

            const active = request.side.pokemon.find(
                p => p.active
            );

            const opponentSide = this.state.opponent;

            const observed =
                this.state.pokemon[opponentSide][
                    this.state.active[opponentSide]
                ];

            if (!active ||
                !observed?.species ||
                !observed.hp ||
                observed.fainted) {

                this.searchFallbacks++;
                return super.choose(request);
            }

            const activeName = active.ident
                .split(': ').slice(1).join(': ');

            const own = buildOwnConfig(
                active,
                this.state.pokemon[this.side][activeName]
            );

            const enemyName =
                this.state.active[opponentSide];

            const key =
                opponentSide + 'a: ' + enemyName;

            const currentObserved = {
                ...observed,
                item: observed.item ??
                    this.inference.confirmedItems.get(key) ??
                    null
            };

            const belief = this.inference.belief.get(key);

            const hasPosterior =
                !!belief?.builds?.length &&
                belief.evidenceCount > 0;

            const sourceBuilds = hasPosterior
                ? belief.builds
                : estimateEnemyBuilds(currentObserved);

            const refreshed = refreshPosteriorBuilds(
                sourceBuilds,
                currentObserved
            );

            const selection = selectPosteriorBuilds(
                refreshed,
                {
                    limit: this.buildLimit,
                    targetCoverage: this.targetCoverage
                }
            );

            const builds = selection.builds;
            const enemy = builds[0].config;

            if (hasPosterior) {
                this.posteriorUses++;
            } else {
                this.priorUses++;
            }

            this.buildSelections++;
            this.totalSelectedBuilds += builds.length;
            this.totalCoverage += selection.coverage;

            const knownMoves = observed.moves || [];

            const enemyMoves = (
                await getAttackCandidates(
                    enemy.species,
                    knownMoves,
                    3
                )
            ).filter(name =>
                isSimpleAttack(dex.moves.get(name))
            );

            if (!enemyMoves.length) {
                this.searchFallbacks++;
                return super.choose(request);
            }

            const ownAttacks = actions
                .filter(a => /^move \d+$/.test(a))
                .map(action => ({
                    action,
                    move: dex.moves.get(
                        request.active[0].moves[
                            Number(action.split(' ')[1]) - 1
                        ].id
                    )
                }))
                .filter(a => isSimpleAttack(a.move));

            if (!ownAttacks.length) {
                this.searchFallbacks++;
                return super.choose(request);
            }

            const ownMoves = ownAttacks.map(
                a => a.move.name
            );

            const weather = {
                RainDance: 'Rain',
                SunnyDay: 'Sun',
                Sandstorm: 'Sand',
                Hail: 'Hail'
            }[this.state.weather];

            const fieldFor = side => {
                const conditions =
                    this.state.sideConditions[side] || {};

                return {
                    weather,
                    defenderSide: {
                        isReflect: !!(
                            conditions.Reflect ||
                            conditions['move: Reflect']
                        ),
                        isLightScreen: !!(
                            conditions['Light Screen'] ||
                            conditions['move: Light Screen']
                        )
                    }
                };
            };

            const common = {
                calculations,
                own,
                builds,
                buildRiskWeight: this.buildRiskWeight,
                ownMoves,
                enemyMoves,
                attackField: fieldFor(opponentSide),
                defenseField: fieldFor(this.side),
                trickRoom: !!(
                    this.state.field['Trick Room'] ||
                    this.state.field['move: Trick Room']
                ),
                riskWeight: 0.5,
                discount: 0.85
            };

            const candidates = [];

            for (const attack of ownAttacks) {
                const result = evaluateMultiBuildAction({
                    ...common,
                    ownMove: attack.move.name
                });

                candidates.push({
                    action: attack.action,
                    name: attack.move.name,
                    score: result.score,
                    type: 'attack'
                });

                this.searchEvaluations +=
                    result.evaluations;
            }

            for (const action of actions.filter(
                a => /^switch \d+$/.test(a)
            )) {
                const index =
                    Number(action.split(' ')[1]) - 1;

                const pokemon =
                    request.side.pokemon[index];

                const candidate = buildOwnConfig(pokemon);

                const candidateMoves = (pokemon.moves || [])
                    .map(name => dex.moves.get(name))
                    .filter(isSimpleAttack)
                    .map(move => move.name);

                if (!candidateMoves.length) continue;

                const result = evaluateMultiBuildAction({
                    ...common,
                    ownMove: ownMoves[0],
                    candidate,
                    candidateMoves,
                    conditions: normalizeHazards(
                        this.state.sideConditions[this.side]
                    )
                });

                candidates.push({
                    action,
                    name: candidate.species,
                    score: result.score - 0.30 -
    (
        this.searchHistory.at(-1)?.chosen.type === 'switch' &&
        this.searchHistory.at(-1)?.turn === this.state.turn - 1
            ? 0.50
            : 0
    ),
                    type: 'switch'
                });

                this.searchEvaluations +=
                    result.evaluations;
            }

            candidates.sort(
                (a, b) => b.score - a.score
            );

            const best = candidates[0];

            if (!best ||
                !Number.isFinite(best.score)) {

                this.searchFallbacks++;
                return super.choose(request);
            }

            this.searchDecisions++;

            if (best.type === 'switch') {
                this.searchSwitches++;
            }

            this.searchHistory.push({
                turn: this.state.turn,
                enemy: enemy.species,
                hasPosterior,
                evidenceCount: belief?.evidenceCount || 0,
                buildCount: builds.length,
                coverage: selection.coverage,
                omittedProbability: selection.omittedProbability,
                builds: builds.map(build => ({
                    name: build.name,
                    probability: build.probability,
                    originalProbability: build.originalProbability
                })),
                enemyMoves,
                chosen: best,
                candidates
            });

            return best.action;

        } catch (error) {
            this.searchErrors++;
            this.searchFallbacks++;
            this.lastError = error.message;

            return super.choose(request);

        } finally {
            const stats = calculations.stats();

            this.cacheStats.damageHits +=
                stats.damage.hits;

            this.cacheStats.damageMisses +=
                stats.damage.misses;

            this.cacheStats.speedHits +=
                stats.speed.hits;

            this.cacheStats.speedMisses +=
                stats.speed.misses;

            this.cacheStats.damageEvictions +=
                stats.damage.evictions;

            this.cacheStats.speedEvictions +=
                stats.speed.evictions;
            this.searchTimeMs +=
                performance.now() - started;
        }
    }
}

module.exports = { StrategicAgentV05HPCached };




