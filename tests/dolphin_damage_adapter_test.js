const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
    buildDolphinConfig,
    predictDolphinDamage,
    DolphinCalculations
} = require('../dolphin_adapter/damage_adapter');

const { buildOwnConfig } = require('../src/pokemon_config');
const { predictDamage } = require('../src/damage');

const {
    predictAttackTurn
} = require('../src/attack_prediction_fast');

const {
    evaluateMultiBuildAction
} = require('../src/multi_build_prediction_fast');

const source = JSON.parse(
    fs.readFileSync(
        'data/dolphin/team_ai_input.json',
        'utf8'
    ).replace(/^\uFEFF/, '')
);

const team = source.team_preview_request.side.pokemon;
const cache = new DolphinCalculations();

let checked = 0;

for (const pokemon of team) {
    const own = buildDolphinConfig(pokemon);
    const original = buildOwnConfig(pokemon);

    const enemy = {
        species: 'Garchomp',
        level: 50,
        nature: 'Hardy',
        curHP: 180
    };

    if (!pokemon.hidden_power) {
        assert.deepEqual(own, original);
        continue;
    }

    const options = {
        attacker: own,
        defender: enemy,
        move: 'Hidden Power'
    };

    const direct = predictDolphinDamage(options);
    const cached = cache.predictDamage(options);

    assert.deepEqual(cached, direct);

    const expected = predictDamage({
        attacker: original,
        defender: enemy,
        move: 'Hidden Power',
        moveOptions: {
            overrides: {
                type: pokemon.hidden_power.type,
                basePower: pokemon.hidden_power.power
            }
        }
    });

    assert.deepEqual(direct, expected);

    const turn = predictAttackTurn({
        own,
        enemy,
        ownMove: 'Hidden Power',
        enemyMove: 'Earthquake',
        calculations: cache
    });

    assert.deepEqual(turn.outgoing, expected);

    const result = evaluateMultiBuildAction({
        own,
        builds: [{
            name: 'test',
            probability: 1,
            config: enemy
        }],
        ownMove: 'Hidden Power',
        ownMoves: ['Hidden Power'],
        enemyMoves: ['Earthquake'],
        calculations: cache,
        discount: 0.85,
        riskWeight: 0.5
    });

    assert.ok(Number.isFinite(result.score));

    console.log('\n=== ' + own.species + ' ===');
    console.log('Hidden Power:', own.hiddenPower);
    console.log('Damage:', direct.min, direct.max);
    console.log('Turn prediction: PASS');
    console.log('Adaptive search: PASS');
    console.log('Score:', result.score);

    checked++;
}

assert.equal(checked, 3);

console.log('\n=== NORMAL MOVE REGRESSION ===');

let normalChecks = 0;

for (const pokemon of team) {
    const own = buildDolphinConfig(pokemon);
    const original = buildOwnConfig(pokemon);

    const enemy = {
        species: 'Snorlax',
        level: 50
    };

    const { Dex } = require('pokemon-showdown');
    const dex = Dex.mod('gen4');

    for (const name of pokemon.moves) {
        const move = dex.moves.get(name);

        if (
            move.category === 'Status' ||
            move.id === 'hiddenpower'
        ) continue;

        const options = {
            defender: enemy,
            move: move.name
        };

        const actual = cache.predictDamage({
            ...options,
            attacker: own
        });

        const expected = predictDamage({
            ...options,
            attacker: original
        });

        assert.deepEqual(actual, expected);
        normalChecks++;
    }
}

console.log('Normal move checks:', normalChecks);
console.log('Normal move regression: PASS');

const invalid = structuredClone(
    team.find(p => p.hidden_power)
);

invalid.hidden_power.power = 71;

assert.throws(
    () => buildDolphinConfig(invalid),
    /Invalid Hidden Power/
);

invalid.hidden_power = null;

assert.throws(
    () => buildDolphinConfig(invalid),
    /Invalid Hidden Power/
);

console.log('Invalid metadata guard: PASS');
console.log('Cache:', cache.stats());

console.log('\nSTEP 237-D: ALL TESTS PASS');
