const assert = require('node:assert/strict');
const { evaluateSwitchValue } = require('../src/switch_value');

const enemy = {
    species: 'Starmie',
    nature: 'Timid',
    evs: {spa: 252, spe: 252}
};

const candidates = [
    {
        candidate: {
            species: 'Garchomp',
            nature: 'Jolly',
            evs: {atk: 252, spe: 252},
            curHP: 100
        },
        candidateMoves: ['Earthquake', 'Dragon Claw']
    },
    {
        candidate: {
            species: 'Snorlax',
            ability: 'Thick Fat',
            nature: 'Careful',
            evs: {hp: 252, spd: 252}
        },
        candidateMoves: ['Body Slam', 'Crunch']
    },
    {
        candidate: {
            species: 'Metagross',
            nature: 'Adamant',
            evs: {hp: 252, atk: 252}
        },
        candidateMoves: ['Meteor Mash', 'Thunder Punch']
    },
    {
        candidate: {
            species: 'Suicune',
            nature: 'Calm',
            evs: {hp: 252, spd: 252}
        },
        candidateMoves: ['Surf', 'Ice Beam']
    }
];

function run(name, options = {}) {
    const results = candidates.map(candidate =>
        evaluateSwitchValue({
            ...candidate,
            enemy,
            enemyMoves: ['Surf', 'Ice Beam'],
            ...options
        })
    );

    results.sort((a, b) => b.score - a.score);

    console.log('\n=== ' + name + ' ===');

    console.table(results.map(r => ({
        Pokemon: r.species,
        HazardDamage: r.hazards.totalDamage,
        RemainingHP: r.remainingHP ?? '-',
        Survival: r.survivalChance == null
            ? '-'
            : (r.survivalChance * 100).toFixed(1) + '%',
        BestMove: r.bestMove ?? '-',
        Score: r.score.toFixed(4),
        Rejected: r.rejected
    })));

    return results;
}

const normal = run('Normal switch');

const hazards = run('Switch with hazards', {
    conditions: {
        'Stealth Rock': 1,
        'Spikes': 3,
        'Toxic Spikes': 2
    }
});

const forced = run('Forced replacement', {
    forced: true
});

const get = (results, name) =>
    results.find(r => r.species === name);

assert.equal(
    get(normal, 'Garchomp').rejected,
    true
);

assert.ok(
    get(normal, 'Snorlax').score > 0
);

assert.ok(
    get(hazards, 'Snorlax').score <
    get(normal, 'Snorlax').score
);

assert.ok(
    get(forced, 'Snorlax').score >
    get(normal, 'Snorlax').score
);

assert.equal(
    get(forced, 'Garchomp').rejected,
    false
);

console.log('\nSWITCH VALUE TEST: PASS');
