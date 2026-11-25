const { predictDamage } = require('./damage');

function updateBuildsFromDamage({
    builds,
    own,
    enemyMove,
    observedDamage,
    field = {},
    moveOptions = {},
    tolerance = 0,
    reliability = 0.95
}) {
    if (!builds?.length) {
        throw new Error('No enemy builds');
    }

    if (!Number.isInteger(observedDamage) ||
        observedDamage <= 0) {
        throw new Error('Invalid observed damage');
    }

    if (!(reliability >= 0 && reliability < 1)) {
        throw new Error('Invalid reliability');
    }

    if (!Number.isInteger(tolerance) || tolerance < 0) {
        throw new Error('Invalid tolerance');
    }

    const updated = builds.map(build => {
        const prediction = predictDamage({
            attacker: build.config,
            defender: own,
            move: enemyMove,
            field,
            moveOptions
        });

        if (!prediction.rolls?.length) {
            throw new Error('Unsupported damage distribution');
        }

        const matches = prediction.rolls.filter(
            damage => Math.abs(
                damage - observedDamage
            ) <= tolerance
        ).length;

        const matchRate =
            matches / prediction.rolls.length;

        const likelihood =
            reliability * matchRate +
            (1 - reliability) / 16;

        return {
            ...build,
            previousProbability: build.probability,
            probability:
                build.probability * likelihood,
            predictedMin: prediction.min,
            predictedMax: prediction.max,
            matches,
            matchRate,
            likelihood
        };
    });

    const evidence = updated.reduce(
        (sum, build) => sum + build.probability,
        0
    );

    if (evidence <= 0) {
        throw new Error('Invalid evidence');
    }

    const contradiction = updated.every(
        build => build.matches === 0
    );

    return {
        contradiction,
        evidence,
        observedDamage,
        enemyMove,
        builds: updated.map(build => ({
            ...build,
            probability: build.probability / evidence
        })).sort(
            (a, b) => b.probability - a.probability
        )
    };
}

module.exports = { updateBuildsFromDamage };
