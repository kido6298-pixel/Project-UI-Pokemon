const { Dex } = require('pokemon-showdown');
const { StrategicAgentV02 } = require('./strategic_agent_v02');
const { getActions } = require('../actions');
const { buildOwnConfig } = require('../pokemon_config');
const { evaluateMatchup } = require('../matchup');
const { evaluateSwitchValue } = require('../switch_value');

const dex = Dex.mod('gen4');

class StrategicAgentV03 extends StrategicAgentV02 {
    constructor(side, random = Math.random) {
        super(side, random);

        this.switchEvaluations = 0;
        this.voluntarySwitches = 0;
        this.forcedSwitches = 0;
        this.preventedSwitches = 0;
        this.lastSwitchTurn = -100;
        this.switchHistory = [];
    }

    choose(request) {
        this.state.updateRequest(request);

        const actions = getActions(request);

        if (!actions.length) {
            throw new Error('No legal actions');
        }

        if (request.teamPreview) {
            return super.choose(request);
        }

        const forced = !!request.forceSwitch?.[0];

        const opponentSide = this.state.opponent;

        const enemy = this.state.pokemon[opponentSide][
            this.state.active[opponentSide]
        ];

        if (!enemy?.species || !enemy.hp || enemy.fainted) {
            return super.choose(request);
        }

        const switches = actions.filter(
            action => /^switch \d+$/.test(action)
        );

        if (!switches.length) {
            return super.choose(request);
        }

        const enemyBase = {
            species: enemy.species,
            ability: enemy.ability || '',
            item: enemy.item || '',
            status: enemy.status || '',
            boosts: enemy.boosts || {}
        };

        const scenarios = [
            {nature: 'Hardy', evs: {}},
            {nature: 'Jolly', evs: {atk: 252, spe: 252}},
            {nature: 'Timid', evs: {spa: 252, spe: 252}},
            {nature: 'Adamant', evs: {atk: 252, hp: 252}},
            {nature: 'Modest', evs: {spa: 252, hp: 252}}
        ];

        const weather = {
            RainDance: 'Rain',
            SunnyDay: 'Sun',
            Sandstorm: 'Sand',
            Hail: 'Hail'
        }[this.state.weather];

        const fieldFor = side => ({
            weather,
            defenderSide: {
                isReflect: !!this.state.sideConditions[side].Reflect,
                isLightScreen: !!this.state.sideConditions[side]['Light Screen']
            }
        });

        const common = {
            enemyMoves: enemy.moves || [],
            enemyHPPercent: enemy.hp.percent,
            attackField: fieldFor(opponentSide),
            defenseField: fieldFor(this.side),
            trickRoom: !!this.state.field['Trick Room']
        };

        const switchCandidates = [];

        for (const action of switches) {
            const index = Number(action.split(' ')[1]) - 1;
            const pokemon = request.side.pokemon[index];

            if (!pokemon) continue;

            const candidate = buildOwnConfig(pokemon);

            const candidateMoves = (pokemon.moves || [])
                .map(move => dex.moves.get(move).name);

            let score = 0;
            let rejected = 0;

            for (const scenario of scenarios) {
                const result = evaluateSwitchValue({
                    candidate,
                    candidateMoves,
                    enemy: {...enemyBase, ...scenario},
                    ...common,
                    conditions: this.state.sideConditions[this.side],
                    forced
                });

                score += result.score;

                if (result.rejected) rejected++;

                this.switchEvaluations++;
            }

            switchCandidates.push({
                action,
                species: candidate.species,
                score: score / scenarios.length,
                rejected
            });
        }

        switchCandidates.sort((a, b) =>
            b.score - a.score ||
            a.rejected - b.rejected
        );

        const bestSwitch = switchCandidates[0];

        if (!bestSwitch) {
            return super.choose(request);
        }

        if (forced) {
            this.forcedSwitches++;

            this.switchHistory.push({
                turn: this.state.turn,
                type: 'forced',
                ...bestSwitch
            });

            return bestSwitch.action;
        }

        const attackAction = super.choose(request);

        const own = request.side.pokemon.find(p => p.active);

        if (!own) return attackAction;

        const ownName = own.ident
            .split(': ').slice(1).join(': ');

        const ownConfig = buildOwnConfig(
            own,
            this.state.pokemon[this.side][ownName]
        );

        const ownMoves = actions
            .filter(action => /^move \d+$/.test(action))
            .map(action => {
                const index = Number(action.split(' ')[1]) - 1;
                return request.active[0].moves[index]?.id;
            })
            .filter(Boolean);

        let attackScore = 0;

        for (const scenario of scenarios) {
            const matchup = evaluateMatchup({
                own: ownConfig,
                ownMoves,
                enemy: {...enemyBase, ...scenario},
                ...common
            });

            attackScore += matchup.score;
        }

        attackScore /= scenarios.length;

        const switchMargin = 0.15;
        const switchMultiplier = 1.25;

        const worthwhile =
            bestSwitch.score >
                attackScore * switchMultiplier + switchMargin &&
            bestSwitch.rejected === 0;

        if (worthwhile) {
            const recentSwitch =
                this.state.turn - this.lastSwitchTurn <= 1;

            if (recentSwitch && attackScore > 0.05) {
                this.preventedSwitches++;
                return attackAction;
            }

            this.voluntarySwitches++;
            this.lastSwitchTurn = this.state.turn;

            this.switchHistory.push({
                turn: this.state.turn,
                type: 'voluntary',
                attackScore,
                ...bestSwitch
            });

            return bestSwitch.action;
        }

        return attackAction;
    }
}

module.exports = { StrategicAgentV03 };
