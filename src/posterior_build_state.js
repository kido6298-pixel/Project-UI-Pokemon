const { possibleHP } = require('./hp_inference');

function refreshPosteriorBuilds(builds, observed) {
    if (!Array.isArray(builds) || !builds.length) {
        throw new Error('No posterior builds');
    }

    const hp = observed.hp;

    const percent = hp?.max === 100
        ? hp.current
        : hp?.percent;

    if (
        !Number.isInteger(percent) ||
        percent < 0 ||
        percent > 100
    ) {
        throw new Error('Invalid observed HP');
    }

    return builds.map(source => {
        const build = structuredClone(source);

        const candidates = possibleHP(
            percent,
            build.maxHP
        );

        if (!candidates.length) {
            throw new Error('Impossible HP observation');
        }

        const currentHP =
            candidates[Math.floor(candidates.length / 2)];

        build.config.curHP = currentHP;

        build.config.status = observed.status || '';

        build.config.boosts = {
            ...(observed.boosts || {})
        };

        if (observed.item != null) {
            build.config.item = observed.item;
        }

        if (observed.ability) {
            build.config.ability = observed.ability;
        }

        build.hpRange = {
            min: candidates[0],
            max: candidates.at(-1),
            estimated: currentHP
        };

        return build;
    });
}

module.exports = {
    refreshPosteriorBuilds
};

