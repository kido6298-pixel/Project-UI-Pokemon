function displayHP(hp, maxHP) {
    if (!Number.isInteger(maxHP) || maxHP <= 0) {
        throw new Error('Invalid maximum HP');
    }

    if (!Number.isInteger(hp) || hp < 0 || hp > maxHP) {
        throw new Error('Invalid current HP');
    }

    if (hp === 0) return 0;
    if (hp === maxHP) return 100;

    return Math.min(
        99,
        Math.ceil(100 * hp / maxHP)
    );
}

function possibleHP(displayed, maxHP) {
    if (
        !Number.isInteger(displayed) ||
        displayed < 0 ||
        displayed > 100
    ) {
        throw new Error('Invalid displayed HP');
    }

    if (!Number.isInteger(maxHP) || maxHP <= 0) {
        throw new Error('Invalid maximum HP');
    }

    const values = [];

    for (let hp = 0; hp <= maxHP; hp++) {
        if (displayHP(hp, maxHP) === displayed) {
            values.push(hp);
        }
    }

    return values;
}

function possibleDamage({
    before,
    after,
    maxHP
}) {
    const beforeValues = possibleHP(before, maxHP);
    const afterValues = possibleHP(after, maxHP);

    const damages = new Set();

    for (const start of beforeValues) {
        for (const end of afterValues) {
            if (start > end) {
                damages.add(start - end);
            }
        }
    }

    return [...damages].sort((a, b) => a - b);
}

function matchDamageRolls({
    before,
    after,
    maxHP,
    rolls
}) {
    if (!Array.isArray(rolls) || !rolls.length) {
        throw new Error('Missing damage rolls');
    }

    if (rolls.some(d => !Number.isInteger(d) || d < 0)) {
        throw new Error('Invalid damage roll');
    }

    const starts = possibleHP(before, maxHP);

    let matches = 0;
    let trials = 0;

    for (const hp of starts) {
        for (const damage of rolls) {
            const remaining = Math.max(0, hp - damage);

            trials++;

            if (displayHP(remaining, maxHP) === after) {
                matches++;
            }
        }
    }

    return {
        maxHP,
        before,
        after,
        possibleStartHP: starts,
        possibleEndHP: possibleHP(after, maxHP),
        matches,
        trials,
        likelihood: trials ? matches / trials : 0
    };
}

module.exports = {
    displayHP,
    possibleHP,
    possibleDamage,
    matchDamageRolls
};
