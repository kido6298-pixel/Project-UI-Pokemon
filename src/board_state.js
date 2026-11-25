const { evaluateBoard } = require('./board_value');

function buildBoard(state, teamSize = 3) {
    const own = state.own.map(p => {
        const condition = p.condition || '';
        const hp = condition.match(/^(\d+)\/(\d+)/);

        const fainted =
            condition.includes('fnt') ||
            condition === '0' ||
            (hp && Number(hp[1]) === 0);

        if (!fainted && !hp) {
            throw new Error('Unknown own HP: ' + condition);
        }

        return {
            species: p.details.split(',')[0],
            hpRatio: fainted
                ? 0
                : Number(hp[1]) / Number(hp[2]),
            status: fainted
                ? null
                : condition.split(' ')[1] || null,
            fainted: !!fainted,
            unknown: false
        };
    });

    const enemy = Object.values(
        state.pokemon[state.opponent]
    )
        .filter(p => p.species && (p.hp || p.fainted))
        .map(p => ({
            species: p.species,
            hpRatio: p.fainted
                ? 0
                : Math.max(0, Math.min(1, p.hp.percent / 100)),
            status: p.status || null,
            fainted: !!p.fainted,
            unknown: false
        }));

    const knownCount = enemy.length;

    if (knownCount > teamSize) {
        throw new Error('Too many observed opponents');
    }

    const unknownCount = teamSize - knownCount;

    for (let i = 0; i < unknownCount; i++) {
        enemy.push({
            species: 'Unknown ' + (i + 1),
            hpRatio: 1,
            status: null,
            fainted: false,
            unknown: true
        });
    }

    return {
        own,
        enemy,
        knownCount,
        unknownCount,
        evaluation: evaluateBoard({own, enemy})
    };
}

module.exports = { buildBoard };
