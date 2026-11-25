const { mergeBuilds } = require('./enemy_build_selection');

function selectPosteriorBuilds(
    builds,
    {
        limit = 5,
        targetCoverage = 0.95
    } = {}
) {
    if (!Array.isArray(builds) || !builds.length) {
        throw new Error('No posterior builds');
    }

    if (!Number.isInteger(limit) || limit < 1) {
        throw new Error('Invalid build limit');
    }

    if (!(targetCoverage > 0 && targetCoverage <= 1)) {
        throw new Error('Invalid target coverage');
    }

    for (const build of builds) {
        if (
            !Number.isFinite(build.probability) ||
            build.probability < 0
        ) {
            throw new Error('Invalid probability');
        }
    }

    const total = builds.reduce(
        (sum, build) => sum + build.probability,
        0
    );

    if (!Number.isFinite(total) || total <= 0) {
        throw new Error('Invalid total probability');
    }

    const normalized = builds
        .filter(build => build.probability > 0)
        .map(build => ({
            ...structuredClone(build),
            probability: build.probability / total
        }));

    const merged = mergeBuilds(normalized);

    const selected = [];

    let coverage = 0;

    for (const build of merged) {
        if (selected.length >= limit) break;

        selected.push(build);
        coverage += build.probability;

        if (coverage + 1e-12 >= targetCoverage) {
            break;
        }
    }

    return {
        species: merged[0].config.species,
        originalCount: builds.length,
        mergedCount: merged.length,
        selectedCount: selected.length,
        coverage,
        omittedProbability: Math.max(0, 1 - coverage),
        targetReached: coverage + 1e-12 >= targetCoverage,
        builds: selected.map(build => ({
            ...build,
            originalProbability: build.probability,
            probability: build.probability / coverage
        }))
    };
}

module.exports = {
    selectPosteriorBuilds
};
