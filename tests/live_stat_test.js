const assert = require('node:assert/strict');
const { Generations, Pokemon } = require('@smogon/calc');
const { simulate } = require('../src/simulator');
const { RandomAgent } = require('../src/agents/random_agent');
const { createRandom } = require('../src/random');
const { buildOwnConfig } = require('../src/pokemon_config');
const { team1, team2 } = require('../src/test_teams');

const gen = Generations.get(4);

let checked = 0;
let damagedChecks = 0;

class VerificationAgent extends RandomAgent {
    choose(request) {
        if (request.active && !request.forceSwitch?.[0]) {
            const own = request.side.pokemon.find(p => p.active);

            if (own && !own.condition.includes('fnt')) {
                const config = buildOwnConfig(own);
                const rebuilt = new Pokemon(
                    gen,
                    config.species,
                    config
                );

                const [currentHP, maxHP] = own.condition
                    .split(' ')[0]
                    .split('/')
                    .map(Number);

                assert.equal(rebuilt.maxHP(), maxHP);
                assert.equal(rebuilt.curHP(), currentHP);

                checked += 2;

                if (currentHP < maxHP) damagedChecks++;

                for (const stat of [
                    'atk', 'def', 'spa', 'spd', 'spe'
                ]) {
                    assert.equal(
                        rebuilt.rawStats[stat],
                        own.stats[stat]
                    );

                    checked++;
                }
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
            agent1: new VerificationAgent(createRandom(1000 + i)),
            agent2: new VerificationAgent(createRandom(2000 + i)),
            seed: [i, 23456, 34567, 45678]
        });
    }

    assert.ok(checked > 0);
    assert.ok(damagedChecks > 0);

    console.log('\n=== LIVE STAT VERIFICATION ===');
    console.log('Battles:', 100);
    console.log('Values checked:', checked);
    console.log('Damaged Pokemon checks:', damagedChecks);
    console.log('Errors:', 0);
    console.log('LIVE STAT VERIFICATION: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
