const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { performance } = require('node:perf_hooks');
const { simulate } = require('../src/simulator');
const { StrategicAgentV02 } = require('../src/agents/strategic_agent_v02');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

const COUNT = 1000;

const filename = path.resolve(
    __dirname,
    '../src/agents/strategic_agent_v03.js'
);

const source = fs.readFileSync(filename, 'utf8');

function createVariant(margin, multiplier, forcedOnly) {
    let code = source
        .replace(
            'const switchMargin = 0.15;',
            `const switchMargin = ${margin};`
        )
        .replace(
            'const switchMultiplier = 1.25;',
            `const switchMultiplier = ${multiplier};`
        );

    if (forcedOnly) {
        code = code.replace(
            'const worthwhile =',
            'const worthwhile = false &&'
        );
    }

    if (code === source && (margin !== 0.15 ||
        multiplier !== 1.25 || forcedOnly)) {
        throw new Error('Variant replacement failed');
    }

    const variant = new Module(filename, module);
    variant.filename = filename;
    variant.paths = Module._nodeModulePaths(
        path.dirname(filename)
    );

    variant._compile(code, filename);

    return variant.exports.StrategicAgentV03;
}

async function benchmark(margin, multiplier, forcedOnly = false) {
    const Agent = createVariant(
        margin, multiplier, forcedOnly
    );

    const stats = {
        margin,
        multiplier,
        forcedOnly,
        wins: 0,
        losses: 0,
        draws: 0,
        limited: 0,
        switches: 0,
        forcedSwitches: 0,
        prevented: 0,
        completed: 0
    };

    const started = performance.now();

    for (const side of ['p1', 'p2']) {
        for (let i = 1; i <= COUNT; i++) {
            const agent = new Agent(
                side,
                createRandom(
                    (side === 'p1' ? 1000 : 2000) + i
                )
            );

            const opponent = new StrategicAgentV02(
                side === 'p1' ? 'p2' : 'p1',
                createRandom(
                    (side === 'p1' ? 2000 : 1000) + i
                )
            );

            const result = await simulate({
                team1,
                team2,
                agent1: side === 'p1' ? agent : opponent,
                agent2: side === 'p2' ? agent : opponent,
                seed: [i + 10000, 54321, 32109, 12345]
            });

            const winner = side === 'p1'
                ? 'AI-1' : 'AI-2';

            if (result.winner === winner) stats.wins++;
            else if (result.winner === 'DRAW') stats.draws++;
            else stats.losses++;

            if (result.limited) stats.limited++;

            stats.switches += agent.voluntarySwitches;
            stats.forcedSwitches += agent.forcedSwitches;
            stats.prevented += agent.preventedSwitches;
            stats.completed++;
        }
    }

    stats.winRate =
        stats.wins / stats.completed * 100;

    stats.scoreRate =
        (stats.wins + stats.draws * 0.5) /
        stats.completed * 100;

    stats.switchesPerBattle =
        stats.switches / stats.completed;

    stats.seconds =
        (performance.now() - started) / 1000;

    console.log(
        `Margin=${margin}`,
        `Multiplier=${multiplier}`,
        `ForcedOnly=${forcedOnly}`,
        `Score=${stats.scoreRate.toFixed(2)}%`,
        `Switches=${stats.switches}`,
        `Limited=${stats.limited}`
    );

    return stats;
}

async function main() {
    const results = [];

    for (const multiplier of [1.25, 1.5]) {
        for (const margin of [0.15, 0.6]) { if (multiplier === 1.5 && margin === 0.15) continue;
            results.push(
                await benchmark(margin, multiplier)
            );
        }
    }

    results.push(await benchmark(0.15, 1.25, true));

    results.sort((a, b) =>
        b.scoreRate - a.scoreRate
    );

    console.log('\n=== SWITCH OPTIMIZATION RESULTS ===');

    console.table(results.map((r, i) => ({
        Rank: i + 1,
        Margin: r.margin,
        Multiplier: r.multiplier,
        ForcedOnly: r.forcedOnly,
        Wins: r.wins,
        Losses: r.losses,
        Draws: r.draws,
        Score: r.scoreRate.toFixed(2) + '%',
        Switches: r.switches,
        PerBattle: r.switchesPerBattle.toFixed(3),
        Limited: r.limited
    })));

    fs.mkdirSync('logs', {recursive: true});

    fs.writeFileSync(
        'logs/switch_validation.json',
        JSON.stringify(results, null, 2)
    );

    console.log('\nTotal battles:',
        results.reduce((s, r) => s + r.completed, 0)
    );

    console.log('Total limited:',
        results.reduce((s, r) => s + r.limited, 0)
    );

    console.log('SWITCH OPTIMIZATION: COMPLETE');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});

