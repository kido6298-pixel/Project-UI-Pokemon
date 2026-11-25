const {
    estimateEnemyBuilds
} = require('./enemy_builds');

const {
    updateBuildsFromOrder
} = require('./enemy_order_inference');

const {
    updateBuildsFromDamage
} = require('./enemy_damage_inference');

const {
    updateBuildsFromDealtDamage
} = require('./enemy_defense_inference');

class EnemyBelief {
    constructor() {
        this.records = new Map();
    }

    update(key, observed) {
        let record = this.records.get(key);

        if (!record) {
            record = {
                observed: {},
                evidence: [],
                evidenceKeys: new Set(),
                builds: [],
                contradictions: 0
            };

            this.records.set(key, record);
        }

        record.observed = {
            ...record.observed,
            ...observed,
            moves: [...new Set([
                ...(record.observed.moves || []),
                ...(observed.moves || [])
            ])]
        };

        this.rebuild(record);

        return this.get(key);
    }

    rebuild(record) {
        let builds = estimateEnemyBuilds(
            record.observed
        );

        let contradictions = 0;

        for (const evidence of record.evidence) {
            const historical = builds.map(build => ({
                ...build,
                config: {
                    ...build.config,
                    status: evidence.context.status,
                    boosts: evidence.context.boosts,
                    item: evidence.context.itemKnown
                        ? evidence.context.item
                        : build.config.item,
                    ability: evidence.context.ability ||
                        build.config.ability
                }
            }));

            const result = evidence.type === 'order'
                ? updateBuildsFromOrder({
                    ...evidence.options,
                    builds: historical
                })
                : evidence.type === 'dealtDamage'
                    ? updateBuildsFromDealtDamage({
                        ...evidence.options,
                        builds: historical
                    })
                    : updateBuildsFromDamage({
                        ...evidence.options,
                        builds: historical
                    });

            if (result.contradiction) {
                contradictions++;
                continue;
            }

            const probabilities = new Map(
                result.builds.map(b => [
                    b.name,
                    b.probability
                ])
            );

            builds = builds.map(build => ({
                ...build,
                probability: probabilities.get(
                    build.name
                )
            }));
        }

        record.builds = builds.sort(
            (a, b) => b.probability - a.probability
        );

        record.contradictions = contradictions;
    }

    addEvidence(key, type, options, eventId) {
        const record = this.records.get(key);

        if (!record) {
            throw new Error('Unknown enemy: ' + key);
        }

        if (!eventId) {
            throw new Error('Missing evidence ID');
        }

        const context = {
            status: record.observed.status || '',
            boosts: {
                ...(record.observed.boosts || {})
            },
            itemKnown: record.observed.item != null,
            item: record.observed.item || '',
            ability: record.observed.ability || ''
        };

        const signature = type === 'order'
            ? JSON.stringify([
                type,
                options.own,
                options.ownPriority || 0,
                options.enemyPriority || 0,
                options.ownFirst,
                !!options.trickRoom,
                context
            ])
            : type + ':' + eventId;

        if (record.evidenceKeys.has(signature)) {
            return false;
        }

        record.evidenceKeys.add(signature);

        record.evidence.push({
            type,
            eventId,
            options: structuredClone(options),
            context
        });

        this.rebuild(record);

        return true;
    }

    get(key) {
        const record = this.records.get(key);

        if (!record) return null;

        return structuredClone({
            observed: record.observed,
            builds: record.builds,
            evidenceCount: record.evidence.length,
            contradictions: record.contradictions
        });
    }

    reset() {
        this.records.clear();
    }
}

module.exports = { EnemyBelief };

