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

const dex = Dex.mod('gen4');
const gen = Generations.get(4);

class StrategicAgentV04 extends StrategicAgentV03 {
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
    }

    async choose(request) {
        this.state.updateRequest(request);

        if (request.teamPreview ||
            request.forceSwitch?.[0]) {
            return super.choose(request);
        }

        const started = performance.now();

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

            const species = dex.species.get(
                observed.species
            );

            const physical =
                species.baseStats.atk >=
                species.baseStats.spa;

            const enemy = {
                species: observed.species,
                level: 50,
                nature: physical ? 'Jolly' : 'Timid',
                evs: physical
                    ? {atk: 252, spe: 252}
                    : {spa: 252, spe: 252},
                ability: observed.ability || '',
                item: observed.item || '',
                status: observed.status || '',
                boosts: observed.boosts || {}
            };

            const enemyStats = new Pokemon(
                gen, enemy.species, enemy
            );

            enemy.curHP = Math.max(
                1,
                Math.min(
                    enemyStats.maxHP(),
                    Math.ceil(
                        enemyStats.maxHP() *
                        observed.hp.percent / 100
                    )
                )
            );

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
                own,
                enemy,
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
                const result = evaluateAdaptiveAction({
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

                const result = evaluateAdaptiveAction({
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
                    score: result.score - 0.10,
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
            this.searchTimeMs +=
                performance.now() - started;
        }
    }
}

module.exports = { StrategicAgentV04 };
