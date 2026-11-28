const { getActions } = require('../src/actions');

async function decideSafely(agent, request) {
    const reject = reason => ({
        approved: false,
        action: null,
        reason
    });

    if (request.teamPreview) {
        return reject('team_preview_not_supported');
    }

    if (request.forceSwitch?.some(Boolean)) {
        return reject('forced_switch_not_supported');
    }

    if (
        request.side?.pokemon?.length !== 3 ||
        request.side.pokemon.filter(p => p.active).length !== 1 ||
        request.active?.length !== 1
    ) {
        return reject('invalid_battle_request');
    }

    const before = {
        decisions: agent.searchDecisions,
        errors: agent.searchErrors,
        inference: agent.inferenceErrors,
        fallbacks: agent.searchFallbacks,
        history: agent.searchHistory.length
    };

    try {
        const legal = getActions(request);
        const started = performance.now();

        const action = await agent.choose(request);

        const elapsedMs = performance.now() - started;

        if (agent.searchErrors !== before.errors) {
            return reject('search_error');
        }

        if (agent.inferenceErrors !== before.inference) {
            return reject('inference_error');
        }

        if (agent.searchFallbacks !== before.fallbacks) {
            return reject('fallback_detected');
        }

        if (
            agent.searchDecisions !== before.decisions + 1 ||
            agent.searchHistory.length !== before.history + 1
        ) {
            return reject('missing_search_result');
        }

        if (
            typeof action !== 'string' ||
            !/^(move [1-4]|switch [1-3])$/.test(action) ||
            !legal.includes(action)
        ) {
            return reject('illegal_action');
        }

        const history = agent.searchHistory.at(-1);

        if (
            history?.chosen?.action !== action ||
            !Number.isFinite(history.chosen.score)
        ) {
            return reject('invalid_search_result');
        }

        if (!history.candidates?.length ||
            !history.candidates.every(c =>
                legal.includes(c.action) &&
                Number.isFinite(c.score)
            )
        ) {
            return reject('invalid_candidates');
        }

        return {
            approved: true,
            action,
            reason: null,
            elapsedMs,
            chosen: history.chosen,
            candidates: history.candidates,
            enemy: history.enemy,
            coverage: history.coverage,
            executionAuthorized: false
        };

    } catch (error) {
        return reject('exception: ' + error.message);
    }
}

module.exports = { decideSafely };
