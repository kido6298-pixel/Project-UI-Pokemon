const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
    StrategicAgentDolphin
} = require('../src/agents/strategic_agent_dolphin');

const { getActions } = require('../src/actions');

const source = JSON.parse(
    fs.readFileSync(
        'data/dolphin/team_ai_input.json',
        'utf8'
    ).replace(/^\uFEFF/, '')
);

const team = source.team_preview_request.side.pokemon;

function findPokemon(species) {
    const pokemon = team.find(
        p => p.details.split(',')[0] === species
    );

    assert.ok(pokemon, 'Missing Pokemon: ' + species);

    return structuredClone(pokemon);
}

const scenarios = [
    {
        own: 'Infernape',
        enemy: 'Garchomp',
        bench: ['Bronzong', 'Suicune']
    },
    {
        own: 'Suicune',
        enemy: 'Gyarados',
        bench: ['Zapdos', 'Garchomp']
    },
    {
        own: 'Zapdos',
        enemy: 'Garchomp',
        bench: ['Bronzong', 'Suicune']
    },
    {
        own: 'Bronzong',
        enemy: 'Heatran',
        bench: ['Garchomp', 'Suicune']
    },
    {
        own: 'Tyranitar',
        enemy: 'Starmie',
        bench: ['Zapdos', 'Suicune']
    },
    {
        own: 'Garchomp',
        enemy: 'Heatran',
        bench: ['Bronzong', 'Infernape']
    }
];

async function runScenario(scenario) {
    const agent = new StrategicAgentDolphin(
        'p1', () => 0.5
    );

    const active = findPokemon(scenario.own);
    active.active = true;

    const party = [
        active,
        ...scenario.bench.map(findPokemon)
    ];

    const request = {
        active: [{
            moves: structuredClone(active.move_data),
            trapped: false,
            maybeTrapped: false
        }],
        side: {
            id: 'p1',
            name: 'Project U.I.',
            pokemon: party
        }
    };

    const nickname = active.ident
        .split(': ').slice(1).join(': ');

    agent.observe(
        '|switch|p1a: ' + nickname +
        '|' + active.details +
        '|' + active.condition
    );

    agent.observe(
        '|switch|p2a: Opponent|' +
        scenario.enemy + ', L50|100/100'
    );

    agent.observe('|turn|1');

    const legal = getActions(request);

    const started = performance.now();

    const action = await agent.choose(request);

    const elapsed = performance.now() - started;

    console.log(
        '\n=== ' + scenario.own +
        ' vs ' + scenario.enemy + ' ==='
    );

    console.log('Legal actions:', legal);
    console.log('Chosen:', action);
    console.log('Time ms:', elapsed.toFixed(1));
    console.log('Search errors:', agent.searchErrors);
    console.log('Inference errors:', agent.inferenceErrors);
    console.log('Fallbacks:', agent.searchFallbacks);
    console.log('Last error:', agent.lastError);
    console.log(
        'Last inference error:',
        agent.lastInferenceError
    );

    assert.ok(legal.includes(action));
    assert.equal(agent.searchErrors, 0);
    assert.equal(agent.inferenceErrors, 0);
    assert.equal(agent.searchFallbacks, 0);
    assert.equal(agent.searchDecisions, 1);

    const history = agent.searchHistory.at(-1);

    assert.ok(history);
    assert.equal(history.chosen.action, action);
    assert.ok(history.candidates.length > 0);

    console.log('Enemy moves:', history.enemyMoves);
    console.log('Enemy builds:', history.buildCount);
    console.log('Coverage:', history.coverage);

    console.table(
        history.candidates.map(c => ({
            action: c.action,
            name: c.name,
            type: c.type,
            score: Number(c.score.toFixed(5))
        }))
    );

    for (const candidate of history.candidates) {
        assert.ok(Number.isFinite(candidate.score));
        assert.ok(legal.includes(candidate.action));
    }

    if (active.hidden_power) {
        const index = active.moves.indexOf('hiddenpower');

        assert.ok(index >= 0);

        assert.ok(
            history.candidates.some(
                c => c.action === 'move ' + (index + 1)
            ),
            'Hidden Power missing from search'
        );

        console.log('Hidden Power candidate: PASS');
    }

    console.log('Scenario: PASS');

    return {
        scenario,
        action,
        elapsedMs: elapsed,
        history,
        searchErrors: agent.searchErrors,
        inferenceErrors: agent.inferenceErrors,
        fallbacks: agent.searchFallbacks
    };
}

async function main() {
    const results = [];

    for (const scenario of scenarios) {
        results.push(await runScenario(scenario));
    }

    fs.mkdirSync('logs', {recursive: true});

    fs.writeFileSync(
        'logs/dolphin_agent_validation.json',
        JSON.stringify(results, null, 2)
    );

    console.log('\n=== SUMMARY ===');
    console.log('Scenarios:', results.length);
    console.log('Passed:', results.length);
    console.log('Search errors: 0');
    console.log('Inference errors: 0');
    console.log('Fallbacks: 0');

    console.log(
        'Average decision ms:',
        (
            results.reduce(
                (sum, r) => sum + r.elapsedMs, 0
            ) / results.length
        ).toFixed(1)
    );

    console.log('STEP 238-B: ALL TESTS PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
