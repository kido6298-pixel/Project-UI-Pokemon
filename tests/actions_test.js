const assert = require('node:assert/strict');
const { getActions } = require('../src/actions');
const { RandomAgent } = require('../src/agents/random_agent');

const preview = {
    teamPreview: true,
    side: {
        pokemon: Array.from({length: 6}, () => ({}))
    }
};

const selections = getActions(preview);

assert.equal(selections.length, 120);
assert.equal(new Set(selections).size, 120);

console.log('Team selection: PASS');
console.log('Selection patterns:', selections.length);

const request = {
    side: {
        pokemon: [
            {active: true, condition: '100/100'},
            {active: false, condition: '100/100'},
            {active: false, condition: '0 fnt'}
        ]
    },
    active: [{
        moves: [
            {pp: 10, disabled: false},
            {pp: 0, disabled: false},
            {pp: 5, disabled: true}
        ]
    }]
};

assert.deepEqual(
    getActions(request),
    ['move 1', 'switch 2']
);

console.log('Available actions: PASS');

assert.deepEqual(
    getActions({...request, forceSwitch: [true]}),
    ['switch 2']
);

console.log('Forced switching: PASS');

request.active[0].trapped = true;

assert.deepEqual(
    getActions(request),
    ['move 1']
);

console.log('Trapped switching restriction: PASS');

const agent = new RandomAgent(() => 0);

assert.equal(agent.choose(preview), 'team 123');

console.log('Random agent: PASS');
console.log('ACTION TEST: PASS');
