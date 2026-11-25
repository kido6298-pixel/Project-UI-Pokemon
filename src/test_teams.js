function pokemon(species, ability, item, moves) {
    return {
        name: species,
        species,
        ability,
        item,
        moves,
        nature: 'Hardy',
        level: 50,
        evs: {hp: 4, atk: 252, spe: 252}
    };
}

const team1 = [
    pokemon('Garchomp', 'Sand Veil', 'Yache Berry', ['Earthquake', 'Dragon Claw']),
    pokemon('Metagross', 'Clear Body', 'Occa Berry', ['Meteor Mash', 'Earthquake']),
    pokemon('Gengar', 'Levitate', 'Focus Sash', ['Shadow Ball', 'Thunderbolt']),
    pokemon('Scizor', 'Technician', 'Life Orb', ['Bullet Punch', 'X-Scissor']),
    pokemon('Starmie', 'Natural Cure', 'Expert Belt', ['Surf', 'Ice Beam']),
    pokemon('Snorlax', 'Thick Fat', 'Leftovers', ['Body Slam', 'Crunch'])
];

const team2 = [
    pokemon('Suicune', 'Pressure', 'Leftovers', ['Ice Beam', 'Surf']),
    pokemon('Tyranitar', 'Sand Stream', 'Chople Berry', ['Crunch', 'Stone Edge']),
    pokemon('Gyarados', 'Intimidate', 'Wacan Berry', ['Waterfall', 'Ice Fang']),
    pokemon('Heatran', 'Flash Fire', 'Shuca Berry', ['Flamethrower', 'Earth Power']),
    pokemon('Zapdos', 'Pressure', 'Life Orb', ['Thunderbolt', 'Heat Wave']),
    pokemon('Breloom', 'Poison Heal', 'Toxic Orb', ['Seed Bomb', 'Mach Punch'])
];


module.exports = { team1, team2 };
