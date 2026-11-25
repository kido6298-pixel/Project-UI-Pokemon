const assert = require('node:assert/strict');
const { Dex } = require('pokemon-showdown');

const {
    normalizeHazards
} = require('../src/hazard_normalization');

const {
    getAttackCandidates
} = require('../src/move_candidates');

const {
    evaluateHazards
} = require('../src/hazards');

const dex = Dex.mod('gen4');

async function main() {
    const raw = {
        'move: Stealth Rock': {layers: 1},
        'Spikes': {layers: 3},
        'move: Toxic Spikes': {layers: 2},
        'Reflect': {layers: 1}
    };

    const normalized = normalizeHazards(raw);

    assert.deepEqual(normalized, {
        'Stealth Rock': 1,
        'Spikes': 3,
        'Toxic Spikes': 2
    });

    const hazards = evaluateHazards({
        species: 'Snorlax',
        nature: 'Careful',
        evs: {hp: 252, spd: 252}
    }, normalized);

    assert.ok(hazards.totalDamage > 0);
    assert.equal(hazards.toxicSpikes, 'tox');

    console.log('\n=== HAZARD NORMALIZATION ===');
    console.log(normalized);
    console.log('Damage:', hazards.totalDamage);
    console.log('Status:', hazards.toxicSpikes);

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
        assert.ok(moves.length <= 6);

        for (const name of moves) {
            const move = dex.moves.get(name);

            assert.ok(move.exists);
            assert.ok(move.gen <= 4);
            assert.notEqual(move.category, 'Status');
        }

        results.push({
            Species: species,
            Candidates: moves.join(', ')
        });
    }

    console.log('\n=== UNKNOWN MOVE CANDIDATES ===');
    console.table(results);

    const known = await getAttackCandidates(
        'Starmie',
        ['Surf', 'Ice Beam']
    );

    assert.equal(known[0], 'Surf');
    assert.equal(known[1], 'Ice Beam');

    const complete = await getAttackCandidates(
        'Starmie',
        ['Surf', 'Ice Beam', 'Thunderbolt', 'Recover']
    );

    assert.deepEqual(complete, [
        'Surf',
        'Ice Beam',
        'Thunderbolt'
    ]);

    console.log('\nKnown moves prioritized:', known);
    console.log('Fully revealed:', complete);

    console.log('\nLIVE INPUT PREPARATION TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
