const {
    CalculationCache
} = require('./calculation_cache');

function cloneCalculation(value) {
    if (
        value === null ||
        typeof value !== 'object'
    ) {
        return value;
    }

    if (
        Object.getPrototypeOf(value) === Object.prototype &&
        Object.keys(value).length === 11 &&
        typeof value.move === 'string' &&
        typeof value.immune === 'boolean' &&
        [
            'min',
            'max',
            'maxHP',
            'currentHP',
            'minPercent',
            'maxPercent'
        ].every(key => typeof value[key] === 'number') &&
        (
            value.average === null ||
            typeof value.average === 'number'
        ) &&
        (
            value.koChance === null ||
            typeof value.koChance === 'number'
        ) &&
        (
            value.rolls === null ||
            (
                Array.isArray(value.rolls) &&
                value.rolls.every(Number.isFinite)
            )
        )
    ) {
        return {
            ...value,
            rolls: value.rolls === null
                ? null
                : value.rolls.slice()
        };
    }

    return structuredClone(value);
}

class FastCalculationCache extends CalculationCache {
    getOrCompute(input, compute) {
        const key = JSON.stringify(input);

        if (this.entries.has(key)) {
            const value = this.entries.get(key);

            this.entries.delete(key);
            this.entries.set(key,value);

            this.hits++;

            return cloneCalculation(value);
        }

        this.misses++;

        const value = compute();

        if (this.entries.size >= this.limit) {
            this.entries.delete(
                this.entries.keys().next().value
            );

            this.evictions++;
        }

        this.entries.set(
            key,
            cloneCalculation(value)
        );

        return value;
    }
}

module.exports = {
    FastCalculationCache,
    cloneCalculation
};
