const { predictOrder } = require('./speed');

function updateBuildsFromOrder({
    builds,
    own,
    ownPriority = 0,
    enemyPriority = 0,
    ownFirst,
    trickRoom = false,
    reliability = 0.98
}) {
    if (!builds?.length) {
        throw new Error('No enemy builds');
    }

    if (typeof ownFirst !== 'boolean') {
        throw new Error('Invalid observed order');
    }

    if (!(reliability >= 0.5 &&
          reliability <= 1)) {
        throw new Error('Invalid reliability');
    }

    const updated = builds.map(build => {
        const order = predictOrder({
            attacker: own,
            defender: build.config,
            attackerPriority: ownPriority,
            defenderPriority: enemyPriority,
            trickRoom
        });

        const predicted = ownFirst
            ? order.firstChance
            : 1 - order.firstChance;

        const likelihood =
            predicted * reliability +
            (1 - predicted) * (1 - reliability);

        return {
            ...build,
            previousProbability: build.probability,
            probability:
                build.probability * likelihood,
            likelihood,
            predictedOwnFirst: order.firstChance,
            ownSpeed: order.attackerSpeed,
            enemySpeed: order.defenderSpeed
        };
    });

    const evidence = updated.reduce(
        (sum, b) => sum + b.probability, 0
    );

    if (evidence <= 0) {
        return {
            contradiction: true,
            evidence,
            builds
        };
    }

    return {
        contradiction: false,
        evidence,
        builds: updated.map(build => ({
            ...build,
            probability:
                build.probability / evidence
        })).sort(
            (a, b) =>
                b.probability - a.probability
        )
    };
}

module.exports = { updateBuildsFromOrder };
