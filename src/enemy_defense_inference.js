const { predictDamage } = require('./damage');
const {
    possibleHP,
    matchDamageRolls
} = require('./hp_inference');

function updateBuildsFromDealtDamage({
    builds,
    own,
    ownMove,
    before,
    after,
    field = {},
    moveOptions = {},
    reliability = 0.95
}) {
    if (!builds?.length) {
        throw new Error('No enemy builds');
    }

    if (
        !Number.isInteger(before) ||
        !Number.isInteger(after) ||
        before > 100 ||
        after <= 0 ||
        before <= after
    ) {
        throw new Error('Invalid HP observation');
    }

    if (!(reliability >= 0 && reliability < 1)) {
        throw new Error('Invalid reliability');
    }

    const updated = builds.map(build => {
        const starts = possibleHP(
            before,
            build.maxHP
        );

        let matchRate = 0;
        let predictedMin = Infinity;
        let predictedMax = 0;

        for (const hp of starts) {
            const prediction = predictDamage({
                attacker: own,
                defender: {
                    ...build.config,
                    curHP: hp
                },
                move: ownMove,
                field,
                moveOptions
            });

            if (!prediction.rolls?.length) {
                throw new Error(
                    'Unsupported damage distribution'
                );
            }

            predictedMin = Math.min(
                predictedMin,
                prediction.min
            );

            predictedMax = Math.max(
                predictedMax,
                prediction.max
            );

            const remainingMatches =
                prediction.rolls.filter(damage => {
                    const remaining = Math.max(
                        0,
                        hp - damage
                    );

                    const displayed = remaining === 0
                        ? 0
                        : remaining === build.maxHP
                            ? 100
                            : Math.min(
                                99,
                                Math.ceil(
                                    100 * remaining /
                                    build.maxHP
                                )
                            );

                    return displayed === after;
                }).length;

            matchRate +=
                remainingMatches /
                prediction.rolls.length /
                starts.length;
        }

        const likelihood =
            reliability * matchRate +
            (1 - reliability) / 100;

        return {
            ...build,
            previousProbability: build.probability,
            probability:
                build.probability * likelihood,
            predictedMin: Number.isFinite(predictedMin)
                ? predictedMin
                : null,
            predictedMax,
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
        build => build.matchRate === 0
    );

    return {
        contradiction,
        evidence,
        ownMove,
        before,
        after,
        builds: contradiction
            ? structuredClone(builds)
            : updated.map(build => ({
                ...build,
                probability:
                    build.probability / evidence
            })).sort(
                (a, b) => b.probability - a.probability
            )
    };
}

module.exports = {
    updateBuildsFromDealtDamage
};
