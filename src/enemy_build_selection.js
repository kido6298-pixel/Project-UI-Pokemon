const {
    estimateEnemyBuilds
} = require('./enemy_builds');

function mergeBuilds(builds) {
    const merged = new Map();

    for (const build of builds) {
        const key = JSON.stringify([
            build.config.species,
            build.config.level,
            build.stats,
            build.maxHP,
            build.config.curHP,
            build.config.item,
            build.config.ability,
            build.config.status,
            build.config.boosts
        ]);

        if (merged.has(key)) {
            const existing = merged.get(key);

            existing.probability += build.probability;
            existing.weight += build.weight;
            existing.names.push(build.name);
        } else {
            merged.set(key, {
                ...build,
                names: [build.name]
            });
        }
    }

    return [...merged.values()].sort(
        (a, b) => b.probability - a.probability
    );
}

function selectEnemyBuilds(observed, limit = 5) {
    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error('Invalid build limit');
    }

    const original = estimateEnemyBuilds(observed);
    const merged = mergeBuilds(original);
    const selected = [];

    function add(build) {
        if (
            build &&
            !selected.includes(build) &&
            selected.length < limit
        ) {
            selected.push(build);
        }
    }

    add(merged[0]);

    const physicalWall = [...merged].sort(
        (a, b) =>
            b.maxHP * b.stats.def -
            a.maxHP * a.stats.def
    )[0];

    const specialWall = [...merged].sort(
        (a, b) =>
            b.maxHP * b.stats.spd -
            a.maxHP * a.stats.spd
    )[0];

    const scarf = merged.find(
        build => build.config.item === 'Choice Scarf'
    );

    add(physicalWall);
    add(specialWall);
    add(scarf);

    for (const build of merged) {
        add(build);
    }

    const coverage = selected.reduce(
        (sum, build) => sum + build.probability,
        0
    );

    return {
        species: observed.species,
        originalCount: original.length,
        mergedCount: merged.length,
        selectedCount: selected.length,
        coverage,
        builds: selected.map(build => ({
            ...build,
            originalProbability: build.probability,
            probability: build.probability / coverage
        })).sort(
            (a, b) => b.probability - a.probability
        )
    };
}

module.exports = {
    mergeBuilds,
    selectEnemyBuilds
};
