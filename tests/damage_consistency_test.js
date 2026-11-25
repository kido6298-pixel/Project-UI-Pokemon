const assert = require('node:assert/strict');
const fs = require('node:fs');

const { simulate } = require('../src/simulator');
const { RandomAgent } = require('../src/agents/random_agent');
const { EvidenceContext } = require('../src/evidence_context');
const { createRandom } = require('../src/random');
const { predictDamage } = require('../src/damage');
const { isSimpleAttack } = require('../src/move_candidates');
const { Dex } = require('pokemon-showdown');

const {
    team1,
    team2
} = require('../src/realistic_test_teams');

const dex = Dex.mod('gen4');

const actual = new Map(
    [...team1, ...team2].map(
        set => [set.species, set]
    )
);

class DiagnosticAgent extends RandomAgent {
    constructor(side, random) {
        super(random);
        this.side = side;
        this.context = new EvidenceContext(side);
        this.events = [];
    }

    observe(line) {
        this.context.observe(line);
        this.events.push(...this.context.drain());
    }

    choose(request) {
        this.context.updateRequest(request);
        return super.choose(request);
    }
}

function check(event, side) {
    const c = event.context;
    const set = actual.get(c.enemy.species);

    assert.ok(set);

    const move = dex.moves.get(event.move);

    if (!isSimpleAttack(move)) return null;

    const weatherMap = {
        RainDance: 'Rain',
        SunnyDay: 'Sun',
        Sandstorm: 'Sand',
        Hail: 'Hail'
    };

    const conditions =
        c.sideConditions[side] || {};

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

    if (weatherMap[c.weather]) {
        field.weather = weatherMap[c.weather];
    }

    const attacker = {
        species: set.species,
        level: 50,
        nature: set.nature,
        evs: set.evs,
        ivs: set.ivs || {},
        ability: c.enemy.ability || set.ability,
        item: c.enemy.item ?? set.item ?? '',
        status: c.enemy.status || '',
        boosts: c.enemy.boosts || {}
    };

    const exact = predictDamage({
        attacker,
        defender: c.own,
        move: event.move,
        field
    });

    const observedOnly = predictDamage({
        attacker: {
            ...attacker,
            item: c.enemy.item || ''
        },
        defender: c.own,
        move: event.move,
        field
    });

    const matches = result =>
        Array.isArray(result.rolls) &&
        result.rolls.includes(event.damage);

    return {
        species: set.species,
        defender: c.own.species,
        move: event.move,
        damage: event.damage,
        exactMin: exact.min,
        exactMax: exact.max,
        exactMatch: matches(exact),
        observedMin: observedOnly.min,
        observedMax: observedOnly.max,
        observedMatch: matches(observedOnly),
        actualItem: set.item,
        observedItem: c.enemy.item,
        ability: attacker.ability,
        weather: c.weather,
        context: c
    };
}

async function main() {
    const records = [];
    const started = performance.now();

    for (let i = 1; i <= 100; i++) {
        const agent1 = new DiagnosticAgent(
            'p1', createRandom(1000 + i)
        );

        const agent2 = new DiagnosticAgent(
            'p2', createRandom(2000 + i)
        );

        await simulate({
            team1,
            team2,
            agent1,
            agent2,
            seed: [i, 23456, 34567, 45678]
        });

        for (const agent of [agent1, agent2]) {
            for (const event of agent.events) {
                if (event.type !== 'damage') continue;

                const result = check(
                    event, agent.side
                );

                if (result) {
                    records.push({
                        battle: i,
                        turn: event.turn,
                        ...result
                    });
                }
            }
        }

        if (i % 25 === 0) {
            console.log(i + '/100');
        }
    }

    function summarize(list) {
        const exact = list.filter(
            r => r.exactMatch
        ).length;

        const observed = list.filter(
            r => r.observedMatch
        ).length;

        return {
            Count: list.length,
            ExactMatch: exact,
            ExactMismatch: list.length - exact,
            ExactRate: list.length
                ? (exact / list.length * 100)
                    .toFixed(2) + '%'
                : 'N/A',
            ObservedItemMatch: observed,
            ObservedItemMismatch:
                list.length - observed,
            RecoveredByItem: list.filter(
                r => r.exactMatch &&
                     !r.observedMatch
            ).length
        };
    }

    console.log('\n=== OVERALL DAMAGE VALIDATION ===');
    console.table(summarize(records));

    console.log('\n=== DAMAGE VALIDATION BY SPECIES ===');

    console.table(
        [...actual.keys()].map(species => ({
            Pokemon: species,
            ...summarize(records.filter(
                r => r.species === species
            ))
        }))
    );

    const scizor = records.filter(
        r => r.species === 'Scizor'
    );

    console.log('\n=== SCIZOR VALIDATION ===');
    console.table(summarize(scizor));

    function compact(r) {
        return {
            Battle: r.battle,
            Turn: r.turn,
            Pokemon: r.species,
            Defender: r.defender,
            Move: r.move,
            Damage: r.damage,
            ExactRange:
                r.exactMin + '-' + r.exactMax,
            ObservedRange:
                r.observedMin + '-' + r.observedMax,
            ExactMatch: r.exactMatch,
            Item: r.actualItem,
            KnownItem: r.observedItem,
            Ability: r.ability
        };
    }

    console.log('\n=== SCIZOR MISMATCH EXAMPLES ===');

    console.table(
        scizor.filter(
            r => !r.exactMatch || !r.observedMatch
        ).slice(0, 15).map(compact)
    );

    console.log('\n=== EXACT DAMAGE MISMATCHES ===');

    console.table(
        records.filter(
            r => !r.exactMatch
        ).slice(0, 20).map(compact)
    );

    fs.mkdirSync('logs', {recursive:true});

    fs.writeFileSync(
        'logs/damage_consistency.json',
        JSON.stringify({
            summary: summarize(records),
            records
        }, null, 2)
    );

    assert.ok(records.length > 0);

    console.log(
        '\nSeconds:',
        (performance.now() - started) / 1000
    );

    console.log(
        '\nDAMAGE CONSISTENCY ANALYSIS: COMPLETE'
    );
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
