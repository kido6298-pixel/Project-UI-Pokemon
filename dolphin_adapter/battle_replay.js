const fs = require('node:fs');
const assert = require('node:assert/strict');

const {
    StrategicAgentDolphin
} = require('../src/agents/strategic_agent_dolphin');

const {
    decideSafely
} = require('./decision_guard');

function readJSON(path) {
    return JSON.parse(
        fs.readFileSync(path, 'utf8')
            .replace(/^\uFEFF/, '')
    );
}

const team = readJSON(
    'data/dolphin/team_ai_input.json'
).team_preview_request.side.pokemon;

const selected = [
    'Bronzong',
    'Garchomp',
    'Tyranitar'
];

function buildRequest(snapshot) {
    assert.equal(
        snapshot.mode,
        'offline_replay_test'
    );

    assert.equal(
        snapshot.execution_authorized,
        false
    );

    const state = snapshot.observation;

    const party = selected.map(species => {
        const source = team.find(
            p => p.details.split(',')[0] === species
        );

        assert.ok(source);

        const pokemon = structuredClone(source);

        pokemon.active = species === state.own.species;

        if (pokemon.active) {
            const maximum = Number(
                pokemon.condition.split('/')[1]
            );

            assert.equal(
                maximum,
                state.own.max_hp
            );

            assert.ok(
                state.own.current_hp > 0 &&
                state.own.current_hp <= maximum
            );

            pokemon.condition =
                state.own.current_hp + '/' + maximum;
        }

        return pokemon;
    });

    assert.equal(
        party.filter(p => p.active).length,
        1
    );

    const active = party.find(p => p.active);

    return {
        active: [{
            moves: structuredClone(active.move_data),
            trapped: false,
            maybeTrapped: false
        }],
        side: {
            id: 'p1',
            pokemon: party
        }
    };
}

async function evaluateSnapshot(snapshot) {
    const request = buildRequest(snapshot);
    const state = snapshot.observation;
    const active = request.side.pokemon.find(p => p.active);

    const agent = new StrategicAgentDolphin(
        'p1', () => 0.5
    );

    const nickname = active.ident
        .split(': ').slice(1).join(': ');

    const enemyHP = Math.round(
        state.enemy.hp_percent
    );

    assert.ok(enemyHP > 0 && enemyHP <= 100);

    // Synthetic initialization for isolated replay only.
    agent.observe(
        '|switch|p1a: ' + nickname +
        '|' + active.details +
        '|' + active.condition
    );

    agent.observe(
        '|switch|p2a: Opponent|' +
        state.enemy.species +
        ', L50|' + enemyHP + '/100'
    );

    agent.observe('|turn|1');

    assert.equal(agent.inferenceErrors, 0);

    const decision = await decideSafely(
        agent, request
    );

    console.log('\n=== ' + snapshot.source_image + ' ===');
    console.log('Own:', active.details);
    console.log('Own HP:', active.condition);
    console.log('Enemy:', state.enemy.species);
    console.log('Enemy HP estimate:', state.enemy.hp_percent);
    console.log('Approved:', decision.approved);
    console.log('Action:', decision.action);
    console.log('Reason:', decision.reason);

    assert.equal(decision.approved, true);
    assert.equal(decision.executionAuthorized, false);
    assert.equal(agent.posteriorUses, 0);

    console.table(
        decision.candidates.map(c => ({
            action: c.action,
            name: c.name,
            score: Number(c.score.toFixed(5))
        }))
    );

    console.log('Decision time ms:', decision.elapsedMs);
    console.log('Execution: DISABLED');
    console.log('Replay: PASS');

    return {
        sourceImage: snapshot.source_image,
        mode: snapshot.mode,
        assumptions: snapshot.assumptions,
        observation: state,
        decision,
        executionAuthorized: false
    };
}

async function main() {
    const snapshots = readJSON(
        'data/dolphin/battle_replay_input.json'
    );

    assert.equal(snapshots.length, 3);

    const results = [];

    for (const snapshot of snapshots) {
        results.push(
            await evaluateSnapshot(snapshot)
        );
    }

    fs.mkdirSync('logs', {recursive: true});

    fs.writeFileSync(
        'logs/dolphin_replay_validation.json',
        JSON.stringify(results, null, 2)
    );

    console.log('\nPassed:', results.length + '/3');
    console.log('Controller operations: 0');
    console.log('STEP 240-B: ALL TESTS PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
