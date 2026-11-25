const assert = require('node:assert/strict');
const { Generations, Pokemon } = require('@smogon/calc');
const { Dex } = require('pokemon-showdown');

const gen = Generations.get(4);
const dex = Dex.mod('gen4');

const speciesList = [
    'Garchomp', 'Metagross', 'Gengar',
    'Scizor', 'Starmie', 'Snorlax',
    'Suicune', 'Tyranitar', 'Gyarados',
    'Heatran', 'Zapdos', 'Breloom'
];

const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

const natures = [
    'Hardy', 'Adamant', 'Jolly',
    'Modest', 'Timid', 'Bold',
    'Calm', 'Brave', 'Relaxed'
];

let checked = 0;
let errors = 0;

for (const species of speciesList) {
    for (const nature of natures) {
        for (const iv of [0, 15, 31]) {
            for (const ev of [0, 4, 252]) {
                const original = new Pokemon(gen, species, {
                    level: 50,
                    nature,
                    ivs: Object.fromEntries(
                        stats.map(s => [s, iv])
                    ),
                    evs: {
                        hp: ev,
                        atk: ev
                    }
                });

                const baseStats = {
                    ...dex.species.get(species).baseStats
                };

                for (const stat of stats) {
                    baseStats[stat] =
                        original.rawStats[stat] -
                        (stat === 'hp' ? 75 : 20);
                }

                const rebuilt = new Pokemon(gen, species, {
                    level: 50,
                    nature: 'Hardy',
                    evs: {},
                    ivs: Object.fromEntries(
                        stats.map(s => [s, 31])
                    ),
                    overrides: {baseStats}
                });

                for (const stat of stats) {
                    checked++;

                    if (
                        original.rawStats[stat] !==
                        rebuilt.rawStats[stat]
                    ) {
                        errors++;

                        if (errors <= 10) {
                            console.log('MISMATCH', {
                                species,
                                nature,
                                iv,
                                ev,
                                stat,
                                expected: original.rawStats[stat],
                                actual: rebuilt.rawStats[stat]
                            });
                        }
                    }
                }
            }
        }
    }
}

console.log('\n=== STAT RECONSTRUCTION ===');
console.log('Pokemon species:', speciesList.length);
console.log('Configurations:', checked / 6);
console.log('Stats checked:', checked);
console.log('Errors:', errors);
console.log('Accuracy:', ((checked-errors)/checked*100).toFixed(2) + '%');

assert.equal(errors, 0);

console.log('STAT RECONSTRUCTION TEST: PASS');
