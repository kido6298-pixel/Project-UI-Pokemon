const assert = require('node:assert/strict');
const {
    calculate,
    Generations,
    Pokemon,
    Move,
    Field
} = require('@smogon/calc');

const gen = Generations.get(4);

const garchomp = new Pokemon(gen, 'Garchomp', {
    level: 50,
    nature: 'Jolly',
    ability: 'Sand Veil',
    evs: {atk: 252, spe: 252, hp: 4}
});

const suicune = new Pokemon(gen, 'Suicune', {
    level: 50,
    nature: 'Bold',
    ability: 'Pressure',
    evs: {hp: 252, def: 252, spd: 4}
});

const zapdos = new Pokemon(gen, 'Zapdos', {
    level: 50,
    ability: 'Pressure'
});

function test(name, attacker, defender, move, field = {}) {
    const result = calculate(
        gen,
        attacker,
        defender,
        new Move(gen, move),
        new Field(field)
    );

    const [min, max] = result.range();

    console.log('\n=== ' + name + ' ===');
    console.log('Damage:', min, '-', max);
    console.log('Target HP:', defender.maxHP());
    console.log('Description:', max === 0 ? 'No damage' : result.desc());

    return {min, max};
}

const normal = test(
    'Garchomp Earthquake vs Suicune',
    garchomp,
    suicune,
    'Earthquake'
);

assert.ok(normal.min > 0);
assert.ok(normal.max >= normal.min);

const ice = test(
    'Suicune Ice Beam vs Garchomp',
    suicune,
    garchomp,
    'Ice Beam'
);

assert.ok(ice.min > 0);

const immune = test(
    'Garchomp Earthquake vs Zapdos',
    garchomp,
    zapdos,
    'Earthquake'
);

assert.equal(immune.max, 0);

const boosted = new Pokemon(gen, 'Garchomp', {
    level: 50,
    nature: 'Jolly',
    ability: 'Sand Veil',
    evs: {atk: 252, spe: 252, hp: 4},
    boosts: {atk: 2}
});

const swordsDance = test(
    'Garchomp +2 Earthquake vs Suicune',
    boosted,
    suicune,
    'Earthquake'
);

assert.ok(swordsDance.min > normal.min);

console.log('\nDAMAGE CALCULATOR TEST: PASS');

