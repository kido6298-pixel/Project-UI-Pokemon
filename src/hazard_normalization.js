function normalizeHazards(conditions = {}) {
    const result = {};

    const limits = {
        'Stealth Rock': 1,
        'Spikes': 3,
        'Toxic Spikes': 2
    };

    for (const [key, value] of Object.entries(conditions)) {
        const name = key.replace(/^move:\s*/i, '');

        if (!(name in limits)) continue;

        const layers = typeof value === 'object' && value !== null
            ? Number(value.layers ?? 1)
            : Number(value);

        if (!Number.isFinite(layers) || layers <= 0) {
            continue;
        }

        result[name] = Math.min(
            limits[name],
            Math.floor(layers)
        );
    }

    return result;
}

module.exports = { normalizeHazards };
