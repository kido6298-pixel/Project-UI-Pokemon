const { Dex } = require('pokemon-showdown');
const { Generations, Pokemon } = require('@smogon/calc');
const { BattleState } = require('../battle_state');
const { getActions } = require('../actions');
const { predictDamage } = require('../damage');

const dex = Dex.mod('gen4');
const gen = Generations.get(4);

class StrategicAgent {
    constructor(side, random = Math.random) {
        this.side = side;
        this.random = random;
        this.state = new BattleState(side);
        this.evaluations = 0;
        this.fallbacks = 0;
    }

    observe(line) {
        this.state.observe(line);
    }

    randomChoice(actions) {
        return actions[
            Math.floor(this.random() * actions.length)
        ];
    }

    choose(request) {
        this.state.updateRequest(request);

        const actions = getActions(request);

        if (!actions.length) {
            throw new Error('No legal actions');
        }

        if (request.teamPreview || request.forceSwitch?.[0]) {
            return this.randomChoice(actions);
        }

        const own = request.side.pokemon.find(p => p.active);

        const opponentSide = this.state.opponent;
        const opponentName = this.state.active[opponentSide];

        const enemy =
            this.state.pokemon[opponentSide][opponentName];

        if (!own || !enemy || !enemy.species || !enemy.hp) {
            this.fallbacks++;
            return this.randomChoice(actions);
        }

        const species = own.details.split(',')[0];
        const ownName = own.ident.split(': ').slice(1).join(': ');
        const ownState = this.state.pokemon[this.side][ownName];

        const attacker = {
            species,
            ability: dex.abilities.get(own.ability || own.baseAbility).name,
            item: own.item ? dex.items.get(own.item).name : undefined,
            status: own.condition.split(' ')[1] || '',
            boosts: ownState?.boosts || {},
            overrides: {}
        };

        // Reconstruct exact visible stats using the calculator's
        // base-stat override interface.
        const base = new Pokemon(gen, species, {
            level: 50,
            nature: 'Hardy',
            evs: {},
            ivs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}
        });

        const baseStats = {...base.species.baseStats};

        for (const stat of ['atk', 'def', 'spa', 'spd', 'spe']) {
            if (Number.isFinite(own.stats?.[stat])) {
                baseStats[stat] = own.stats[stat] - 20;
            }
        }

        // At level 50, neutral nature and zero EVs,
        // a 31 IV non-HP stat equals base stat + 20.
        attacker.overrides.baseStats = baseStats;
        attacker.nature = 'Hardy';
        attacker.evs = {};
        attacker.ivs = {
            hp: 31, atk: 31, def: 31,
            spa: 31, spd: 31, spe: 31
        };

        const weather = {
            RainDance: 'Rain',
            SunnyDay: 'Sun',
            Sandstorm: 'Sand',
            Hail: 'Hail'
        }[this.state.weather];

        const field = {
            weather,
            defenderSide: {
                isReflect: !!this.state.sideConditions[opponentSide].Reflect,
                isLightScreen: !!this.state.sideConditions[opponentSide]['Light Screen']
            }
        };

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

            const scenarios = [
                {nature: 'Hardy', evs: {}},
                {nature: 'Hardy', evs: {hp: 252}},
                {
                    nature: defensiveStat === 'def' ? 'Bold' : 'Calm',
                    evs: {hp: 252, [defensiveStat]: 252}
                }
            ];

            let score = 0;

            for (const scenario of scenarios) {
                const result = predictDamage({
                    attacker,
                    defender: {
                        species: enemy.species,
                        ability: enemy.ability || '',
                        item: enemy.item || '',
                        status: enemy.status || '',
                        boosts: enemy.boosts || {},
                        ...scenario
                    },
                    move: move.name,
                    field
                });

                const remainingHP = Math.max(
                    1,
                    Math.ceil(result.maxHP * enemy.hp.percent / 100)
                );

                const rolls = result.rolls;

                const koChance = rolls
                    ? rolls.filter(d => d >= remainingHP).length / rolls.length
                    : 0;

                const average =
                    result.average ?? (result.min + result.max) / 2;

                const accuracy = move.accuracy === true
                    ? 1
                    : move.accuracy / 100;

                score += accuracy * (
                    Math.min(average / remainingHP, 1) +
                    koChance
                );
            }

            score /= scenarios.length;

            candidates.push({action, score});
            this.evaluations++;
        }

        if (!candidates.length) {
            this.fallbacks++;
            return this.randomChoice(actions);
        }

        candidates.sort((a, b) => b.score - a.score);

        if (candidates[0].score <= 0) {
            this.fallbacks++;
            return this.randomChoice(actions);
        }

        return candidates[0].action;
    }
}

module.exports = { StrategicAgent };
