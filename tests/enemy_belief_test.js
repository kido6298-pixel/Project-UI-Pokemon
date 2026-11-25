const assert = require('node:assert/strict');

const {
    EnemyBelief
} = require('../src/enemy_belief');

const belief = new EnemyBelief();

const garchomp = {
    species: 'Garchomp',
    level: 50,
    nature: 'Jolly',
    evs: {atk:252, spe:252}
};

const snorlax = {
    species: 'Snorlax',
    level: 50,
    nature: 'Careful',
    ability: 'Thick Fat',
    evs: {hp:252, spd:252}
};

const key = 'p2: Starmie';

function show(label) {
    const result = belief.get(key);

    console.log('\n=== ' + label + ' ===');

    console.table(result.builds.map(b => ({
        Build: b.name,
        Probability: (
            b.probability * 100
        ).toFixed(2) + '%',
        HP: b.config.curHP + '/' + b.maxHP,
        Item: b.config.item || 'Unknown'
    })));

    assert.ok(Math.abs(
        result.builds.reduce(
            (sum, b) => sum + b.probability, 0
        ) - 1
    ) < 1e-9);

    return result;
}

belief.update(key, {
    species: 'Starmie',
    moves: ['Surf', 'Ice Beam'],
    hp: {percent:100},
    item: 'Leftovers'
});

show('INITIAL');

const order = {
    own: garchomp,
    ownFirst: true
};

assert.equal(
    belief.addEvidence(
        key, 'order', order, 'turn-1'
    ),
    true
);

show('AFTER ORDER');

assert.equal(
    belief.addEvidence(
        key, 'order', order, 'turn-2'
    ),
    false
);

console.log('\nDuplicate order prevention: PASS');

const damage = {
    own: snorlax,
    enemyMove: 'Surf',
    observedDamage: 61
};

assert.equal(
    belief.addEvidence(
        key, 'damage', damage, 'turn-3-hit-1'
    ),
    true
);

const before = show('AFTER DAMAGE');

function aggregateBuilds(builds) {
    const totals = new Map();

    for (const build of builds) {
        const name = build.name.split(' / ')[0];

        totals.set(
            name,
            (totals.get(name) || 0) + build.probability
        );
    }

    return [...totals.entries()].sort(
        (a, b) => b[1] - a[1]
    );
}

const aggregated = aggregateBuilds(before.builds);

assert.equal(aggregated[0][0], 'Power Special');

console.log('\n=== AGGREGATED BUILD PROBABILITIES ===');

console.table(aggregated.map(([name, probability]) => ({
    Build: name,
    Probability: (probability * 100).toFixed(2) + '%'
})));

assert.equal(before.evidenceCount, 2);

assert.equal(
    belief.addEvidence(
        key, 'damage', damage, 'turn-3-hit-1'
    ),
    false
);

belief.update('p2: Suicune', {
    species: 'Suicune',
    moves: ['Ice Beam'],
    hp: {percent:100}
});

belief.update(key, {
    hp: {percent:40}
});

const after = show('AFTER SWITCH AND RETURN');

assert.equal(after.evidenceCount, 2);

assert.equal(after.builds.length, before.builds.length);

for (const previous of before.builds) {
    const current = after.builds.find(
        b => b.name === previous.name
    );

    assert.ok(current);

    assert.ok(Math.abs(
        current.probability - previous.probability
    ) < 1e-9);
}

console.log('All candidate probabilities preserved: PASS');

assert.equal(
    after.builds[0].name,
    before.builds[0].name
);

assert.ok(Math.abs(
    after.builds[0].probability -
    before.builds[0].probability
) < 1e-9);

assert.ok(
    after.builds[0].config.curHP <
    before.builds[0].config.curHP
);

assert.equal(
    belief.get('p2: Suicune').evidenceCount,
    0
);

console.log('\nIndependent Pokemon memory: PASS');

belief.addEvidence(
    key,
    'damage',
    {
        ...damage,
        observedDamage:999
    },
    'invalid-damage'
);

assert.equal(
    belief.get(key).contradictions,
    1
);

console.log('Contradiction handling: PASS');

belief.reset();

assert.equal(belief.get(key), null);

console.log('Battle memory reset: PASS');

console.log('\nENEMY BELIEF TEST: PASS');

