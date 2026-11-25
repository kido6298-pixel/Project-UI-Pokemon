const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
    Pokemon,
    Generations
} = require('@smogon/calc');

const {
    estimateEnemyBuilds
} = require('../src/enemy_builds');

const {
    team1,
    team2
} = require('../src/realistic_test_teams');

const gen = Generations.get(4);

const data = JSON.parse(
    fs.readFileSync(
        'logs/realistic_enemy_inference.json',
        'utf8'
    )
);

const statNames = [
    'hp', 'atk', 'def', 'spa', 'spd', 'spe'
];

const actual = new Map();

for (const set of [...team1, ...team2]) {
    const pokemon = new Pokemon(
        gen,
        set.species,
        {
            level: 50,
            nature: set.nature || 'Hardy',
            evs: set.evs || {},
            ivs: set.ivs || {},
            ability: set.ability,
            item: set.item
        }
    );

    actual.set(set.species, {
        species: set.species,
        item: set.item || '',
        stats: {
            ...pokemon.rawStats,
            hp: pokemon.maxHP()
        }
    });
}

function expectedStats(builds) {
    const result = {};

    for (const stat of statNames) {
        result[stat] = builds.reduce(
            (sum, build) =>
                sum + build.probability *
                (
                    stat === 'hp'
                        ? build.maxHP
                        : build.stats[stat]
                ),
            0
        );
    }

    return result;
}

function statErrors(predicted, truth) {
    const result = {};

    for (const stat of statNames) {
        result[stat] = Math.abs(
            predicted[stat] - truth[stat]
        );
    }

    return result;
}

function meanError(errors) {
    return statNames.reduce(
        (sum, stat) => sum + errors[stat],
        0
    ) / statNames.length;
}

function bestPossibleError(builds, truth) {
    return Math.min(
        ...builds.map(build =>
            meanError(statErrors({
                ...build.stats,
                hp: build.maxHP
            }, truth))
        )
    );
}

const records = [];

for (const record of data.records) {
    const truth = actual.get(
        record.observed.species
    );

    assert.ok(truth);

    const initial = estimateEnemyBuilds(
        record.observed
    );

    const before = expectedStats(initial);
    const after = expectedStats(record.builds);

    const beforeErrors = statErrors(
        before, truth.stats
    );

    const afterErrors = statErrors(
        after, truth.stats
    );

    const beforeMAE = meanError(beforeErrors);
    const afterMAE = meanError(afterErrors);

    const best = record.builds[0];

    const bestErrors = statErrors({
        ...best.stats,
        hp: best.maxHP
    }, truth.stats);

    records.push({
        battle: record.battle,
        species: record.observed.species,
        evidence: record.evidenceCount,
        contradictions: record.contradictions,
        confidence: best.probability,
        bestBuild: best.name,
        actual: truth.stats,
        before,
        after,
        beforeErrors,
        afterErrors,
        beforeMAE,
        afterMAE,
        bestMAE: meanError(bestErrors),
        minimumMAE: bestPossibleError(
            record.builds, truth.stats
        ),
        improvement: beforeMAE - afterMAE
    });
}

function average(list, getter) {
    return list.length
        ? list.reduce(
            (sum, r) => sum + getter(r), 0
        ) / list.length
        : 0;
}

function summarize(list) {
    return {
        Count: list.length,
        Before: average(
            list, r => r.beforeMAE
        ).toFixed(3),
        After: average(
            list, r => r.afterMAE
        ).toFixed(3),
        Improvement: average(
            list, r => r.improvement
        ).toFixed(3),
        BestBuildError: average(
            list, r => r.bestMAE
        ).toFixed(3),
        MinimumError: average(
            list, r => r.minimumMAE
        ).toFixed(3)
    };
}

console.log('\n=== OVERALL ACCURACY ===');
console.table(summarize(records));

console.log('\n=== ACCURACY BY STAT ===');

console.table(statNames.map(stat => ({
    Stat: stat.toUpperCase(),
    Before: average(
        records, r => r.beforeErrors[stat]
    ).toFixed(3),
    After: average(
        records, r => r.afterErrors[stat]
    ).toFixed(3),
    Improvement: average(
        records,
        r => r.beforeErrors[stat] -
             r.afterErrors[stat]
    ).toFixed(3)
})));

console.log('\n=== ACCURACY BY SPECIES ===');

console.table(
    [...actual.keys()].map(species => ({
        Pokemon: species,
        ...summarize(
            records.filter(
                r => r.species === species
            )
        )
    }))
);

console.log('\n=== ACCURACY BY EVIDENCE COUNT ===');

console.table([
    {name:'0', min:0, max:0},
    {name:'1-2', min:1, max:2},
    {name:'3-5', min:3, max:5},
    {name:'6+', min:6, max:Infinity}
].map(group => ({
    Evidence: group.name,
    ...summarize(records.filter(r =>
        r.evidence >= group.min &&
        r.evidence <= group.max
    ))
})));

console.log('\n=== HIGH CONFIDENCE BUILDS ===');

console.table(summarize(
    records.filter(r => r.confidence >= 0.8)
));

console.log('\n=== IMPROVEMENT COUNTS ===');

console.table({
    Improved: records.filter(
        r => r.improvement > 1e-9
    ).length,
    Unchanged: records.filter(
        r => Math.abs(r.improvement) <= 1e-9
    ).length,
    Worsened: records.filter(
        r => r.improvement < -1e-9
    ).length
});

console.log('\n=== WORST INFERENCE EXAMPLES ===');

console.table(
    [...records]
        .sort((a,b) => a.improvement - b.improvement)
        .slice(0,10)
        .map(r => ({
            Battle: r.battle,
            Pokemon: r.species,
            Evidence: r.evidence,
            Build: r.bestBuild,
            Confidence: (
                r.confidence * 100
            ).toFixed(2) + '%',
            Before: r.beforeMAE.toFixed(3),
            After: r.afterMAE.toFixed(3),
            Improvement: r.improvement.toFixed(3)
        }))
);

fs.writeFileSync(
    'logs/realistic_enemy_inference_accuracy.json',
    JSON.stringify({
        summary: summarize(records),
        records
    }, null, 2)
);

assert.equal(
    records.length,
    data.stats.inferredPokemon
);

console.log('\nENEMY INFERENCE ACCURACY ANALYSIS: COMPLETE');

