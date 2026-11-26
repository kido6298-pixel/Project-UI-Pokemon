const assert=require('node:assert/strict');

const {
    getStatusMoveEffect,
    predictStatusMove
}=require('../src/status_move_effects');

const base={
    species:'Suicune',
    maxHP:200,
    currentHP:80,
    status:null,
    boosts:{},
    attackProfile:{
        physical:false,
        special:true
    }
};

for (const move of [
    'Recover',
    'Slack Off',
    'Soft-Boiled',
    'Milk Drink',
    'Roost'
]) {
    const result=predictStatusMove(base,move);

    assert.equal(result.supported,true);
    assert.equal(result.success,true);
    assert.equal(result.after.currentHP,180);

    assert.ok(
        Math.abs(result.valueChange-0.25)
        <1e-12
    );
}

console.log('Recovery effects: PASS');

const capped=predictStatusMove({
    ...base,currentHP:180
},'Recover');

assert.equal(capped.after.currentHP,200);

const full=predictStatusMove({
    ...base,currentHP:200
},'Recover');

assert.equal(full.success,false);
assert.equal(full.valueChange,0);

console.log('Recovery HP limits: PASS');

const expected={
    'Calm Mind':{spa:1,spd:1},
    'Swords Dance':{atk:2},
    'Dragon Dance':{atk:1,spe:1},
    'Nasty Plot':{spa:2},
    'Bulk Up':{atk:1,def:1},
    'Agility':{spe:2},
    'Curse':{atk:1,def:1,spe:-1}
};

for (const [move,changes] of
    Object.entries(expected)) {

    const result=predictStatusMove(base,move);

    assert.equal(result.supported,true);
    assert.equal(result.success,true);

    for (const [stat,value] of
        Object.entries(changes)) {

        assert.equal(
            result.after.boosts[stat],
            value
        );
    }
}

console.log('Setup move effects: PASS');

const maxed=predictStatusMove({
    ...base,
    boosts:{spa:6,spd:6}
},'Calm Mind');

assert.equal(maxed.success,false);
assert.equal(maxed.valueChange,0);

console.log('Setup stage limits: PASS');

assert.equal(
    getStatusMoveEffect('Curse',{
        species:'Gengar'
    }),
    null
);

assert.equal(
    getStatusMoveEffect('Roost',base)
        .requiresTimingModel,
    true
);

assert.equal(
    predictStatusMove(base,'Surf').supported,
    false
);

assert.equal(
    predictStatusMove(base,'Rest').supported,
    false
);

console.log('Special mechanics exclusion: PASS');

const fainted=predictStatusMove({
    ...base,currentHP:0
},'Recover');

assert.equal(fainted.success,false);
assert.equal(fainted.after.currentHP,0);

assert.deepEqual(base.boosts,{});
assert.equal(base.currentHP,80);

console.log('Fainted and input protection: PASS');

console.log('\n=== STATUS MOVE VALUES ===');

console.table(
    ['Recover','Calm Mind','Agility',
     'Nasty Plot','Swords Dance'].map(move=>{
        const result=predictStatusMove(base,move);

        return {
            move,
            beforeHP:result.before.currentHP,
            afterHP:result.after.currentHP,
            valueChange:Number(
                result.valueChange.toFixed(4)
            )
        };
    })
);

console.log('STATUS MOVE EFFECTS TEST: PASS');