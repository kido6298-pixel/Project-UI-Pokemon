const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const { simulate } = require('../src/simulator');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

const {
    StrategicAgentV03
} = require('../src/agents/strategic_agent_v03');

const sourcePath = path.resolve(
    'src/agents/strategic_agent_v04_baseline.js'
);

const source = fs.readFileSync(sourcePath, 'utf8');

const variants = [
    {name: 'Baseline', penalty: 0.10, repeat: 0},
    {name: 'A', penalty: 0.20, repeat: 0},
    {name: 'B', penalty: 0.30, repeat: 0},
    {name: 'C', penalty: 0.10, repeat: 0.30},
    {name: 'D', penalty: 0.20, repeat: 0.30},
    {name: 'E', penalty: 0.30, repeat: 0.50},
    {name: 'F-NoSwitch', penalty: 0.10, repeat: 0, disabled: true}
];

function createVariant(config) {
    const target = 'score: result.score - 0.10,';

    assert.ok(source.includes(target));

    let code = source.replace(
        target,
        `score: result.score - ${config.penalty} -
            (
                this.searchHistory.at(-1)?.chosen.type === 'switch' &&
                this.searchHistory.at(-1)?.turn === this.state.turn - 1
                    ? ${config.repeat}
                    : 0
            ),`
    );

    if (config.disabled) {
        const loop = "a => /^switch \\d+$/.test(a)";

        assert.ok(code.includes(loop));

        code = code.replace(
            loop,
            "a => false"
        );
    }

    const compiled = new Module(sourcePath, module);

    compiled.filename = sourcePath;

    compiled.paths = Module._nodeModulePaths(
        path.dirname(sourcePath)
    );

    compiled._compile(code, sourcePath);

    return compiled.exports.StrategicAgentV04;
}

const COUNT = 200;

async function benchmark(config) {
    const Agent = createVariant(config);

    const stats = {
        model: config.name,
        penalty: config.penalty,
        repeatPenalty: config.repeat,
        wins: 0,
        losses: 0,
        draws: 0,
        decisions: 0,
        switches: 0,
        repeated: 0,
        errors: 0,
        fallbacks: 0,
        limited: 0,
        completed: 0
    };

    const started = performance.now();

    for (let i = 1; i <= COUNT; i++) {
        const side = i % 2 ? 'p1' : 'p2';

        const agent = new Agent(
            side,
            createRandom(23000 + i)
        );

        const opponent = new StrategicAgentV03(
            side === 'p1' ? 'p2' : 'p1',
            createRandom(24000 + i)
        );

        const result = await simulate({
            team1,
            team2,
            agent1: side === 'p1' ? agent : opponent,
            agent2: side === 'p2' ? agent : opponent,
            seed: [i + 20000, 54321, 32109, 12345],
            timeoutMs: 120000
        });

        const ownWinner =
            side === 'p1' ? 'AI-1' : 'AI-2';

        if (result.winner === 'DRAW') stats.draws++;
        else if (result.winner === ownWinner) stats.wins++;
        else stats.losses++;

        stats.completed++;
        stats.decisions += agent.searchDecisions;
        stats.switches += agent.searchSwitches;
        stats.errors += agent.searchErrors;
        stats.fallbacks += agent.searchFallbacks;

        if (result.limited) stats.limited++;

        const history = agent.searchHistory;

        for (let j = 1; j < history.length; j++) {
            if (
                history[j].chosen.type === 'switch' &&
                history[j - 1].chosen.type === 'switch' &&
                history[j].turn === history[j - 1].turn + 1
            ) {
                stats.repeated++;
            }
        }

        if (i % 25 === 0) {
            console.log(
                config.name,
                i + '/' + COUNT,
                'W=' + stats.wins,
                'L=' + stats.losses,
                'D=' + stats.draws
            );
        }
    }

    stats.scoreRate =
        (stats.wins + stats.draws * 0.5) /
        stats.completed;

    stats.switchRate =
        stats.switches /
        Math.max(1, stats.decisions);

    stats.seconds =
        (performance.now() - started) / 1000;

    return stats;
}

async function main() {
    const results = [];

    fs.mkdirSync('logs', {recursive: true});

    for (const config of variants.filter(v => ['Baseline', 'A', 'D', 'E', 'F-NoSwitch'].includes(v.name))) {
        console.log('\n=== MODEL ' + config.name + ' ===');

        const result = await benchmark(config);

        results.push(result);

        fs.writeFileSync(
            'logs/strategic_v04_switch_validation.json',
            JSON.stringify(results, null, 2)
        );

        console.log(
            'Score:',
            (result.scoreRate * 100).toFixed(2) + '%'
        );

        assert.equal(result.errors, 0);
        assert.equal(result.limited, 0);
    }

    results.sort(
        (a, b) => b.scoreRate - a.scoreRate
    );

    console.log('\n=== V0.4 SWITCH VALIDATION ===');

    console.table(results.map(r => ({
        Model: r.model,
        Wins: r.wins,
        Losses: r.losses,
        Draws: r.draws,
        Score: (r.scoreRate * 100).toFixed(2) + '%',
        SwitchRate: (r.switchRate * 100).toFixed(2) + '%',
        Repeated: r.repeated,
        Fallbacks: r.fallbacks,
        Errors: r.errors,
        Seconds: r.seconds.toFixed(2)
    })));

    console.log(
        '\nTotal battles:',
        results.reduce(
            (sum, r) => sum + r.completed, 0
        )
    );

    console.log(
        'Total seconds:',
        results.reduce(
            (sum, r) => sum + r.seconds, 0
        ).toFixed(2)
    );

    console.log('\nV0.4 SWITCH VALIDATION: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});


