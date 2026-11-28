const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
    decideSafely
} = require('../dolphin_adapter/decision_guard');

const {
    StrategicAgentDolphin
} = require('../src/agents/strategic_agent_dolphin');

const source = JSON.parse(
    fs.readFileSync(
        'data/dolphin/team_ai_input.json',
        'utf8'
    ).replace(/^\uFEFF/, '')
);

const team = source.team_preview_request.side.pokemon;

function setup() {
    const party = [
        'Infernape', 'Bronzong', 'Suicune'
    ].map(species => structuredClone(
        team.find(p => p.details.split(',')[0] === species)
    ));

    party[0].active = true;

    const request = {
        active: [{
            moves: structuredClone(party[0].move_data),
            trapped: false,
            maybeTrapped: false
        }],
        side: {
            id: 'p1',
            pokemon: party
        }
    };

    const agent = new StrategicAgentDolphin(
        'p1', () => 0.5
    );

    agent.observe(
        '|switch|p1a: ' +
        party[0].ident.split(': ')[1] +
        '|' + party[0].details +
        '|' + party[0].condition
    );

    agent.observe(
        '|switch|p2a: Opponent|Garchomp, L50|100/100'
    );

    agent.observe('|turn|1');

    return { agent, request };
}

async function main() {
    let count = 0;

    async function check(name, modify, expected, reason) {
        const {agent, request} = setup();

        if (modify) modify(agent, request);

        const result = await decideSafely(agent, request);

        assert.equal(result.approved, expected);

        if (!expected) {
            assert.equal(result.action, null);
            assert.equal(result.reason, reason);
        } else {
            assert.equal(result.executionAuthorized, false);
        }

        console.log(name + ': PASS');
        console.log(
            'Result:',
            result.action || result.reason
        );

        count++;
    }

    await check(
        'Normal decision',
        null,
        true
    );

    await check(
        'Team preview guard',
        (a, r) => r.teamPreview = true,
        false,
        'team_preview_not_supported'
    );

    await check(
        'Forced switch guard',
        (a, r) => r.forceSwitch = [true],
        false,
        'forced_switch_not_supported'
    );

    await check(
        'Invalid party guard',
        (a, r) => r.side.pokemon.pop(),
        false,
        'invalid_battle_request'
    );

    await check(
        'Fallback guard',
        a => {
            a.choose = async () => {
                a.searchFallbacks++;
                return 'move 1';
            };
        },
        false,
        'fallback_detected'
    );

    await check(
        'Search error guard',
        a => {
            a.choose = async () => {
                a.searchErrors++;
                return 'move 1';
            };
        },
        false,
        'search_error'
    );

    await check(
        'Inference error guard',
        a => {
            a.choose = async () => {
                a.inferenceErrors++;
                return 'move 1';
            };
        },
        false,
        'inference_error'
    );

    await check(
        'Missing result guard',
        a => a.choose = async () => 'move 1',
        false,
        'missing_search_result'
    );

    await check(
        'Illegal action guard',
        a => {
            a.choose = async () => {
                a.searchDecisions++;
                a.searchHistory.push({});
                return 'move 9';
            };
        },
        false,
        'illegal_action'
    );

    await check(
        'Exception guard',
        a => {
            a.choose = async () => {
                throw new Error('test');
            };
        },
        false,
        'exception: test'
    );

    console.log('\nPassed:', count + '/10');
    console.log('STEP 239: ALL TESTS PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
