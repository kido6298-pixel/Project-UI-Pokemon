const assert = require('node:assert/strict');
const { BattleState } = require('../src/battle_state');

const state = new BattleState('p1');
const feed = line => state.observe(line);

feed('|switch|p1a: Garchomp|Garchomp, L50|184/184');
feed('|switch|p2a: Gyarados|Gyarados, L50|100/100');

feed('|-unboost|p1a: Garchomp|atk|1');
assert.equal(state.pokemon.p1.Garchomp.boosts.atk, -1);

feed('|-boost|p1a: Garchomp|atk|2');
assert.equal(state.pokemon.p1.Garchomp.boosts.atk, 1);

feed('|-boost|p1a: Garchomp|atk|6');
assert.equal(state.pokemon.p1.Garchomp.boosts.atk, 6);

console.log('Stat boosts: PASS');

feed('|-clearallboost');
assert.equal(state.pokemon.p1.Garchomp.boosts.atk, 0);

feed('|-boost|p1a: Garchomp|atk|2');
feed('|switch|p1a: Metagross|Metagross, L50|156/156');
feed('|switch|p1a: Garchomp|Garchomp, L50|184/184');

assert.equal(state.pokemon.p1.Garchomp.boosts.atk, 0);

console.log('Boost reset: PASS');

feed('|-sidestart|p1: AI-1|move: Stealth Rock');
feed('|-sidestart|p1: AI-1|move: Spikes');
feed('|-sidestart|p1: AI-1|move: Spikes');

assert.equal(state.sideConditions.p1['Stealth Rock'], 1);
assert.equal(state.sideConditions.p1.Spikes, 2);

feed('|-sideend|p1: AI-1|move: Stealth Rock');
assert.equal(state.sideConditions.p1['Stealth Rock'], undefined);

console.log('Entry hazards: PASS');

feed('|-sidestart|p2: AI-2|move: Reflect');
assert.equal(state.sideConditions.p2.Reflect, 1);

console.log('Screens: PASS');

feed('|turn|5');
feed('|-fieldstart|move: Trick Room');
assert.equal(state.field['Trick Room'].startedTurn, 5);

feed('|-fieldend|move: Trick Room');
assert.equal(state.field['Trick Room'], undefined);

console.log('Field effects: PASS');

console.log('EXTENDED STATE TEST: PASS');
