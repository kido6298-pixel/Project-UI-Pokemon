const assert = require('node:assert/strict');

const {
    Generations,
    Pokemon
} = require('@smogon/calc');

const {
    predictDamage
} = require('../src/damage');

const {
    getHPDependencies
} = require('../src/hp_dependencies');

const gen = Generations.get(4);

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
    ['Breloom','Poison Heal','Mach Punch']
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

function damageOnly(result) {
    return {
        min: result.min,
        max: result.max,
        average: result.average,
        rolls: result.rolls,
        immune: result.immune,
        maxHP: result.maxHP,
        minPercent: result.minPercent,
        maxPercent: result.maxPercent
    };
}

let checks = 0;
let mismatches = 0;
let skipped = 0;

const results = [];
const failures = [];

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

        const dependencies = getHPDependencies({
            attacker,
            defender,
            move
        });

        if (
            dependencies.attackerDependent ||
            dependencies.defenderDependent
        ) {
            skipped++;
            continue;
        }

        for (const field of fields) {
            const baseline = damageOnly(
                predictDamage({
                    attacker,
                    defender,
                    move,
                    field
                })
            );

            for (const attackerHP of hpValues(attackerMax)) {
                for (const defenderHP of hpValues(defenderMax)) {
                    const actual = damageOnly(
                        predictDamage({
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
                        })
                    );

                    checks++;
                    moveChecks++;

                    try {
                        assert.deepEqual(actual,baseline);
                    } catch {
                        mismatches++;
                        moveFailures++;

                        if (failures.length < 30) {
                            failures.push({
                                species,
                                defenderSpecies,
                                move,
                                attackerHP,
                                defenderHP,
                                field,
                                baseline,
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
        Checks:moveChecks,
        Mismatches:moveFailures
    });
}

console.log('\n=== HP INDEPENDENCE RESULTS ===');
console.table(results);

const summary = {
    Moves:attacks.length,
    Defenders:defenders.length,
    Fields:fields.length,
    Checks:checks,
    Mismatches:mismatches,
    Skipped:skipped,
    Seconds:(
        (performance.now() - started) / 1000
    ).toFixed(3)
};

console.table(summary);

require('node:fs').writeFileSync(
    'logs/hp_independence_test.json',
    JSON.stringify({
        summary,
        results,
        failures
    },null,2)
);

if (mismatches) {
    console.log(failures.slice(0,3));
    throw new Error('HP independence mismatch');
}

console.log('\nHP INDEPENDENCE TEST: PASS');
