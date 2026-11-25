const assert = require('node:assert/strict');
const { Dex } = require('pokemon-showdown');

const {
    getAttackCandidates,
    isSimpleAttack
} = require('../src/move_candidates');

const dex = Dex.mod('gen4');

async function main() {
    const speciesList = [
        'Garchomp',
        'Starmie',
        'Metagross',
        'Snorlax',
        'Suicune',
        'Tyranitar',
        'Gyarados',
        'Heatran',
        'Zapdos',
        'Breloom',
        'Gengar',
        'Scizor'
    ];

    const results = [];

    for (const species of speciesList) {
        const moves = await getAttackCandidates(species);

        assert.ok(moves.length > 0);

        for (const name of moves) {
            assert.ok(
                isSimpleAttack(dex.moves.get(name)),
                species + ': ' + name
            );
        }

        results.push({
            Species: species,
            Candidates: moves.join(', ')
        });
    }

    console.log('\n=== IMPROVED MOVE CANDIDATES ===');
    console.table(results);

    const scizor = await getAttackCandidates('Scizor');
    const starmie = await getAttackCandidates('Starmie');
    const metagross = await getAttackCandidates('Metagross');

    assert.ok(scizor.includes('Bullet Punch'));
    assert.ok(!starmie.includes('Dream Eater'));
    assert.ok(!starmie.includes('Hyper Beam'));
    assert.ok(!metagross.includes('Explosion'));

    const known = await getAttackCandidates(
        'Metagross',
        ['Explosion', 'Meteor Mash']
    );

    assert.equal(known[0], 'Explosion');
    assert.equal(known[1], 'Meteor Mash');

    console.log('\nKnown complex moves preserved:', known);

    console.log('\nMOVE CANDIDATE QUALITY TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
