const {
    CalculationCache
} = require('./calculation_cache');

const {
    predictDamage
} = require('./damage');

const {
    effectiveSpeed
} = require('./speed');

class CachedCalculations {
    constructor({
        damageLimit = 20000,
        speedLimit = 5000
    } = {}) {
        this.damageCache =
            new CalculationCache(damageLimit);

        this.speedCache =
            new CalculationCache(speedLimit);
    }

    predictDamage(options) {
        return this.damageCache.getOrCompute(
            options,
            () => predictDamage(options)
        );
    }

    effectiveSpeed(config) {
        return this.speedCache.getOrCompute(
            config,
            () => effectiveSpeed(config)
        );
    }

    stats() {
        return {
            damage: this.damageCache.stats(),
            speed: this.speedCache.stats()
        };
    }

    clear() {
        this.damageCache.clear();
        this.speedCache.clear();
    }
}

module.exports = { CachedCalculations };
