const assert = require('node:assert/strict');

const {
    BattleEvidence
} = require('../src/battle_evidence');

const observer = new BattleEvidence('p1');

const lines = [
    '|switch|p1a: Garchomp|Garchomp, L50|184/184',
    '|switch|p2a: Suicune|Suicune, L50|100/100',
    '|turn|1',
    '|move|p1a: Garchomp|Earthquake|p2a: Suicune',
    '|-damage|p2a: Suicune|63/100',
    '|move|p2a: Suicune|Ice Beam|p1a: Garchomp',
    '|-damage|p1a: Garchomp|24/184',
    '|turn|2'
];

for (const line of lines) {
    observer.observe(line);
}

const events = observer.drain();

console.table(events);

const dealt = events.find(
    e => e.type === 'dealtDamage'
);

const received = events.find(
    e => e.type === 'damage'
);

assert.ok(dealt);
assert.ok(received);

assert.equal(dealt.beforeHP, 100);
assert.equal(dealt.afterHP, 63);
assert.equal(dealt.maxHP, 100);
assert.equal(dealt.damage, 37);

assert.equal(received.damage, 160);
assert.equal(received.maxHP, 184);

assert.equal(
    events.filter(e => e.type === 'order').length,
    1
);

console.log('\nDEALT DAMAGE EVIDENCE TEST: PASS');
