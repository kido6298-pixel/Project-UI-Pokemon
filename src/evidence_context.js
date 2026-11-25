const { BattleState } = require('./battle_state');
const { BattleEvidence } = require('./battle_evidence');
const { buildOwnConfig } = require('./pokemon_config');

class EvidenceContext {
    constructor(side) {
        this.side = side;
        this.state = new BattleState(side);
        this.observer = new BattleEvidence(side);
        this.contexts = new Map();
        this.events = [];
        this.missing = 0;
    }

    updateRequest(request) {
        this.state.updateRequest(request);
    }

    findOwn(ident) {
        const name = ident.replace(/^p[12][a-z]?: /, '');

        return this.state.own.find(p =>
            p.ident.replace(/^p[12][a-z]?: /, '') === name
        );
    }

    getOwnConfig(ident) {
        const pokemon = this.findOwn(ident);

        if (!pokemon) return null;

        const name = ident.replace(/^p[12][a-z]?: /, '');

        const observed =
            this.state.pokemon[this.side][name] || {};

        const hp = this.observer.hp.get(ident);

        if (!hp || hp.current <= 0) return null;

        const condition =
            hp.current + '/' + hp.max +
            (observed.status ? ' ' + observed.status : '');

        const current = {
            ...pokemon,
            condition
        };

        if (observed.item != null) {
            current.item = observed.item;
        }

        if (observed.ability) {
            current.ability = observed.ability;
        }

        return buildOwnConfig(current, observed);
    }

    capture(actor, target, move) {
        const ownIdent = actor.startsWith(this.side)
            ? actor
            : target;

        const enemyIdent = actor.startsWith(this.side)
            ? target
            : actor;

        if (!ownIdent?.startsWith(this.side)) return;
        if (!enemyIdent?.startsWith(this.state.opponent)) return;

        const name = enemyIdent.replace(
            /^p[12][a-z]?: /, ''
        );

        const enemy =
            this.state.pokemon[this.state.opponent][name];

        const own = this.getOwnConfig(ownIdent);

        if (!own || !enemy) return;

        const key = JSON.stringify([
            this.observer.turn,
            actor,
            move
        ]);

        this.contexts.set(key, structuredClone({
            own,
            enemy,
            ownIdent,
            enemyIdent,
            weather: this.state.weather,
            field: this.state.field,
            sideConditions: this.state.sideConditions
        }));
    }

    observe(line) {
        const parts = line.split('|');

        if (parts[1] === 'move') {
            this.capture(
                parts[2],
                parts[4] || '',
                parts[3]
            );
        }

        this.observer.observe(line);
        this.state.observe(line);

        for (const event of this.observer.drain()) {
            const actor = ['damage', 'dealtDamage'].includes(event.type)
                ? event.attacker
                : event.ownFirst
                    ? event.own
                    : event.enemy;

            const move = ['damage', 'dealtDamage'].includes(event.type)
                ? event.move
                : event.ownFirst
                    ? event.ownMove
                    : event.enemyMove;

            const key = JSON.stringify([
                event.turn,
                actor,
                move
            ]);

            const context = this.contexts.get(key);

            if (!context) {
                this.missing++;
                continue;
            }

            this.events.push({
                ...event,
                context: structuredClone(context)
            });
        }

        if (parts[1] === 'turn') {
            this.contexts.clear();
        }
    }

    drain() {
        const events = this.events;
        this.events = [];
        return events;
    }
}

module.exports = { EvidenceContext };

