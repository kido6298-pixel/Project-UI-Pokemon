const { Dex } = require('pokemon-showdown');
const { StrategicAgent } = require('./strategic_agent_v01');
const { getActions } = require('../actions');
const { buildOwnConfig } = require('../pokemon_config');
const { predictDamage } = require('../damage');
const { predictThreat } = require('../threat');

const dex = Dex.mod('gen4');

class StrategicAgentV02 extends StrategicAgent {
    constructor(side, random = Math.random) {
        super(side, random);
        this.threatEvaluations = 0;
        this.riskDecisions = 0;
    }

    choose(request) {
        this.state.updateRequest(request);

        const actions = getActions(request);

        if (request.teamPreview || request.forceSwitch?.[0]) {
            return this.randomChoice(actions);
        }

        const own = request.side.pokemon.find(p => p.active);
        const opponentSide = this.state.opponent;

        const enemy = this.state.pokemon[opponentSide][
            this.state.active[opponentSide]
        ];

        if (!own || !enemy?.species || !enemy.hp) {
            return super.choose(request);
        }

        const ownName = own.ident.split(': ').slice(1).join(': ');

        const attacker = buildOwnConfig(
            own,
            this.state.pokemon[this.side][ownName]
        );

        const weather = {
            RainDance: 'Rain',
            SunnyDay: 'Sun',
            Sandstorm: 'Sand',
            Hail: 'Hail'
        }[this.state.weather];

        const trickRoom = !!this.state.field['Trick Room'];

        const fieldFor = side => ({
            weather,
            defenderSide: {
                isReflect: !!this.state.sideConditions[side].Reflect,
                isLightScreen: !!this.state.sideConditions[side]['Light Screen']
            }
        });

        const enemyBase = {
            species: enemy.species,
            ability: enemy.ability || '',
            item: enemy.item || '',
            status: enemy.status || '',
            boosts: enemy.boosts || {}
        };

        const offensiveScenarios = [
            {nature: 'Hardy', evs: {}},
            {nature: 'Jolly', evs: {atk: 252, spe: 252}},
            {nature: 'Timid', evs: {spa: 252, spe: 252}},
            {nature: 'Adamant', evs: {atk: 252, hp: 252}},
            {nature: 'Modest', evs: {spa: 252, hp: 252}}
        ];

        const candidates = [];

        for (const action of actions) {
            const match = action.match(/^move (\d+)$/);
            if (!match) continue;

            const moveRequest =
                request.active[0].moves[Number(match[1]) - 1];

            if (!moveRequest) continue;

            const move = dex.moves.get(moveRequest.id);

            if (move.category === 'Status') continue;

            const defensiveStat =
                move.category === 'Physical' ? 'def' : 'spd';

            const defensiveScenarios = [
                {nature: 'Hardy', evs: {}},
                {nature: 'Hardy', evs: {hp: 252}},
                {
                    nature: defensiveStat === 'def' ? 'Bold' : 'Calm',
                    evs: {hp: 252, [defensiveStat]: 252}
                }
            ];

            let attackScore = 0;

            const accuracy = move.accuracy === true
                ? 1
                : move.accuracy / 100;

            for (const scenario of defensiveScenarios) {
                const result = predictDamage({
                    attacker,
                    defender: {...enemyBase, ...scenario},
                    move: move.name,
                    field: fieldFor(opponentSide)
                });

                const remainingHP = Math.max(
                    1,
                    Math.ceil(result.maxHP * enemy.hp.percent / 100)
                );

                const average =
                    result.average ?? (result.min + result.max) / 2;

                const koChance = result.rolls
                    ? result.rolls.filter(
                        d => d >= remainingHP
                    ).length / result.rolls.length
                    : 0;

                attackScore += accuracy * (
                    Math.min(average / remainingHP, 1) +
                    koChance
                );
            }

            attackScore /= defensiveScenarios.length;

            let risk = 0;
            let knownThreats = 0;

            for (const scenario of offensiveScenarios) {
                const result = predictThreat({
                    own: attacker,
                    enemy: {...enemyBase, ...scenario},
                    enemyMoves: enemy.moves,
                    ownMove: move.name,
                    field: fieldFor(this.side),
                    trickRoom
                });

                this.threatEvaluations += result.threats.length;

                if (result.worstThreat?.beforeActionKO != null) {
                    risk += result.worstThreat.beforeActionKO;
                    knownThreats++;
                }
            }

            risk = knownThreats ? risk / knownThreats : 0;

            const actionChance = 1 - risk;

            const score = attackScore * actionChance;

            candidates.push({
                action,
                score,
                attackScore,
                risk
            });

            this.evaluations++;
        }

        if (!candidates.length) {
            return super.choose(request);
        }

        candidates.sort((a, b) =>
            b.score - a.score ||
            b.attackScore - a.attackScore
        );

        if (candidates[0].risk > 0) {
            this.riskDecisions++;
        }

        if (candidates[0].attackScore <= 0) {
            return super.choose(request);
        }

        return candidates[0].action;
    }
}

module.exports = { StrategicAgentV02 };
