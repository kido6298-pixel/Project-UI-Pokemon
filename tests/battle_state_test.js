const fs = require('node:fs');
const assert = require('node:assert/strict');
const { simulate } = require('../src/simulator');
const { BattleState } = require('../src/battle_state');
const { RandomAgent } = require('../src/agents/random_agent');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

class StateAgent extends RandomAgent {
    constructor(side, seed) {
        super(createRandom(seed));
        this.state = new BattleState(side);
    }

    observe(line) {
        this.state.observe(line);
    }

    choose(request) {
        this.state.updateRequest(request);
        return super.choose(request);
    }
}

async function main() {
    const agent1 = new StateAgent('p1', 1001);
    const agent2 = new StateAgent('p2', 2001);

    const result = await simulate({
        team1,
        team2,
        seed: [12345, 23456, 34567, 45678],
        agent1,
        agent2
    });

    const p1 = agent1.state.snapshot();
    const p2 = agent2.state.snapshot();

    for (const [name, state, opponent] of [
        ['P1', p1, 'p2'],
        ['P2', p2, 'p1']
    ]) {
        assert.equal(state.preview.p1.length, 6);
        assert.equal(state.preview.p2.length, 6);
        assert.equal(state.turn, result.turns);
        assert.ok(state.history.length > 0);
        assert.equal(state.own.length, 3);

        const seen = Object.values(
            state.pokemon[opponent]
        );

        assert.ok(seen.length > 0);
        assert.ok(seen.length <= 3);

        for (const p of seen) {
            if (p.hp) assert.equal(p.hp.max, 100);
        }

        console.log('\n=== ' + name + ' STATE ===');
        console.log('Turn:', state.turn);
        console.log('Weather:', state.weather);
        console.log('Opponent preview:', state.preview[opponent].length);
        console.log('Revealed opponents:', seen.length);
        console.log(JSON.stringify(seen, null, 2));
        console.log('History events:', state.history.length);
    }

    assert.ok(Object.values(p1.pokemon.p2).some(
        p => p.moves.includes('Surf')
    ));

    assert.equal(
        p1.pokemon.p2.Suicune.ability,
        'Pressure'
    );

    assert.equal(
        p1.pokemon.p2.Suicune.item,
        'Leftovers'
    );

    fs.mkdirSync('logs', {recursive: true});

    fs.writeFileSync(
        'logs/battle_state.json',
        JSON.stringify({p1, p2}, null, 2)
    );

    console.log('\nBATTLE STATE TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
