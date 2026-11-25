const {
    calculate,
    Generations,
    Pokemon,
    Move,
    Field
} = require('@smogon/calc');

const gen = Generations.get(4);

function predictDamage({
    attacker,
    defender,
    move,
    field = {},
    moveOptions = {}
}) {
    const {species: atkSpecies, ...atkOptions} = attacker;
    const {species: defSpecies, ...defOptions} = defender;

    const atk = new Pokemon(gen, atkSpecies, {
        level: 50,
        ...atkOptions
    });

    const def = new Pokemon(gen, defSpecies, {
        level: 50,
        ...defOptions
    });

    const result = calculate(
        gen,
        atk,
        def,
        new Move(gen, move, moveOptions),
        new Field(field)
    );

    const [min, max] = result.range();
    const maxHP = def.maxHP();
    const currentHP = def.curHP();

    // Only ordinary single-hit damage distributions.
    const rolls = typeof result.damage === 'number'
        ? [result.damage]
        : Array.isArray(result.damage) &&
          result.damage.every(Number.isFinite)
            ? result.damage
            : null;

    const average = rolls
        ? rolls.reduce((a, b) => a + b, 0) / rolls.length
        : null;

    const koChance = rolls && currentHP > 0
        ? rolls.filter(d => d >= currentHP).length / rolls.length
        : null;

    return {
        move,
        min,
        max,
        average,
        maxHP,
        currentHP,
        minPercent: min / maxHP * 100,
        maxPercent: max / maxHP * 100,
        koChance,
        immune: max === 0,
        rolls
    };
}

function predictScenarios({
    attacker,
    defender,
    move,
    scenarios,
    field = {},
    moveOptions = {}
}) {
    return scenarios.map(scenario => ({
        name: scenario.name,
        ...predictDamage({
            attacker,
            defender: {
                ...defender,
                ...scenario.options
            },
            move,
            field,
            moveOptions
        })
    }));
}

module.exports = {
    predictDamage,
    predictScenarios
};
