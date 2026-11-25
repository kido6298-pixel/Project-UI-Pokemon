const assert = require('node:assert/strict');
const { evaluateHazards } = require('../src/hazards');

const conditions = {
    'Stealth Rock': 1,
    'Spikes': 3,
    'Toxic Spikes': 2
};

const candidates = [
    {species: 'Garchomp', ability: 'Sand Veil'},
    {species: 'Gyarados', ability: 'Intimidate'},
    {species: 'Zapdos', ability: 'Pressure'},
    {species: 'Metagross', ability: 'Clear Body'},
    {species: 'Snorlax', ability: 'Thick Fat'},
    {species: 'Gengar', ability: 'Levitate'},
    {species: 'Heatran', ability: 'Flash Fire'},
    {species: 'Suicune', ability: 'Pressure'},
    {species: 'Charizard', ability: 'Blaze'},
    {species: 'Clefable', ability: 'Magic Guard'},
    {species: 'Tentacruel', ability: 'Clear Body'}
];

const results = candidates.map(candidate =>
    evaluateHazards(candidate, conditions)
);

console.log('\n=== ENTRY HAZARD EVALUATION ===');

console.table(results.map(r => ({
    Pokemon: r.species,
    MaxHP: r.maxHP,
    Rock: r.stealthRock,
    Spikes: r.spikes,
    Toxic: r.toxicSpikes || '-',
    Total: r.totalDamage,
    Percent: r.damagePercent.toFixed(2) + '%',
    Grounded: r.grounded
})));

const get = name => results.find(r => r.species === name);

assert.equal(
    get('Charizard').stealthRock,
    Math.floor(get('Charizard').maxHP / 2)
);

assert.equal(get('Gyarados').spikes, 0);
assert.equal(get('Gengar').spikes, 0);
assert.equal(get('Metagross').toxicSpikes, null);
assert.equal(get('Snorlax').toxicSpikes, 'tox');
assert.equal(get('Tentacruel').toxicSpikes, 'absorb');
assert.equal(get('Clefable').totalDamage, 0);

assert.equal(
    get('Garchomp').stealthRock,
    Math.floor(get('Garchomp').maxHP / 16)
);

for (const [layers, divisor] of [[1, 8], [2, 6], [3, 4]]) {
    const r = evaluateHazards(
        candidates[0],
        {Spikes: layers}
    );

    assert.equal(r.spikes, Math.floor(r.maxHP / divisor));
}

const lowHP = evaluateHazards(
    {...candidates[8], curHP: 1},
    conditions
);

assert.equal(lowHP.faintedOnEntry, true);

const clean = evaluateHazards(candidates[0], {});
assert.equal(clean.totalDamage, 0);

console.log('\nENTRY HAZARD TEST: PASS');
