const { BattleStream, getPlayerStreams, Teams, Dex } = require('pokemon-showdown');

const formatId = Dex.formats.validate(
    'gen4customgame@@@Team Preview,Min Team Size = 6,!! Max Team Size = 6,Picked Team Size = 3,!! Max Level = 50,!! Default Level = 50'
);

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

async function main() {
    const streams = getPlayerStreams(new BattleStream());
    const log = [];
    let winner = null;
    let turns = 0;
    let switches = 0;

    async function player(stream, name, selection) {
        for await (const chunk of stream) {
            for (const line of chunk.split('\n')) {
                if (line.startsWith('|error|')) {
                    throw new Error(name + ': ' + line);
                }

                if (!line.startsWith('|request|')) continue;

                const raw = line.slice(9);
                if (!raw || raw === 'null') continue;

                const req = JSON.parse(raw);
                if (req.wait) continue;

                if (req.teamPreview) {
                    console.log(name + ' SELECT: ' + selection);
                    await stream.write('team ' + selection);
                    continue;
                }

                if (req.forceSwitch && req.forceSwitch.some(Boolean)) {
                    const index = req.side.pokemon.findIndex(
                        p => !p.active && !p.condition.endsWith(' fnt')
                    );

                    if (index < 0) {
                        throw new Error('No legal switch available');
                    }

                    await stream.write('switch ' + (index + 1));
                    continue;
                }

                if (req.active) {
                    const moves = req.active[0].moves;
                    const index = moves.findIndex(
                        m => !m.disabled && m.pp > 0
                    );

                    await stream.write(
                        'move ' + (index >= 0 ? index + 1 : 1)
                    );
                }
            }
        }
    }

    const players = Promise.all([
        player(streams.p1, 'AI-1', '123'),
        player(streams.p2, 'AI-2', '123')
    ]);

    const output = (async () => {
        for await (const chunk of streams.omniscient) {
            log.push(chunk);
            console.log(chunk);

            for (const line of chunk.split('\n')) {
                if (line.startsWith('|turn|')) {
                    turns = Number(line.split('|')[2]);
                }

                if (line.startsWith('|switch|')) {
                    switches++;
                }

                if (line.startsWith('|win|')) {
                    winner = line.split('|')[2];
                }

                if (line.startsWith('|tie|')) {
                    winner = 'DRAW';
                }
            }
        }
    })();

    await streams.omniscient.write(
        '>start ' + JSON.stringify({formatid: formatId}) + '\n' +
        '>player p1 ' + JSON.stringify({
            name: 'AI-1', team: Teams.pack(team1)
        }) + '\n' +
        '>player p2 ' + JSON.stringify({
            name: 'AI-2', team: Teams.pack(team2)
        })
    );

    await Promise.all([players, output]);

    const fs = require('node:fs');
    fs.mkdirSync('logs', {recursive: true});
    fs.writeFileSync('logs/battle_63_test.log', log.join('\n'));

    console.log('\n=== RESULT ===');
    console.log('Winner:', winner);
    console.log('Turns:', turns);
    console.log('Switch events:', switches);
    console.log('Log: logs/battle_63_test.log');

    if (!winner) throw new Error('Battle did not finish');

    console.log('BATTLE 63 TEST: PASS');
}

const timeout = setTimeout(() => {
    console.error('BATTLE TEST: TIMEOUT');
    process.exit(1);
}, 30000);

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
}).finally(() => clearTimeout(timeout));
