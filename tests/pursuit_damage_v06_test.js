const assert=require('node:assert/strict');

const {
    Pokemon,Move,Field,Generations,calculate
}=require('@smogon/calc');

const {
    predictPursuitDamage:pursuit
}=require('../src/pursuit_damage_v06');

const gen=Generations.get(4);

function p(species,ability,extra={}) {
    return {
        species,
        ability,
        level:50,
        nature:'Hardy',
        ...extra
    };
}

function test(name,fn) {
    fn();
    console.log(name+': PASS');
}

const tyranitar=p('Tyranitar','Sand Stream');
const scizor=p('Scizor','Technician');
const gengar=p('Gengar','Levitate');
const suicune=p('Suicune','Pressure');

const rows=[];

function compare(attacker,defender) {
    const normal=pursuit({
        attacker,defender
    });

    const switching=pursuit({
        attacker,defender,switching:true
    });

    rows.push({
        attacker:attacker.species,
        ability:attacker.ability,
        defender:defender.species,
        normalMin:Math.min(...normal.rolls),
        normalMax:Math.max(...normal.rolls),
        switchMin:Math.min(...switching.rolls),
        switchMax:Math.max(...switching.rolls)
    });

    return {normal,switching};
}

test('Normal and switching base power',()=>{
    const {normal,switching}=compare(
        tyranitar,gengar
    );

    assert.equal(normal.nominalBasePower,40);
    assert.equal(switching.nominalBasePower,80);

    assert.ok(
        switching.average>normal.average
    );
});

test('Technician normal and switching damage',()=>{
    const {normal,switching}=compare(
        scizor,suicune
    );

    assert.ok(
        switching.average>normal.average
    );

    const withoutTechnician=compare(
        {...scizor,ability:'Swarm'},
        suicune
    );

    assert.ok(
        normal.average>
        withoutTechnician.normal.average
    );

    console.log(
        'Technician switching ratio:',
        switching.average/
        withoutTechnician.switching.average
    );
});

test('Actual calculator switching flag',()=>{
    const {species:as,...ao}=tyranitar;
    const {species:ds,...dopt}=gengar;

    const expected=calculate(
        gen,
        new Pokemon(gen,as,ao),
        new Pokemon(gen,ds,dopt),
        new Move(gen,'Pursuit'),
        new Field({
            defenderSide:{
                isSwitching:'out'
            }
        })
    );

    const actual=pursuit({
        attacker:tyranitar,
        defender:gengar,
        switching:true
    });

    assert.deepEqual(
        actual.rolls,
        expected.damage
    );
});

test('Reflect preserved',()=>{
    const normal=pursuit({
        attacker:tyranitar,
        defender:suicune,
        switching:true
    });

    const reflect=pursuit({
        attacker:tyranitar,
        defender:suicune,
        switching:true,
        field:{
            defenderSide:{
                isReflect:true
            }
        }
    });

    assert.ok(
        reflect.average<normal.average
    );
});

test('Switch flag removed for normal attack',()=>{
    const expected=pursuit({
        attacker:tyranitar,
        defender:gengar
    });

    const actual=pursuit({
        attacker:tyranitar,
        defender:gengar,
        switching:false,
        field:{
            defenderSide:{
                isSwitching:'out'
            }
        }
    });

    assert.deepEqual(
        actual.rolls,expected.rolls
    );
});

test('Damage calculator input and immutability',()=>{
    const input={
        attacker:structuredClone(scizor),
        defender:structuredClone(suicune),
        switching:true,
        field:{
            weather:'Sand',
            defenderSide:{
                isReflect:true
            }
        }
    };

    const original=structuredClone(input);

    pursuit({
        ...input,
        damageCalculator:options=>{
            assert.equal(options.move,'Pursuit');
            assert.equal(
                options.field.defenderSide.isSwitching,
                'out'
            );
            assert.equal(
                options.field.defenderSide.isReflect,
                true
            );
            assert.equal(
                options.field.weather,'Sand'
            );

            return {rolls:[20]};
        }
    });

    assert.deepEqual(input,original);
});

test('Invalid switching state rejected',()=>{
    assert.throws(()=>pursuit({
        attacker:tyranitar,
        defender:gengar,
        switching:'yes'
    }));
});

console.table(rows);

console.log('PURSUIT DAMAGE V06 TEST: PASS');