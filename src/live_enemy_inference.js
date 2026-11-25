const { Dex } = require('pokemon-showdown');
const { EnemyBelief } = require('./enemy_belief');
const { EvidenceContext } = require('./evidence_context');
const { isSimpleAttack } = require('./move_candidates');

const dex = Dex.mod('gen4');

class LiveEnemyInference {
    constructor(side) {
        this.side = side;
        this.context = new EvidenceContext(side);
        this.belief = new EnemyBelief();

        this.stats = {
            damageAccepted: 0,
            dealtDamageAccepted: 0,
            orderAccepted: 0,
            duplicates: 0,
            skipped: 0,
            contradictions: 0,
            errors: 0
        };

        this.lastError = null;
        this.keys = new Set();
        this.confirmedItems = new Map();
    }

    updateRequest(request) {
        this.context.updateRequest(request);
    }

    observe(line) {
        this.context.observe(line);

        const parts = line.split('|');

        if (
            parts[1] === '-damage' &&
            parts[2]?.startsWith(
                this.context.state.opponent
            ) &&
            parts.includes('[from] item: Life Orb')
        ) {
            const key = parts[2];

            const name = key.replace(
                /^p[12][a-z]?: /, ''
            );

            const enemy =
                this.context.state.pokemon[
                    this.context.state.opponent
                ][name];

            if (enemy) {
                enemy.item = 'Life Orb';
                this.confirmedItems.set(key, 'Life Orb');

                this.belief.update(key, {
                    ...enemy,
                    item: 'Life Orb'
                });

                this.keys.add(key);
            }
        }

        for (const event of this.context.drain()) {
            try {
                this.process(event);
            } catch (error) {
                this.stats.errors++;
                this.lastError = error.message;
            }
        }
    }

    process(event) {
        if (event.type === 'dealtDamage') {
            return this.processDealtDamage(event);
        }
        const context = event.context;
        const key = context.enemyIdent;

        const enemyMove = event.type === 'damage'
            ? event.move
            : event.enemyMove;

        const move = dex.moves.get(enemyMove);

        if (!move.exists) {
            this.stats.skipped++;
            return;
        }

        const observed = {
            ...context.enemy,
            item: context.enemy.item ??
                this.confirmedItems.get(key) ??
                null,
            moves: [...new Set([
                ...(context.enemy.moves || []),
                enemyMove
            ])]
        };

        this.belief.update(key, observed);
        this.keys.add(key);

        const before = this.belief.get(key);

        let accepted = false;

        if (event.type === 'damage') {
            if (!isSimpleAttack(move)) {
                this.stats.skipped++;
                return;
            }

            const weatherMap = {
                RainDance: 'Rain',
                SunnyDay: 'Sun',
                Sandstorm: 'Sand',
                Hail: 'Hail'
            };

            const conditions =
                context.sideConditions[this.side] || {};

            const hasCondition = name =>
                !!(
                    conditions[name] ||
                    conditions['move: ' + name]
                );

            const field = {
                defenderSide: {
                    isReflect: hasCondition('Reflect'),
                    isLightScreen: hasCondition('Light Screen')
                }
            };

            const weather = weatherMap[context.weather];

            if (weather) field.weather = weather;

            accepted = this.belief.addEvidence(
                key,
                'damage',
                {
                    own: context.own,
                    enemyMove,
                    observedDamage: event.damage,
                    field,
                    tolerance: 0,
                    reliability: 0.90
                },
                event.id
            );

            if (accepted) {
                this.stats.damageAccepted++;
            }
        } else if (event.type === 'order') {
            const ownMove = dex.moves.get(
                event.ownMove
            );

            if (!ownMove.exists ||
                ownMove.priority !== move.priority) {
                this.stats.skipped++;
                return;
            }

            if (context.weather) {
                this.stats.skipped++;
                return;
            }

            const trickRoom = Object.keys(
                context.field || {}
            ).some(
                name => name.toLowerCase()
                    .includes('trick room')
            );

            accepted = this.belief.addEvidence(
                key,
                'order',
                {
                    own: context.own,
                    ownFirst: event.ownFirst,
                    ownPriority: ownMove.priority,
                    enemyPriority: move.priority,
                    trickRoom,
                    reliability: 0.90
                },
                event.id
            );

            if (accepted) {
                this.stats.orderAccepted++;
            }
        }

        if (!accepted) {
            this.stats.duplicates++;
        }

        const after = this.belief.get(key);

        this.stats.contradictions += Math.max(
            0,
            after.contradictions -
            before.contradictions
        );
    }

    processDealtDamage(event) {
        const context = event.context;
        const key = context.enemyIdent;
        const move = dex.moves.get(event.move);

        if (
            !isSimpleAttack(move) ||
            event.maxHP !== 100
        ) {
            this.stats.skipped++;
            return;
        }

        const observed = {
            ...context.enemy,
            item: context.enemy.item ??
                this.confirmedItems.get(key) ??
                null
        };

        this.belief.update(key, observed);
        this.keys.add(key);

        const before = this.belief.get(key);

        const conditions =
            context.sideConditions[
                this.context.state.opponent
            ] || {};

        const hasCondition = name =>
            !!(
                conditions[name] ||
                conditions['move: ' + name]
            );

        const field = {
            defenderSide: {
                isReflect: hasCondition('Reflect'),
                isLightScreen: hasCondition('Light Screen')
            }
        };

        const weatherMap = {
            RainDance: 'Rain',
            SunnyDay: 'Sun',
            Sandstorm: 'Sand',
            Hail: 'Hail'
        };

        const weather = weatherMap[context.weather];

        if (weather) field.weather = weather;

        const accepted = this.belief.addEvidence(
            key,
            'dealtDamage',
            {
                own: context.own,
                ownMove: event.move,
                before: event.beforeHP,
                after: event.afterHP,
                field,
                reliability: 0.90
            },
            event.id
        );

        if (accepted) {
            this.stats.dealtDamageAccepted++;
        } else {
            this.stats.duplicates++;
        }

        const after = this.belief.get(key);

        this.stats.contradictions += Math.max(
            0,
            after.contradictions -
            before.contradictions
        );
    }

    snapshot() {
        return [...this.keys].map(key => ({
            key,
            ...this.belief.get(key)
        }));
    }
}

module.exports = { LiveEnemyInference };




