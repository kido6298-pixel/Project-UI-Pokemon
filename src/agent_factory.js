const { RandomAgent } =
    require('./agents/random_agent');

const { StrategicAgentV04 } =
    require('./agents/strategic_agent_v04');

const { StrategicAgentV05Optimized } =
    require('./agents/strategic_agent_v05_optimized');

const { createRandom } = require('./random');

const AGENT_TYPES = Object.freeze([
    'random',
    'v04',
    'v05'
]);

function createAgent({type,side,seed}) {
    if (!['p1','p2'].includes(side)) {
        throw new Error('Invalid agent side');
    }

    if (
        !Number.isInteger(seed) ||
        seed < 0 ||
        seed > 0xffffffff
    ) {
        throw new Error('Invalid agent seed');
    }

    const random = createRandom(seed);

    switch (type) {
        case 'random':
            return new RandomAgent(random);

        case 'v04':
            return new StrategicAgentV04(
                side,random
            );

        case 'v05':
            return new StrategicAgentV05Optimized(
                side,random
            );

        default:
            throw new Error(
                'Unknown agent type: ' + type
            );
    }
}

module.exports = {
    AGENT_TYPES,
    createAgent
};
