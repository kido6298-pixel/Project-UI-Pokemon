function getActions(request) {
    if (!request || request.wait) return [];

    const pokemon = request.side.pokemon;

    if (request.teamPreview) {
        const actions = [];

        for (let a = 1; a <= pokemon.length; a++) {
            for (let b = 1; b <= pokemon.length; b++) {
                for (let c = 1; c <= pokemon.length; c++) {
                    if (a !== b && b !== c && a !== c) {
                        actions.push(`team ${a}${b}${c}`);
                    }
                }
            }
        }

        return actions;
    }

    const switches = pokemon
        .map((p, i) => ({p, i}))
        .filter(({p}) =>
            !p.active &&
            !p.condition.endsWith(' fnt') &&
            p.condition !== '0'
        )
        .map(({i}) => `switch ${i + 1}`);

    if (request.forceSwitch?.some(Boolean)) {
        return switches;
    }

    if (!request.active?.[0]) return [];

    const active = request.active[0];

    const moves = active.moves
        .map((m, i) => ({m, i}))
        .filter(({m}) =>
            !m.disabled &&
            (m.pp === undefined || m.pp > 0)
        )
        .map(({i}) => `move ${i + 1}`);

    if (active.trapped || active.maybeTrapped) {
        return moves;
    }

    return [...moves, ...switches];
}

module.exports = { getActions };
