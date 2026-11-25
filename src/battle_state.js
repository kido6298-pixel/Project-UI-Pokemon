class BattleState {
    constructor(side) {
        this.side = side;
        this.opponent = side === 'p1' ? 'p2' : 'p1';
        this.turn = 0;
        this.weather = null;
        this.field = {};
        this.sideConditions = {p1: {}, p2: {}};
        this.preview = {p1: [], p2: []};
        this.pokemon = {p1: {}, p2: {}};
        this.active = {p1: null, p2: null};
        this.own = [];
        this.history = [];
    }

    getPokemon(ident) {
        if (!/^p[12][a-z]?: /.test(ident || '')) {
            return null;
        }

        const side = ident.slice(0, 2);
        const name = ident.split(': ').slice(1).join(': ');

        if (!this.pokemon[side][name]) {
            this.pokemon[side][name] = {
                name,
                species: null,
                hp: null,
                status: null,
                moves: [],
                item: null,
                ability: null,
                fainted: false,
                boosts: {
                    atk: 0, def: 0, spa: 0,
                    spd: 0, spe: 0,
                    accuracy: 0, evasion: 0
                }
            };
        }

        return this.pokemon[side][name];
    }

    updateHP(pokemon, condition) {
        if (!pokemon || !condition) return;

        const match = condition.match(/^(\d+)\/(\d+)/);

        if (match) {
            pokemon.hp = {
                current: Number(match[1]),
                max: Number(match[2]),
                percent: Number(match[1]) /
                    Number(match[2]) * 100
            };

            pokemon.status =
                condition.split(' ')[1] || null;
        }

        if (condition.includes('fnt')) {
            pokemon.fainted = true;

            if (pokemon.hp) {
                pokemon.hp.current = 0;
                pokemon.hp.percent = 0;
            }
        }
    }

    updateRequest(request) {
        this.own = JSON.parse(JSON.stringify(
            request.side?.pokemon || []
        ));
    }

    observe(line) {
        const parts = line.split('|');
        const event = parts[1];
        const target = parts[2];

        switch (event) {
            case 'clearpoke':
                this.preview = {p1: [], p2: []};
                break;

            case 'poke':
                this.preview[target]?.push({
                    species: parts[3].split(',')[0],
                    details: parts[3]
                });
                break;

            case 'turn':
                this.turn = Number(target);
                break;

            case 'switch':
            case 'drag': {
                const p = this.getPokemon(target);
                if (!p) break;

                p.species = parts[3].split(',')[0];
                this.updateHP(p, parts[4]);

                for (const stat of Object.keys(p.boosts)) {
                    p.boosts[stat] = 0;
                }

                this.active[target.slice(0, 2)] = p.name;
                break;
            }

            case 'move': {
                const p = this.getPokemon(target);

                if (p && !p.moves.includes(parts[3])) {
                    p.moves.push(parts[3]);
                }
                break;
            }

            case '-damage':
            case '-heal': {
                const p = this.getPokemon(target);
                this.updateHP(p, parts[3]);

                const item = parts.slice(4).find(
                    x => x.startsWith('[from] item: ')
                );

                if (p && item &&
                    !parts.some(x => x.startsWith('[of]'))) {
                    p.item = item.slice(13);
                }
                break;
            }

            case '-ability': {
                const p = this.getPokemon(target);
                if (p) p.ability = parts[3];
                break;
            }

            case '-item': {
                const p = this.getPokemon(target);
                if (p) p.item = parts[3];
                break;
            }

            case '-enditem': {
                const p = this.getPokemon(target);
                if (p) p.item = null;
                break;
            }

            case '-status': {
                const p = this.getPokemon(target);
                if (p) p.status = parts[3];
                break;
            }

            case '-curestatus': {
                const p = this.getPokemon(target);
                if (p) p.status = null;
                break;
            }

            case 'faint': {
                const p = this.getPokemon(target);
                this.updateHP(p, '0 fnt');

                if (p) {
                    this.active[target.slice(0, 2)] = null;
                }
                break;
            }

            case '-boost':
            case '-unboost':
            case '-setboost': {
                const p = this.getPokemon(target);
                const stat = parts[3];
                const amount = Number(parts[4]);

                if (!p || !(stat in p.boosts)) break;

                const value = event === '-setboost'
                    ? amount
                    : p.boosts[stat] +
                        (event === '-boost' ? amount : -amount);

                p.boosts[stat] = Math.max(-6, Math.min(6, value));
                break;
            }

            case '-clearboost': {
                const p = this.getPokemon(target);
                if (p) {
                    for (const stat of Object.keys(p.boosts)) {
                        p.boosts[stat] = 0;
                    }
                }
                break;
            }

            case '-clearallboost':
                for (const side of ['p1', 'p2']) {
                    for (const p of Object.values(this.pokemon[side])) {
                        for (const stat of Object.keys(p.boosts)) {
                            p.boosts[stat] = 0;
                        }
                    }
                }
                break;

            case '-sidestart': {
                const side = target.slice(0, 2);
                const condition = parts[3].replace(/^move: /, '');
                const conditions = this.sideConditions[side];

                if (!conditions) break;

                const maxLayers = {
                    'Spikes': 3,
                    'Toxic Spikes': 2
                }[condition] || 1;

                conditions[condition] = Math.min(
                    maxLayers,
                    (conditions[condition] || 0) + 1
                );
                break;
            }

            case '-sideend': {
                const side = target.slice(0, 2);
                const condition = parts[3].replace(/^move: /, '');

                if (this.sideConditions[side]) {
                    delete this.sideConditions[side][condition];
                }
                break;
            }

            case '-fieldstart':
                this.field[target.replace(/^move: /, '')] = {
                    startedTurn: this.turn
                };
                break;

            case '-fieldend':
                delete this.field[target.replace(/^move: /, '')];
                break;

            case '-weather':
                this.weather =
                    target === 'none' ? null : target;
                break;
        }

        if (['switch', 'drag', 'move', 'faint'].includes(event)) {
            this.history.push({
                turn: this.turn,
                event,
                target,
                detail: parts[3] || null
            });
        }
    }

    snapshot() {
        return JSON.parse(JSON.stringify({
            turn: this.turn,
            weather: this.weather,
            field: this.field,
            sideConditions: this.sideConditions,
            preview: this.preview,
            pokemon: this.pokemon,
            active: this.active,
            own: this.own,
            history: this.history
        }));
    }
}

module.exports = { BattleState };

