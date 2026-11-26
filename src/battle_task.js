const { simulate } = require('./simulator');

const {
    createAgent
} = require('./agent_factory');

function validateTask(task) {
    if (!task || typeof task !== 'object') {
        throw new Error('Invalid battle task');
    }

    if (
        !Number.isSafeInteger(task.id) ||
        task.id < 1
    ) {
        throw new Error('Invalid battle ID');
    }

    for (const team of [task.team1,task.team2]) {
        if (!Array.isArray(team) || team.length !== 6) {
            throw new Error(
                'Each team must contain six Pokemon'
            );
        }

        for (const set of team) {
            if (
                !set ||
                typeof set.species !== 'string' ||
                !set.species.trim() ||
                !Array.isArray(set.moves) ||
                set.moves.length < 1 ||
                set.moves.length > 4 ||
                set.level !== 50
            ) {
                throw new Error(
                    'Invalid Pokemon set'
                );
            }
        }
    }

    if (
        !Array.isArray(task.seed) ||
        task.seed.length !== 4 ||
        !task.seed.every(n =>
            Number.isInteger(n) &&
            n >= 0 &&
            n <= 65535
        )
    ) {
        throw new Error('Invalid battle seed');
    }

    if (task.seed.every(n => n === 0)) {
        throw new Error('All-zero battle seed');
    }

    if (!task.agent1 || !task.agent2) {
        throw new Error('Missing agent configuration');
    }

    if (
        task.maxTurns !== undefined &&
        (
            !Number.isInteger(task.maxTurns) ||
            task.maxTurns < 1
        )
    ) {
        throw new Error('Invalid turn limit');
    }

    if (
        task.timeoutMs !== undefined &&
        (
            !Number.isFinite(task.timeoutMs) ||
            task.timeoutMs <= 0
        )
    ) {
        throw new Error('Invalid battle timeout');
    }
}

function collectAgentStats(agent,type) {
    return {
        type,
        decisions:agent.searchDecisions ?? 0,
        evaluations:agent.searchEvaluations ?? 0,
        switches:agent.searchSwitches ?? 0,
        fallbacks:agent.searchFallbacks ?? 0,
        searchErrors:agent.searchErrors ?? 0,
        inferenceErrors:
            (agent.inferenceErrors ?? 0) +
            (agent.inference?.stats?.errors ?? 0),
        posteriorUses:agent.posteriorUses ?? 0,
        priorUses:agent.priorUses ?? 0,
        lastError:agent.lastError ?? null,
        lastInferenceError:
            agent.lastInferenceError ||
            agent.inference?.lastError ||
            null,
        cacheStats:structuredClone(
            agent.cacheStats ?? {}
        )
    };
}

async function runBattleTask(task) {
    validateTask(task);

    const agent1 = createAgent({
        ...task.agent1,
        side:'p1'
    });

    const agent2 = createAgent({
        ...task.agent2,
        side:'p2'
    });

    const result = await simulate({
        team1:structuredClone(task.team1),
        team2:structuredClone(task.team2),
        agent1,
        agent2,
        seed:[...task.seed],
        maxTurns:task.maxTurns ?? 300,
        timeoutMs:task.timeoutMs ?? 120000
    });

    const output = {
        id:task.id,
        winner:result.winner,
        turns:result.turns,
        switchEvents:result.switchEvents,
        limited:result.limited,
        agents:{
            p1:collectAgentStats(
                agent1,task.agent1.type
            ),
            p2:collectAgentStats(
                agent2,task.agent2.type
            )
        }
    };

    if (task.includeHistory) {
        output.decisions = [...result.decisions].sort(
            (a,b) =>
                a.turn - b.turn ||
                a.player.localeCompare(b.player)
        );

        output.history = {
            p1:agent1.searchHistory ?? [],
            p2:agent2.searchHistory ?? []
        };
    }

    if (task.includeLog) {
        output.log = result.log;
    }

    return output;
}

module.exports = {
    validateTask,
    runBattleTask
};

