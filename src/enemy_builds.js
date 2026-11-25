const { Dex } = require('pokemon-showdown');
const { Pokemon, Generations } = require('@smogon/calc');

const dex = Dex.mod('gen4');
const gen = Generations.get(4);

function estimateEnemyBuilds(observed) {
    const species = dex.species.get(observed.species);

    if (!species.exists || species.gen > 4) {
        throw new Error('Invalid species');
    }

    const stats = species.baseStats;

    const attacks = (observed.moves || [])
        .map(name => dex.moves.get(name))
        .filter(move =>
            move.exists &&
            move.category !== 'Status'
        );

    const physicalCount = attacks.filter(
        move => move.category === 'Physical'
    ).length;

    const specialCount = attacks.filter(
        move => move.category === 'Special'
    ).length;

    const physicalWeight =
        stats.atk / (stats.atk + stats.spa) *
        (1 + physicalCount);

    const specialWeight =
        stats.spa / (stats.atk + stats.spa) *
        (1 + specialCount);

    const templates = [
        {
            name: 'Max Attack Speed',
            nature: 'Adamant',
            evs: {atk:252, spe:252, hp:4},
            weight: physicalWeight * 0.8
        },
        {
            name: 'Max Special Speed',
            nature: 'Modest',
            evs: {spa:252, spe:252, hp:4},
            weight: specialWeight * 0.8
        },
        {
            name: 'Neutral Physical',
            nature: 'Hardy',
            evs: {atk:252, spe:252, hp:4},
            weight: physicalWeight * 0.15
        },
        {
            name: 'Neutral Special',
            nature: 'Hardy',
            evs: {spa:252, spe:252, hp:4},
            weight: specialWeight * 0.15
        },
        {
            name: 'Fast Physical',
            nature: 'Jolly',
            evs: {atk:252, spe:252, hp:4},
            weight: physicalWeight
        },
        {
            name: 'Power Physical',
            nature: 'Adamant',
            evs: {atk:252, hp:252, spe:4},
            weight: physicalWeight
        },
        {
            name: 'Fast Special',
            nature: 'Timid',
            evs: {spa:252, spe:252, hp:4},
            weight: specialWeight
        },
        {
            name: 'Power Special',
            nature: 'Modest',
            evs: {spa:252, hp:252, spe:4},
            weight: specialWeight
        },
        {
            name: 'Physical Wall',
            nature: 'Bold',
            evs: {hp:252, def:252, spd:4},
            weight: stats.def / 100 * 0.6
        },
        {
            name: 'Special Wall',
            nature: 'Calm',
            evs: {hp:252, spd:252, def:4},
            weight: stats.spd / 100 * 0.6
        },
        {
            name: 'Scarf Physical',
            nature: 'Jolly',
            evs: {atk:252, spe:252, hp:4},
            item: 'Choice Scarf',
            weight: physicalWeight * 0.35
        },
        {
            name: 'Scarf Special',
            nature: 'Timid',
            evs: {spa:252, spe:252, hp:4},
            item: 'Choice Scarf',
            weight: specialWeight * 0.35
        },
        {
            name: 'Neutral',
            nature: 'Hardy',
            evs: {},
            weight: 0.3
        }
    ];

    const knownItem =
        observed.item !== null &&
        observed.item !== undefined;

    const item = knownItem
        ? dex.items.get(observed.item).name || ''
        : '';

    const hpPercent = Math.max(
        0,
        Math.min(100, observed.hp?.percent ?? 100)
    );

    const ability = observed.ability ||
        species.abilities['0'] || '';

    const candidates = [];

    for (const template of templates) {
        if (
            knownItem &&
            template.item &&
            template.item !== item
        ) {
            continue;
        }

        const config = {
            species: species.name,
            level: 50,
            nature: template.nature,
            evs: {...template.evs},
            item: knownItem
                ? item
                : template.item || '',
            ability,
            status: observed.status || '',
            boosts: {...(observed.boosts || {})}
        };

        const pokemon = new Pokemon(
            gen,
            config.species,
            config
        );

        config.curHP = Math.ceil(
            pokemon.maxHP() * hpPercent / 100
        );

        candidates.push({
            name: template.name,
            weight: template.weight,
            config,
            stats: {...pokemon.rawStats},
            maxHP: pokemon.maxHP()
        });
    }

    const total = candidates.reduce(
        (sum, candidate) => sum + candidate.weight,
        0
    );

    return candidates
        .map(candidate => ({
            ...candidate,
            probability: candidate.weight / total
        }))
        .sort(
            (a, b) => b.probability - a.probability
        );
}

function estimateEnemyBuildsWithAbilities(observed) {
    const species = dex.species.get(observed.species);

    if (!species.exists) {
        return estimateEnemyBuilds(observed);
    }

    const abilities = observed.ability
        ? [observed.ability]
        : [...new Set(
            Object.values(species.abilities)
                .filter(name => {
                    const ability = dex.abilities.get(name);

                    return ability.exists &&
                        ability.gen <= 4 &&
                        !ability.isNonstandard;
                })
        )];

    if (abilities.length <= 1) {
        return estimateEnemyBuilds(observed);
    }

    const candidates = [];

    for (const ability of abilities) {
        const builds = estimateEnemyBuilds({
            ...observed,
            ability
        });

        for (const build of builds) {
            candidates.push({
                ...build,
                name: build.name + ' / ' + ability,
                weight: build.weight / abilities.length,
                probability:
                    build.probability / abilities.length
            });
        }
    }

    const total = candidates.reduce(
        (sum, build) => sum + build.probability,
        0
    );

    return candidates.map(build => ({
        ...build,
        probability: build.probability / total
    })).sort(
        (a, b) => b.probability - a.probability
    );
}

module.exports = {
    estimateEnemyBuilds: estimateEnemyBuildsWithAbilities
};


