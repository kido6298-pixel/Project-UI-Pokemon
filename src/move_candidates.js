const { Dex } = require('pokemon-showdown');

const dex = Dex.mod('gen4');
const cache = new Map();

const complexMoves = new Set([
    'dreameater',
    'explosion',
    'selfdestruct',
    'focuspunch',
    'hyperbeam',
    'gigaimpact',
    'blastburn',
    'hydrocannon',
    'frenzyplant',
    'rockwrecker',
    'roaroftime',
    'solarbeam',
    'skyattack',
    'bounce',
    'fly',
    'dig',
    'dive',
    'razorwind',
    'skullbash',
    'shadowforce',
    'eruption',
    'waterspout',
    'lastresort',
    'suckerpunch',
    'fakeout',
    'naturalgift',
    'fling',
    'spitup',
    'snore',
    'trumpcard',
    'counter',
    'mirrorcoat',
    'metalburst',
    'endeavor',
    'present'
]);

function isSimpleAttack(move) {
    return move.exists &&
        move.gen <= 4 &&
        move.category !== 'Status' &&
        move.basePower > 0 &&
        !move.multihit &&
        !move.basePowerCallback &&
        !move.damageCallback &&
        !move.flags?.charge &&
        !move.flags?.recharge &&
        !complexMoves.has(move.id);
}

async function getAttackCandidates(speciesName, knownMoves = [], limit = 6) {
    const species = dex.species.get(speciesName);

    if (!species.exists || species.gen > 4) {
        throw new Error('Unknown Gen 4 species: ' + speciesName);
    }

    const known = [...new Set(
        knownMoves.map(name => dex.moves.get(name).id)
    )];

    const knownAttacks = known
        .map(id => dex.moves.get(id))
        .filter(move =>
            move.exists &&
            move.gen <= 4 &&
            move.category !== 'Status'
        )
        .map(move => move.name);

    if (known.length >= 4) {
        return knownAttacks;
    }

    if (!cache.has(species.id)) {
        const learnsets = await dex.species.getFullLearnset(
            species.id
        );

        const candidates = new Map();

        for (const entry of learnsets) {
            for (const [id, sources] of Object.entries(
                entry.learnset || {}
            )) {
                if (!Array.isArray(sources)) continue;

                const available = sources.some(source => {
                    const generation = Number(source[0]);
                    return generation >= 1 && generation <= 4;
                });

                if (!available) continue;

                const move = dex.moves.get(id);

                if (!isSimpleAttack(move)) {
                    continue;
                }

                const stab = species.types.includes(move.type)
                    ? 1.5
                    : 1;

                const attackStat = move.category === 'Physical'
                    ? species.baseStats.atk
                    : species.baseStats.spa;

                const accuracy = move.accuracy === true
                    ? 1
                    : move.accuracy / 100;

                const abilities =
                    Object.values(species.abilities || {});

                const technician =
                    abilities.includes('Technician') &&
                    move.basePower <= 60
                        ? 1.5
                        : 1;

                const priority =
                    move.priority > 0 ? 1.8 : 1;

                const drawback =
                    move.recoil || move.self?.boosts
                        ? 0.85
                        : 1;

                const score =
                    move.basePower *
                    stab *
                    accuracy *
                    attackStat *
                    technician *
                    priority *
                    drawback;

                candidates.set(move.id, {
                    id: move.id,
                    name: move.name,
                    type: move.type,
                    score
                });
            }
        }

        cache.set(
            species.id,
            [...candidates.values()]
                .sort((a, b) => b.score - a.score)
        );
    }

    const result = [...knownAttacks];

    const coveredTypes = new Set(
        result.map(name => dex.moves.get(name).type)
    );

    const ranked = cache.get(species.id);

    for (const move of ranked) {
        if (result.length >= limit) break;

        if (known.includes(move.id) ||
            coveredTypes.has(move.type)) {
            continue;
        }

        result.push(move.name);
        coveredTypes.add(move.type);
    }

    for (const move of ranked) {
        if (result.length >= limit) break;

        if (!known.includes(move.id) &&
            !result.includes(move.name)) {
            result.push(move.name);
        }
    }

    return result;
}

module.exports = { getAttackCandidates, isSimpleAttack };

