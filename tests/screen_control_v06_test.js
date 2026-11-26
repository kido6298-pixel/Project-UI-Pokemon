const assert=require('node:assert/strict');

const {
    predictScreen:predict,
    tickScreens:tick,
    removeScreens:remove,
    screenDamageMultiplier:multiplier,
    screenField
}=require('../src/screen_control_v06');

const actor={
    species:'Bronzong',
    currentHP:150,
    item:''
};

function run(moveName,changes={}) {
    return predict({
        actor,
        moveName,
        conditions:{},
        ...changes
    });
}

const reflect=run('Reflect');

assert.equal(reflect.success,true);
assert.equal(reflect.duration,5);
assert.equal(reflect.conditions.Reflect,5);

const light=run('Light Screen');

assert.equal(light.duration,5);
assert.equal(light.conditions['Light Screen'],5);

console.log('Standard screen duration: PASS');

const clay=run('Reflect',{
    actor:{...actor,item:'Light Clay'}
});

assert.equal(clay.duration,8);

assert.equal(
    run('Light Screen',{
        actor:{...actor,item:'Light Clay'}
    }).duration,8
);

assert.equal(
    run('Reflect',{
        actor:{...actor,item:'Light Clay'},
        itemSuppressed:true
    }).duration,5
);

assert.equal(
    run('Reflect',{
        actor:{
            ...actor,
            item:'Light Clay',
            ability:'Klutz'
        }
    }).duration,5
);

console.log('Light Clay and item suppression: PASS');

const repeated=run('Reflect',{
    conditions:{Reflect:2}
});

assert.equal(repeated.success,false);
assert.equal(repeated.conditions.Reflect,2);

console.log('Repeated screen prevention: PASS');

const both=run('Light Screen',{
    conditions:{
        Reflect:3,
        Spikes:2
    }
});

assert.deepEqual(both.conditions,{
    Reflect:3,
    Spikes:2,
    'Light Screen':5
});

console.log('Simultaneous screens: PASS');

function damage(moveName,conditions,critical=false) {
    return multiplier({
        moveName,conditions,critical
    });
}

assert.equal(
    damage('Earthquake',reflect.conditions),0.5
);

assert.equal(
    damage('Surf',reflect.conditions),1
);

assert.equal(
    damage('Surf',light.conditions),0.5
);

assert.equal(
    damage('Earthquake',light.conditions),1
);

assert.equal(
    damage('Earthquake',both.conditions),0.5
);

assert.equal(
    damage('Surf',both.conditions),0.5
);

console.log('Physical and special separation: PASS');

assert.equal(
    damage('Earthquake',both.conditions,true),1
);

assert.equal(
    damage('Surf',both.conditions,true),1
);

assert.equal(
    damage('Seismic Toss',both.conditions),1
);

assert.equal(
    damage('Night Shade',both.conditions),1
);

console.log('Critical and fixed damage bypass: PASS');

let next=reflect.conditions;

for (let i=0;i<4;i++) {
    next=tick(next).conditions;
}

assert.equal(next.Reflect,1);

const expired=tick(next);

assert.equal(expired.conditions.Reflect,undefined);
assert.deepEqual(expired.expired,['Reflect']);

console.log('Screen expiration: PASS');

const mixed=tick({
    'move: Reflect':{remaining:2},
    'Light Screen':1,
    'Stealth Rock':1,
    Spikes:3
});

assert.deepEqual(mixed.conditions,{
    Reflect:1,
    'Stealth Rock':1,
    Spikes:3
});

assert.deepEqual(mixed.expired,['Light Screen']);

console.log('Condition preservation: PASS');

const removed=remove(both.conditions);

assert.deepEqual(removed.conditions,{Spikes:2});
assert.equal(removed.removed.length,2);

console.log('Screen removal: PASS');

assert.deepEqual(
    screenField(both.conditions),
    {
        isReflect:true,
        isLightScreen:true
    }
);

assert.deepEqual(
    screenField({}),
    {
        isReflect:false,
        isLightScreen:false
    }
);

console.log('Damage calculator field adapter: PASS');

assert.equal(
    run('Reflect',{
        actor:{...actor,currentHP:0}
    }).success,false
);

assert.equal(run('Surf').supported,false);
assert.equal(actor.item,'');

assert.equal(reflect.conditions.Reflect,5);

console.log('Input protection: PASS');

console.log('\n=== SCREEN RESULTS ===');

console.table([
    {
        scenario:'Reflect',
        duration:reflect.duration,
        physical:damage(
            'Earthquake',reflect.conditions
        ),
        special:damage(
            'Surf',reflect.conditions
        )
    },
    {
        scenario:'Light Screen',
        duration:light.duration,
        physical:damage(
            'Earthquake',light.conditions
        ),
        special:damage(
            'Surf',light.conditions
        )
    },
    {
        scenario:'Reflect + Light Clay',
        duration:clay.duration,
        physical:damage(
            'Earthquake',clay.conditions
        ),
        special:damage(
            'Surf',clay.conditions
        )
    }
]);

console.log('SCREEN CONTROL V06 TEST: PASS');