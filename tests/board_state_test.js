const assert = require('node:assert/strict');
const fs = require('node:fs');
const { buildBoard } = require('../src/board_state');
const { BattleState } = require('../src/battle_state');
const { RandomAgent } = require('../src/agents/random_agent');
const { simulate } = require('../src/simulator');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

const stats = {
    battles: 0,
    evaluatedBoards: 0,
    unknownTwo: 0,
    unknownOne: 0,
    unknownZero: 0,
    faintedObserved: 0
};

const examples = [];

class BoardAgent extends RandomAgent {
    constructor(side, random) {
        super(random);
        this.state = new BattleState(side);
    }

    observe(line) {
        this.state.observe(line);
    }

    choose(request) {
        this.state.updateRequest(request);

        if (!request.teamPreview &&
            request.side?.pokemon?.length === 3) {

            const board = buildBoard(this.state);

            assert.equal(board.own.length, 3);
            assert.equal(board.enemy.length, 3);

            assert.equal(
                board.knownCount + board.unknownCount,
                3
            );

            assert.ok(
                Number.isFinite(board.evaluation.advantage)
            );

            for (const p of [...board.own, ...board.enemy]) {
                assert.ok(p.hpRatio >= 0);
                assert.ok(p.hpRatio <= 1);

                if (p.fainted) {
                    assert.equal(p.hpRatio, 0);
                }
            }

            stats.evaluatedBoards++;

            if (board.unknownCount === 2) stats.unknownTwo++;
            if (board.unknownCount === 1) stats.unknownOne++;
            if (board.unknownCount === 0) stats.unknownZero++;

            if (board.enemy.some(p => p.fainted)) {
                stats.faintedObserved++;
            }

            if (examples.length < 20) {
                examples.push({
                    side: this.state.side,
                    turn: this.state.turn,
                    known: board.knownCount,
                    unknown: board.unknownCount,
                    ownAlive: board.evaluation.own.alive,
                    enemyAlive: board.evaluation.enemy.alive,
                    advantage: board.evaluation.advantage
                });
            }
        }

        return super.choose(request);
    }
}

async function main() {
    for (let i = 1; i <= 100; i++) {
        await simulate({
            team1,
            team2,
            agent1: new BoardAgent(
                'p1', createRandom(1000 + i)
            ),
            agent2: new BoardAgent(
                'p2', createRandom(2000 + i)
            ),
            seed: [i, 23456, 34567, 45678]
        });

        stats.battles++;
    }

    console.log('\n=== LIVE BOARD EVALUATION ===');
    console.log(JSON.stringify(stats, null, 2));

    console.table(examples.map(r => ({
        ...r,
        advantage: r.advantage.toFixed(3)
    })));

    assert.equal(stats.battles, 100);
    assert.ok(stats.evaluatedBoards > 0);
    assert.ok(stats.unknownTwo > 0);
    assert.ok(stats.unknownOne > 0);
    assert.ok(stats.unknownZero > 0);
    assert.ok(stats.faintedObserved > 0);

    fs.mkdirSync('logs', {recursive: true});

    fs.writeFileSync(
        'logs/board_state_test.json',
        JSON.stringify({stats, examples}, null, 2)
    );

    console.log('\nLIVE BOARD EVALUATION TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
