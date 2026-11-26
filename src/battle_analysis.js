const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const {
    hash
} = require('./battle_result_store');

function createStats() {
    return {
        battles:0,
        wins:0,
        losses:0,
        draws:0,
        turns:0,
        decisions:0,
        attacks:0,
        switches:0,
        searchDecisions:0,
        posteriorUses:0,
        priorUses:0,
        coverageSum:0,
        coverageSamples:0,
        scoreSum:0,
        scoreSamples:0,
        evaluations:0,
        fallbacks:0,
        searchErrors:0,
        inferenceErrors:0,
        enemies:Object.create(null),
        actions:Object.create(null)
    };
}

function increment(object,key) {
    object[key] = (object[key] ?? 0)+1;
}

function ratio(a,b) {
    return b ? a/b : null;
}

function finalize(stats) {
    return {
        ...stats,
        winRate:ratio(stats.wins,stats.battles),
        scoreRate:ratio(
            stats.wins+stats.draws*0.5,
            stats.battles
        ),
        averageTurns:ratio(stats.turns,stats.battles),
        switchRate:ratio(
            stats.switches,
            stats.attacks+stats.switches
        ),
        posteriorRate:ratio(
            stats.posteriorUses,
            stats.posteriorUses+stats.priorUses
        ),
        averageCoverage:ratio(
            stats.coverageSum,
            stats.coverageSamples
        ),
        averageDecisionScore:ratio(
            stats.scoreSum,
            stats.scoreSamples
        )
    };
}

async function analyzeBatch(directory) {
    const manifest = JSON.parse(
        fs.readFileSync(
            path.join(directory,'manifest.json'),
            'utf8'
        )
    );

    const agents = Object.create(null);
    const matchups = Object.create(null);
    const ids = new Set();

    let battles = 0;
    let draws = 0;
    let turns = 0;
    let limited = 0;

    const input = fs.createReadStream(
        path.join(directory,'results.jsonl'),
        {encoding:'utf8'}
    );

    const lines = readline.createInterface({
        input,
        crlfDelay:Infinity
    });

    for await (const line of lines) {
        const record = JSON.parse(line);
        const r = record.result;

        if (
            record.schemaVersion !== 1 ||
            !r ||
            r.id !== record.id ||
            hash(r) !== record.resultHash ||
            ids.has(r.id) ||
            !['AI-1','AI-2','DRAW'].includes(r.winner)
        ) {
            throw new Error('Invalid battle record');
        }

        ids.add(r.id);

        battles++;
        turns += r.turns;
        draws += Number(r.winner === 'DRAW');
        limited += Number(r.limited);

        for (const side of ['p1','p2']) {
            const other = side === 'p1' ? 'p2' : 'p1';
            const player = side === 'p1' ? 'AI-1' : 'AI-2';

            const agent = r.agents[side];
            const opponent = r.agents[other];

            const stats = agents[agent.type] ??=
                createStats();

            const won = r.winner === player;
            const draw = r.winner === 'DRAW';

            stats.battles++;
            stats.wins += Number(won);
            stats.draws += Number(draw);
            stats.losses += Number(!won && !draw);
            stats.turns += r.turns;

            for (const key of [
                'posteriorUses',
                'priorUses',
                'evaluations',
                'fallbacks',
                'searchErrors',
                'inferenceErrors'
            ]) {
                stats[key] += agent[key] ?? 0;
            }

            stats.searchDecisions += agent.decisions ?? 0;

            const matchupKey =
                agent.type+' vs '+opponent.type;

            const matchup = matchups[matchupKey] ??= {
                battles:0,
                wins:0,
                losses:0,
                draws:0
            };

            matchup.battles++;
            matchup.wins += Number(won);
            matchup.losses += Number(!won && !draw);
            matchup.draws += Number(draw);

            for (const decision of r.decisions ?? []) {
                if (decision.player === player) {
                    stats.decisions++;
                }
            }

            for (const entry of r.history?.[side] ?? []) {
                const chosen = entry.chosen;

                if (!chosen) continue;

                if (chosen.type === 'attack') {
                    stats.attacks++;
                }

                if (chosen.type === 'switch') {
                    stats.switches++;
                }

                if (Number.isFinite(entry.coverage)) {
                    stats.coverageSum += entry.coverage;
                    stats.coverageSamples++;
                }

                if (Number.isFinite(chosen.score)) {
                    stats.scoreSum += chosen.score;
                    stats.scoreSamples++;
                }

                increment(
                    stats.actions,
                    chosen.type+':'+chosen.name
                );

                if (entry.enemy) {
                    const enemy =
                        stats.enemies[entry.enemy] ??= {
                            encounters:0,
                            attacks:0,
                            switches:0,
                            winningBattleDecisions:0,
                            losingBattleDecisions:0,
                            drawnBattleDecisions:0
                        };

                    enemy.encounters++;

                    enemy.attacks += Number(
                        chosen.type === 'attack'
                    );

                    enemy.switches += Number(
                        chosen.type === 'switch'
                    );

                    enemy.winningBattleDecisions += Number(won);
                    enemy.losingBattleDecisions += Number(
                        !won && !draw
                    );
                    enemy.drawnBattleDecisions += Number(draw);
                }
            }
        }
    }

    if (battles > manifest.taskCount) {
        throw new Error('Unexpected battle count');
    }

    return {
        schemaVersion:1,
        source:manifest,
        battles,
        expectedBattles:manifest.taskCount,
        complete:battles === manifest.taskCount,
        draws,
        turns,
        limited,
        averageTurns:ratio(turns,battles),
        agents:Object.fromEntries(
            Object.entries(agents).map(
                ([key,value]) => [key,finalize(value)]
            )
        ),
        matchups:Object.fromEntries(
            Object.entries(matchups).map(
                ([key,value]) => [
                    key,
                    {
                        ...value,
                        winRate:ratio(
                            value.wins,value.battles
                        )
                    }
                ]
            )
        )
    };
}

module.exports = {analyzeBatch};