const { BattleStream, getPlayerStreams, Teams } = require('pokemon-showdown');

async function main() {
    const streams = getPlayerStreams(new BattleStream());

    const team1 = Teams.pack([{
        name: 'Garchomp',
        species: 'Garchomp',
        ability: 'Sand Veil',
        item: 'Yache Berry',
        moves: ['Earthquake'],
        nature: 'Jolly',
        evs: {atk: 252, spe: 252, hp: 4},
        level: 50
    }]);

    const team2 = Teams.pack([{
        name: 'Suicune',
        species: 'Suicune',
        ability: 'Pressure',
        item: 'Leftovers',
        moves: ['Ice Beam'],
        nature: 'Bold',
        evs: {hp: 252, def: 252, spa: 4},
        level: 50
    }]);

    async function player(stream) {
        for await (const chunk of stream) {
            for (const line of chunk.split('\n')) {
                if (!line.startsWith('|request|')) continue;

                const raw = line.slice(9);
                if (!raw || raw === 'null') continue;

                const request = JSON.parse(raw);
                if (request.wait) continue;

                if (request.teamPreview) {
                    await stream.write('team 1');
                } else if (request.active) {
                    await stream.write('move 1');
                }
            }
        }
    }

    const players = Promise.all([
        player(streams.p1),
        player(streams.p2)
    ]);

    const output = (async () => {
        for await (const chunk of streams.omniscient) {
            console.log(chunk);
        }
    })();

    await streams.omniscient.write(
        '>start ' + JSON.stringify({formatid: 'gen4customgame'}) + '\n' +
        '>player p1 ' + JSON.stringify({name: 'Garchomp AI', team: team1}) + '\n' +
        '>player p2 ' + JSON.stringify({name: 'Suicune AI', team: team2})
    );

    await Promise.all([players, output]);
    console.log('BATTLE TEST COMPLETE');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
