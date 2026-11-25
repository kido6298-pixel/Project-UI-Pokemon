const assert = require('node:assert/strict');

const {
    BattleState
} = require('../src/battle_state');

const {
    estimateEnemyBuilds
} = require('../src/enemy_builds');

const {
    refreshPosteriorBuilds
} = require('../src/posterior_build_state');

const {
    displayHP
} = require('../src/hp_inference');

const state = new BattleState('p1');

state.observe(
    '|switch|p2a: Suicune|Suicune, L50|100/100'
);

const observed = state.pokemon.p2.Suicune;

const source = estimateEnemyBuilds(observed);

let floatingPointCases = 0;
let checks = 0;

for (let percent = 1; percent <= 100; percent++) {
    state.observe(
        '|-damage|p2a: Suicune|' +
        percent + '/100'
    );

    if (!Number.isInteger(observed.hp.percent)) {
        floatingPointCases++;

        console.log(
            'Floating point:',
            percent,
            '->',
            observed.hp.percent
        );
    }

    const builds = refreshPosteriorBuilds(
        source,
        observed
    );

    for (const build of builds) {
        assert.equal(
            displayHP(
                build.config.curHP,
                build.maxHP
            ),
            percent
        );

        checks++;
    }
}

assert.ok(floatingPointCases > 0);

console.log('\nFloating point cases:', floatingPointCases);
console.log('HP consistency checks:', checks);

console.log('\nLIVE HP PRECISION TEST: PASS');
