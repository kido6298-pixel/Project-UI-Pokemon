const assert = require('node:assert/strict');

const {
    displayHP,
    possibleHP,
    possibleDamage,
    matchDamageRolls
} = require('../src/hp_inference');

assert.equal(displayHP(200, 200), 100);
assert.equal(displayHP(199, 200), 99);
assert.equal(displayHP(198, 200), 99);
assert.equal(displayHP(197, 200), 99);
assert.equal(displayHP(196, 200), 98);
assert.equal(displayHP(0, 200), 0);

assert.deepEqual(
    possibleHP(99, 200),
    [197, 198, 199]
);

assert.deepEqual(
    possibleHP(63, 200),
    [125, 126]
);

assert.deepEqual(
    possibleDamage({
        before: 100,
        after: 63,
        maxHP: 200
    }),
    [74, 75]
);

console.log('\n=== HP INVERSION ===');

console.table(
    [150, 180, 200, 250].map(maxHP => ({
        MaxHP: maxHP,
        Full: possibleHP(100, maxHP).join(','),
        Display99: possibleHP(99, maxHP).join(','),
        Display63: possibleHP(63, maxHP).join(','),
        Damage: possibleDamage({
            before: 100,
            after: 63,
            maxHP
        }).join(',')
    }))
);

const rolls = [70, 72, 74, 75, 76, 78];

const result = matchDamageRolls({
    before: 100,
    after: 63,
    maxHP: 200,
    rolls
});

assert.equal(result.matches, 2);
assert.equal(result.trials, 6);

assert.ok(
    Math.abs(result.likelihood - 2 / 6) < 1e-9
);

console.log('\n=== DAMAGE LIKELIHOOD ===');

console.table(
    [150, 180, 200, 250].map(maxHP => {
        const r = matchDamageRolls({
            before: 100,
            after: 63,
            maxHP,
            rolls
        });

        return {
            MaxHP: maxHP,
            Matches: r.matches,
            Trials: r.trials,
            Likelihood:
                (r.likelihood * 100).toFixed(2) + '%'
        };
    })
);

let checked = 0;

for (let maxHP = 1; maxHP <= 400; maxHP++) {
    for (let hp = 0; hp <= maxHP; hp++) {
        const displayed = displayHP(hp, maxHP);

        assert.ok(
            possibleHP(displayed, maxHP).includes(hp)
        );

        checked++;
    }
}

console.log('\nRound-trip checks:', checked);

console.log('\nHP INFERENCE TEST: PASS');
