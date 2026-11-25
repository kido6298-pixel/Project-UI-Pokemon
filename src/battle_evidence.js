class BattleEvidence {
    constructor(side) {
        this.side = side;
        this.opponent = side === 'p1' ? 'p2' : 'p1';
        this.turn = 0;
        this.hp = new Map();
        this.moves = [];
        this.pending = null;
        this.events = [];
        this.sequence = 0;
        this.orderUnsafe = false;
    }

    sideOf(ident) {
        return ident?.match(/^p[12]/)?.[0];
    }

    parseHP(condition) {
        const match = condition?.match(/^(\d+)\/(\d+)/);

        if (!match) return null;

        return {
            current: Number(match[1]),
            max: Number(match[2])
        };
    }

    finishMove() {
        const move = this.pending;

        if (
            move &&
            !move.invalid &&
            move.hits.length === 1
        ) {
            const hit = move.hits[0];

            if (
                hit.before &&
                hit.after &&
                hit.after.current > 0 &&
                hit.before.max === hit.after.max &&
                hit.before.current > hit.after.current
            ) {
                this.events.push({
                    type: this.sideOf(move.actor) === this.side
                        ? 'dealtDamage'
                        : 'damage',
                    id: 'damage-' + (++this.sequence),
                    turn: this.turn,
                    attacker: move.actor,
                    defender: hit.target,
                    move: move.name,
                    damage:
                        hit.before.current -
                        hit.after.current,
                    beforeHP: hit.before.current,
                    afterHP: hit.after.current,
                    maxHP: hit.before.max
                });
            }
        }

        this.pending = null;
    }

    finishTurn() {
        this.finishMove();

        if (
            !this.orderUnsafe &&
            this.moves.length === 2 &&
            this.sideOf(this.moves[0].actor) !==
            this.sideOf(this.moves[1].actor)
        ) {
            const ownFirst =
                this.sideOf(this.moves[0].actor) ===
                this.side;

            const own = this.moves.find(
                m => this.sideOf(m.actor) === this.side
            );

            const enemy = this.moves.find(
                m => this.sideOf(m.actor) === this.opponent
            );

            this.events.push({
                type: 'order',
                id: 'order-' + (++this.sequence),
                turn: this.turn,
                ownFirst,
                own: own.actor,
                enemy: enemy.actor,
                ownMove: own.name,
                enemyMove: enemy.name
            });
        }

        this.moves = [];
        this.orderUnsafe = false;
    }

    observe(line) {
        const parts = line.split('|');
        const type = parts[1];
        const actor = parts[2];

        if (type === 'turn') {
            this.finishTurn();
            this.turn = Number(actor);
            return;
        }

        if (type === 'win' || type === 'tie') {
            this.finishTurn();
            return;
        }

        if (type === 'switch' || type === 'drag') {
            this.finishMove();
            this.orderUnsafe = true;

            const hp = this.parseHP(parts[4]);

            if (hp) this.hp.set(actor, hp);

            return;
        }

        if (type === 'move') {
            this.finishMove();

            const move = {
                actor,
                name: parts[3],
                target: parts[4],
                invalid: parts.slice(5).some(
                    p => p.startsWith('[from]')
                ),
                hits: []
            };

            this.moves.push(move);
            this.pending = move;

            if (move.invalid) this.orderUnsafe = true;

            return;
        }

        if ([
            '-crit',
            '-hitcount',
            '-miss',
            '-immune',
            '-fail',
            '-activate'
        ].includes(type)) {
            if (this.pending) {
                this.pending.invalid = true;
            }

            if (type === '-activate') {
                this.orderUnsafe = true;
            }
        }

        if ([
            '-boost',
            '-unboost',
            '-setboost',
            '-clearboost',
            '-clearallboost',
            '-status',
            '-curestatus',
            '-weather',
            '-fieldstart',
            '-fieldend',
            '-item',
            '-enditem',
            '-ability'
        ].includes(type)) {
            this.orderUnsafe = true;
        }

        if (type === '-damage') {
            const before = this.hp.get(actor);
            const after = this.parseHP(parts[3]);

            const indirect = parts.slice(4).some(
                p => p.startsWith('[from]') ||
                     p.startsWith('[of]')
            );

            if (
                this.pending &&
                !indirect &&
                actor === this.pending.target &&
                this.sideOf(actor) !==
                    this.sideOf(this.pending.actor) &&
                [this.side, this.opponent].includes(
                    this.sideOf(actor)
                ) &&
                [this.side, this.opponent].includes(
                    this.sideOf(this.pending.actor)
                )
            ) {
                this.pending.hits.push({
                    target: actor,
                    before,
                    after
                });
            }

            if (after) {
                this.hp.set(actor, after);
            } else {
                this.hp.delete(actor);
            }

            return;
        }

        if (type === '-heal') {
            const hp = this.parseHP(parts[3]);

            if (hp) this.hp.set(actor, hp);
        }
    }

    drain() {
        const events = this.events;
        this.events = [];
        return events;
    }
}

module.exports = { BattleEvidence };

