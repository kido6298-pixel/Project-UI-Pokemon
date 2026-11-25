const assert = require('node:assert/strict');

const {
    BattleEvidence
} = require('../src/battle_evidence');

function run(lines) {
    const observer = new BattleEvidence('p1');

    for (const line of lines) {
        observer.observe(line);
    }

    return observer.drain();
}

const initial = [
    '|switch|p1a: Garchomp|Garchomp, L50|184/184',
    '|switch|p2a: Starmie|Starmie, L50|100/100',
    '|turn|1'
];

const normal = run([
    ...initial,
    '|move|p2a: Starmie|Surf|p1a: Garchomp',
    '|-damage|p1a: Garchomp|123/184',
    '|move|p1a: Garchomp|Earthquake|p2a: Starmie',
    '|-damage|p2a: Starmie|30/100',
    '|turn|2'
]);

const damage = normal.find(e => e.type === 'damage');
const order = normal.find(e => e.type === 'order');

assert.equal(damage.damage, 61);
assert.equal(damage.move, 'Surf');
assert.equal(order.ownFirst, false);
assert.equal(order.ownMove, 'Earthquake');
assert.equal(order.enemyMove, 'Surf');

console.log('\n=== NORMAL TURN ===');
console.table(normal);

const cases = [
    {
        name: 'Critical hit',
        lines: [
            '|move|p2a: Starmie|Surf|p1a: Garchomp',
            '|-crit|p1a: Garchomp',
            '|-damage|p1a: Garchomp|50/184'
        ]
    },
    {
        name: 'Knockout',
        lines: [
            '|move|p2a: Starmie|Ice Beam|p1a: Garchomp',
            '|-damage|p1a: Garchomp|0 fnt',
            '|faint|p1a: Garchomp'
        ]
    },
    {
        name: 'Residual damage',
        lines: [
            '|-damage|p1a: Garchomp|160/184|[from] psn'
        ]
    },
    {
        name: 'Multi-hit',
        lines: [
            '|move|p2a: Starmie|Double Hit|p1a: Garchomp',
            '|-damage|p1a: Garchomp|160/184',
            '|-damage|p1a: Garchomp|136/184',
            '|-hitcount|p1a: Garchomp|2'
        ]
    }
];

for (const test of cases) {
    const events = run([
        ...initial,
        ...test.lines,
        '|turn|2'
    ]);

    assert.equal(
        events.filter(e => e.type === 'damage').length,
        0
    );

    console.log(test.name + ' exclusion: PASS');
}

const switched = run([
    ...initial,
    '|switch|p1a: Snorlax|Snorlax, L50|267/267',
    '|move|p2a: Starmie|Surf|p1a: Snorlax',
    '|-damage|p1a: Snorlax|206/267',
    '|turn|2'
]);

assert.equal(
    switched.find(e => e.type === 'damage').damage,
    61
);

assert.equal(
    switched.filter(e => e.type === 'order').length,
    0
);

console.log('Switch handling: PASS');

console.log('\nBATTLE EVIDENCE TEST: PASS');
