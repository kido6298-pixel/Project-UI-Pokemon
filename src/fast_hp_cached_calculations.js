const {
    HPCachedCalculations
} = require('./hp_cached_calculations');

const {
    FastCalculationCache
} = require('./fast_calculation_cache');

class FastHPCachedCalculations extends HPCachedCalculations {
    constructor(options = {}) {
        super(options);

        this.damageCache = new FastCalculationCache(
            this.damageCache.limit
        );

        this.speedCache = new FastCalculationCache(
            this.speedCache.limit
        );
    }
}

module.exports = { FastHPCachedCalculations };
