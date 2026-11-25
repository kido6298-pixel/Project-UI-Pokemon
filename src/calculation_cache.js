class CalculationCache {
    constructor(limit = 20000) {
        if (!Number.isInteger(limit) || limit < 1) {
            throw new Error('Invalid cache limit');
        }

        this.limit = limit;
        this.entries = new Map();

        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
    }

    getOrCompute(input, compute) {
        const key = JSON.stringify(input);

        if (this.entries.has(key)) {
            const value = this.entries.get(key);

            this.entries.delete(key);
            this.entries.set(key, value);

            this.hits++;

            return structuredClone(value);
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
            structuredClone(value)
        );

        return value;
    }

    stats() {
        const total = this.hits + this.misses;

        return {
            size: this.entries.size,
            limit: this.limit,
            hits: this.hits,
            misses: this.misses,
            evictions: this.evictions,
            hitRate: total ? this.hits / total : 0
        };
    }

    clear() {
        this.entries.clear();

        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
    }
}

module.exports = { CalculationCache };
