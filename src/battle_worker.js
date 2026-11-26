const {
    parentPort
} = require('node:worker_threads');

const { simulate } = require('./simulator');
const { createRandom } = require('./random');

const {
    team1,
    team2
} = require('./realistic_test_teams');

const {
    StrategicAgentV04
} = require('./agents/strategic_agent_v04');

const {
    StrategicAgentV05Optimized
} = require('./agents/strategic_agent_v05_optimized');

async function runBattle(i) {
    const side = i % 2 ? 'p1' : 'p2';

    const agent = new StrategicAgentV05Optimized(
        side,
        createRandom(3000 + i)
    );

    const opponent = new StrategicAgentV04(
        side === 'p1' ? 'p2' : 'p1',
        createRandom(4000 + i)
    );

    const result = await simulate({
        team1: structuredClone(team1),
        team2: structuredClone(team2),
        agent1: side === 'p1' ? agent : opponent,
        agent2: side === 'p2' ? agent : opponent,
        seed: [i,23456,34567,45678],
        timeoutMs: 120000
    });

    return {
        record: {
            battle: i,
            side,
            winner: result.winner,
            turns: result.turns,
            posteriorUses: agent.posteriorUses,
            priorUses: agent.priorUses,
            lastError: agent.lastError,
            lastInferenceError:
                agent.lastInferenceError ||
                agent.inference.lastError,
            history: agent.searchHistory
        },
        stats: {
            decisions: agent.searchDecisions,
            evaluations: agent.searchEvaluations,
            switches: agent.searchSwitches,
            fallbacks: agent.searchFallbacks,
            searchErrors: agent.searchErrors,
            inferenceErrors:
                agent.inferenceErrors +
                agent.inference.stats.errors,
            limited: Number(result.limited)
        },
        cacheStats: agent.cacheStats
    };
}

if (parentPort) {
    parentPort.on('message', async ({id}) => {
        try {
            const result = await runBattle(id);

            parentPort.postMessage({
                id,
                result
            });
        } catch (error) {
            parentPort.postMessage({
                id,
                error: error.stack || error.message
            });
        }
    });
}

module.exports = { runBattle };
