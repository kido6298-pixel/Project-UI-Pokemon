const {
    BattleStream,
    getPlayerStreams,
    Teams,
    Dex
} = require('pokemon-showdown');

const FORMAT = Dex.formats.validate(
    'gen4customgame@@@HP Percentage Mod,Team Preview,Min Team Size = 6,!! Max Team Size = 6,Picked Team Size = 3,!! Max Level = 50,!! Default Level = 50'
);




async function simulate({
    team1,
    team2,
    agent1,
    agent2,
    seed,
    maxTurns = 300,
    timeoutMs = 30000
}) {
    const battle = new BattleStream();
    const streams = getPlayerStreams(battle);
    const log = [];
    const decisions = [];

    let winner = null;
    let turns = 0;
    let switchEvents = 0;
    let limited = false;
    let timer;

    async function player(stream, agent, name) {
        for await (const chunk of stream) {
            for (const line of chunk.split('\n')) {
                if (line.startsWith('|error|')) {
                    throw new Error(name + ': ' + line);
                }

                if (!line.startsWith('|request|')) {
                    if (typeof agent.observe === 'function') {
                        await agent.observe(line);
                    }
                    continue;
                }

                const raw = line.slice(9);
                if (!raw || raw === 'null') continue;

                const request = JSON.parse(raw);
                if (request.wait || limited) continue;

                const action = await agent.choose(request);

                decisions.push({
                    player: name,
                    turn: turns,
                    action
                });

                await stream.write(action);
            }
        }
    }

    const output = (async () => {
        for await (const chunk of streams.omniscient) {
            log.push(chunk);

            for (const line of chunk.split('\n')) {
                if (line.startsWith('|turn|')) {
                    turns = Number(line.split('|')[2]);

                    if (turns >= maxTurns && !limited) {
                        limited = true;
                        await streams.omniscient.write('>forcetie');
                    }
                }

                if (line.startsWith('|switch|')) {
                    switchEvents++;
                }

                if (line.startsWith('|win|')) {
                    winner = line.split('|')[2];
                }

                if (line === '|tie' || line.startsWith('|tie|')) {
                    winner = 'DRAW';
                }
            }
        }
    })();

    const tasks = Promise.all([
        player(streams.p1, agent1, 'AI-1'),
        player(streams.p2, agent2, 'AI-2'),
        output
    ]);

    const run = (async () => {
        const options = {formatid: FORMAT};
        if (seed) options.seed = seed;

        await streams.omniscient.write(
            '>start ' + JSON.stringify(options)
        );

        if (!battle.battle) {
            throw new Error('Battle instance unavailable');
        }

        battle.battle.reportExactHP = false;
        battle.battle.reportPercentages = true;

        await streams.omniscient.write(
            '>player p1 ' + JSON.stringify({
                name: 'AI-1',
                team: Teams.pack(team1)
            }) + '\n' +
            '>player p2 ' + JSON.stringify({
                name: 'AI-2',
                team: Teams.pack(team2)
            })
        );

        await tasks;

        if (!winner) {
            const error = new Error('Battle ended without a result');
            error.battleLog = log.join('\n');
            error.decisions = decisions;
            throw error;
        }

        return {
            winner,
            turns,
            switchEvents,
            limited,
            decisions,
            log: log.join('\n')
        };
    })();

    try {
        return await Promise.race([
            run,
            new Promise((_, reject) => {
                timer = setTimeout(
                    () => reject(new Error('Battle timeout')),
                    timeoutMs
                );
            })
        ]);
    } finally {
        clearTimeout(timer);
        if (!winner) {
            try {
                battle.destroy();
            } catch (cleanupError) {
                console.error('Cleanup:', cleanupError.message);
            }
        }
    }
}

module.exports = { simulate };






