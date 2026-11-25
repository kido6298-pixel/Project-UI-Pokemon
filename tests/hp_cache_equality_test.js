const assert = require('node:assert/strict');

const {
    Generations,
    Pokemon
} = require('@smogon/calc');

const {
    predictDamage
} = require('../src/damage');

const {
    HPCachedCalculations
} = require('../src/hp_cached_calculations');

const gen = Generations.get(4);

const cached = new HPCachedCalculations();

const attacks = [
    ['Garchomp','Sand Veil','Earthquake'],
    ['Garchomp','Sand Veil','Dragon Claw'],
    ['Suicune','Pressure','Ice Beam'],
    ['Starmie','Natural Cure','Surf'],
    ['Scizor','Technician','Bullet Punch'],
    ['Heatran','Flash Fire','Flamethrower'],
    ['Breloom','Poison Heal','Seed Bomb'],
    ['Scizor','Technician','X-Scissor'],
    ['Gengar','Levitate','Shadow Ball'],
    ['Zapdos','Pressure','Thunderbolt'],
    ['Metagross','Clear Body','Meteor Mash'],
    ['Snorlax','Thick Fat','Body Slam'],
    ['Tyranitar','Sand Stream','Crunch'],
    ['Tyranitar','Sand Stream','Stone Edge'],
    ['Gyarados','Intimidate','Waterfall'],
    ['Gyarados','Intimidate','Ice Fang'],
    ['Heatran','Flash Fire','Earth Power'],
    ['Zapdos','Pressure','Heat Wave'],
    ['Breloom','Poison Heal','Mach Punch'],
    ['Charizard','Blaze','Flamethrower'],
    ['Blastoise','Torrent','Surf'],
    ['Venusaur','Overgrow','Seed Bomb'],
    ['Heracross','Swarm','X-Scissor'],
    ['Typhlosion','Blaze','Eruption'],
    ['Wailord','Water Veil','Water Spout'],
    ['Heracross','Guts','Reversal'],
    ['Empoleon','Torrent','Brine'],
    ['Regigigas','Slow Start','Crush Grip']
];

const defenders = [
    ['Suicune','Pressure','Leftovers'],
    ['Garchomp','Sand Veil','Yache Berry'],
    ['Metagross','Clear Body','Occa Berry'],
    ['Gengar','Levitate','Focus Sash'],
    ['Scizor','Technician','Life Orb'],
    ['Snorlax','Thick Fat','Leftovers'],
    ['Tyranitar','Sand Stream','Chople Berry'],
    ['Gyarados','Intimidate','Wacan Berry'],
    ['Heatran','Flash Fire','Shuca Berry'],
    ['Zapdos','Pressure','Life Orb'],
    ['Starmie','Natural Cure','Expert Belt'],
    ['Breloom','Poison Heal','Toxic Orb']
];

const fields = [
    {},
    {weather:'Rain'},
    {weather:'Sun'},
    {weather:'Sand'},
    {defenderSide:{isReflect:true}},
    {defenderSide:{isLightScreen:true}}
];

function maxHP(config) {
    return new Pokemon(
        gen,
        config.species,
        config
    ).maxHP();
}

function hpValues(max) {
    return [...new Set([
        max,
        max - 1,
        Math.ceil(max / 2),
        Math.floor(max / 2),
        Math.floor(max / 3) + 1,
        Math.floor(max / 3),
        1
    ].filter(hp => hp > 0))];
}

let checks = 0;
let mismatches = 0;

const failures = [];
const results = [];

const started = performance.now();

for (const [species,ability,move] of attacks) {
    let moveChecks = 0;
    let moveFailures = 0;

    const attacker = {
        species,
        ability,
        level:50,
        nature:'Hardy',
        evs:{atk:252,spa:252}
    };

    const attackerMax = maxHP(attacker);

    for (const [
        defenderSpecies,
        defenderAbility,
        item
    ] of defenders) {
        const defender = {
            species:defenderSpecies,
            ability:defenderAbility,
            item,
            level:50,
            nature:'Hardy',
            evs:{hp:252,def:128,spd:128}
        };

        const defenderMax = maxHP(defender);

        for (const field of fields) {
            for (const attackerHP of hpValues(attackerMax)) {
                for (const defenderHP of hpValues(defenderMax)) {
                    const options = {
                        attacker:{
                            ...attacker,
                            curHP:attackerHP
                        },
                        defender:{
                            ...defender,
                            curHP:defenderHP
                        },
                        move,
                        field
                    };

                    const expected = predictDamage(options);
                    const actual = cached.predictDamage(options);

                    checks++;
                    moveChecks++;

                    try {
                        assert.deepEqual(actual,expected);
                    } catch {
                        mismatches++;
                        moveFailures++;

                        if (failures.length < 20) {
                            failures.push({
                                options,
                                expected,
                                actual
                            });
                        }
                    }
                }
            }
        }
    }

    results.push({
        Move:move,
        Ability:ability,
        Checks:moveChecks,
        Mismatches:moveFailures
    });
}

console.log('\n=== HP CACHE EQUALITY RESULTS ===');
console.table(results);

const stats = cached.stats();

const summary = {
    Checks:checks,
    Mismatches:mismatches,
    NormalizedRequests:stats.normalizedRequests,
    ExactRequests:stats.exactRequests,
    DamageHits:stats.damage.hits,
    DamageMisses:stats.damage.misses,
    HitRate:(
        stats.damage.hitRate * 100
    ).toFixed(2) + '%',
    Seconds:(
        (performance.now() - started) / 1000
    ).toFixed(3)
};

console.table(summary);

require('node:fs').writeFileSync(
    'logs/hp_cache_equality_test.json',
    JSON.stringify({
        summary,
        results,
        failures
    },null,2)
);

if (mismatches) {
    console.log(failures.slice(0,3));
    throw new Error('HP cache equality mismatch');
}

cached.clear();

assert.equal(cached.stats().damage.size,0);
assert.equal(cached.stats().normalizedRequests,0);
assert.equal(cached.stats().exactRequests,0);

console.log('Cache reset: PASS');

console.log('\nHP CACHE EQUALITY TEST: PASS');
