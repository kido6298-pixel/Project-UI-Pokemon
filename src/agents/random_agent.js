const { getActions } = require('../actions');

class RandomAgent {
    constructor(random = Math.random) {
        this.random = random;
    }

    choose(request) {
        const actions = getActions(request);

        if (!actions.length) {
            throw new Error('No available actions');
        }

        return actions[
            Math.floor(this.random() * actions.length)
        ];
    }
}

module.exports = { RandomAgent };
