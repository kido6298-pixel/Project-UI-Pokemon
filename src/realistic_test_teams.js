const {
    team1,
    team2
} = require('./test_teams');

const builds = {
    Garchomp: {
        nature: 'Jolly',
        evs: {atk:252, spe:252, hp:4}
    },
    Metagross: {
        nature: 'Adamant',
        evs: {hp:252, atk:252, spe:4}
    },
    Gengar: {
        nature: 'Timid',
        evs: {spa:252, spe:252, hp:4}
    },
    Scizor: {
        nature: 'Adamant',
        evs: {hp:252, atk:252, spd:4}
    },
    Starmie: {
        nature: 'Timid',
        evs: {spa:252, spe:252, hp:4}
    },
    Snorlax: {
        nature: 'Careful',
        evs: {hp:252, spd:252, def:4}
    },
    Suicune: {
        nature: 'Bold',
        evs: {hp:252, def:252, spd:4}
    },
    Tyranitar: {
        nature: 'Adamant',
        evs: {hp:252, atk:252, spe:4}
    },
    Gyarados: {
        nature: 'Jolly',
        evs: {atk:252, spe:252, hp:4}
    },
    Heatran: {
        nature: 'Modest',
        evs: {spa:252, spe:252, hp:4}
    },
    Zapdos: {
        nature: 'Timid',
        evs: {spa:252, spe:252, hp:4}
    },
    Breloom: {
        nature: 'Adamant',
        evs: {atk:252, spe:252, hp:4}
    }
};

function configure(team) {
    return team.map(set => {
        const build = builds[set.species];

        if (!build) {
            throw new Error(
                'Missing build: ' + set.species
            );
        }

        return {
            ...structuredClone(set),
            ...structuredClone(build)
        };
    });
}

module.exports = {
    team1: configure(team1),
    team2: configure(team2)
};
