const {
    evaluateAdaptiveAction
} = require('./adaptive_prediction_cached');

function aggregateBuildScores(
    results,
    buildRiskWeight = 0.25
) {
    if (!results.length) {
        throw new Error('No build results');
    }

    if (!(buildRiskWeight >= 0 &&
          buildRiskWeight <= 1)) {
        throw new Error('Invalid build risk weight');
    }

    for (const result of results) {
        if (!Number.isFinite(result.score) ||
            !Number.isFinite(result.probability) ||
            result.probability < 0) {
            throw new Error('Invalid build result');
        }
    }

    const totalWeight = results.reduce(
        (sum, r) => sum + r.probability, 0
    );

    if (totalWeight <= 0) {
        throw new Error('Invalid total weight');
    }

    const active = results.filter(
        r => r.probability > 0
    );

    const average = active.reduce(
        (sum, r) =>
            sum + r.score *
            r.probability / totalWeight,
        0
    );

    const worst = active.reduce(
        (a, b) => a.score <= b.score ? a : b
    );

    const best = active.reduce(
        (a, b) => a.score >= b.score ? a : b
    );

    const variance = active.reduce(
        (sum, r) =>
            sum +
            (r.score - average) ** 2 *
            r.probability / totalWeight,
        0
    );

    return {
        average,
        worst: worst.score,
        best: best.score,
        worstBuild: worst.name,
        bestBuild: best.name,
        deviation: Math.sqrt(variance),
        score:
            average * (1 - buildRiskWeight) +
            worst.score * buildRiskWeight
    };
}

function evaluateMultiBuildAction({
    builds,
    buildRiskWeight = 0.25,
    ...options
}) {
    if (!builds?.length) {
        throw new Error('No enemy builds');
    }

    const results = [];

    let evaluations = 0;

    for (const build of builds) {
        if (build.probability === 0) continue;

        const result = evaluateAdaptiveAction({
            ...options,
            enemy: build.config
        });

        evaluations += result.evaluations;

        results.push({
            name: build.name,
            probability: build.probability,
            score: result.score,
            average: result.average,
            worst: result.worst,
            best: result.best
        });
    }

    return {
        action: options.candidate
            ? 'Switch to ' + options.candidate.species
            : options.ownMove,

        ...aggregateBuildScores(
            results,
            buildRiskWeight
        ),

        buildRiskWeight,
        buildCount: results.length,
        evaluations,
        results
    };
}

module.exports = {
    aggregateBuildScores,
    evaluateMultiBuildAction
};

