const assert=require('node:assert/strict');

const {
    predictMoveRestriction:predict,
    resolveRestrictedMove:resolve,
    tickMoveRestrictions:tick,
    clearMoveRestrictionsOnSwitch:clear
}=require('../src/move_restriction_v06');

const actor={
    species:'Gyarados',
    currentHP:150
};

const target={
    species:'Suicune',
    currentHP:150,
    lastMove:'Calm Mind',
    moveSlots:[
        {id:'calmmind',pp:19},
        {id:'surf',pp:15},
        {id:'rest',pp:10}
    ]
};

function run(moveName,changes={}) {
    return predict({
        actor,target,moveName,...changes
    });
}

function close(a,b) {
    assert.ok(Math.abs(a-b)<1e-8);
}

const taunt=run('Taunt');

assert.equal(taunt.outcomes.length,3);

assert.deepEqual(
    taunt.outcomes.map(
        o=>o.target.restrictions.taunt.remaining
    ),
    [3,4,5]
);

close(
    taunt.outcomes.reduce(
        (sum,o)=>sum+o.probability,0
    ),1
);

const taunted=taunt.outcomes[0].target;

assert.equal(
    resolve(taunted,'Calm Mind').canAct,false
);

assert.equal(
    resolve(taunted,'Rest').canAct,false
);

assert.equal(
    resolve(taunted,'Surf').canAct,true
);

console.log('Gen IV Taunt: PASS');

const encore=run('Encore');

assert.equal(encore.outcomes.length,5);

assert.deepEqual(
    encore.outcomes.map(
        o=>o.target.restrictions.encore.remaining
    ),
    [4,5,6,7,8]
);

close(
    encore.outcomes.reduce(
        (sum,o)=>sum+o.probability,0
    ),1
);

const encored=encore.outcomes[0].target;

const forced=resolve(encored,'Surf');

assert.equal(forced.move,'calmmind');
assert.equal(forced.overridden,true);
assert.equal(forced.canAct,true);

console.log('Gen IV Encore: PASS');

const both=run('Taunt',{
    target:encored
}).outcomes[0].target;

assert.equal(
    resolve(both,'Surf').canAct,false
);

assert.equal(
    resolve(both,'Surf').reason,'taunt'
);

console.log('Taunt and Encore interaction: PASS');

assert.equal(
    run('Encore',{
        target:{...target,lastMove:null}
    }).outcomes[0].reason,
    'no_last_move'
);

assert.equal(
    run('Encore',{
        target:{...target,lastMove:'Struggle'}
    }).outcomes[0].success,
    false
);

assert.equal(
    run('Encore',{
        target:{
            ...target,
            moveSlots:[
                {id:'calmmind',pp:0}
            ]
        }
    }).outcomes[0].reason,
    'move_unavailable'
);

assert.equal(
    run('Encore',{
        target:{
            ...target,
            moveSlots:undefined
        }
    }).supported,false
);

console.log('Encore failure conditions: PASS');

assert.equal(
    run('Taunt',{
        target:taunted
    }).outcomes[0].reason,
    'already_active'
);

assert.equal(
    run('Encore',{
        target:encored
    }).outcomes[0].reason,
    'already_active'
);

assert.equal(
    run('Taunt',{
        conditions:{protect:true}
    }).outcomes[0].reason,
    'protect'
);

console.log('Repeated moves and Protect: PASS');

for (const changes of [
    {ability:'Oblivious'},
    {item:'Mental Herb'},
    {substitute:true}
]) {
    assert.equal(
        run('Taunt',{
            target:{...target,...changes}
        }).successProbability,1
    );

    assert.equal(
        run('Encore',{
            target:{...target,...changes}
        }).successProbability,1
    );
}

console.log('Generation-specific behavior: PASS');

let next=taunted;

for (let i=0;i<3;i++) {
    next=tick(next);
}

assert.equal(
    next.restrictions.taunt,undefined
);

assert.equal(
    resolve(next,'Calm Mind').canAct,true
);

let locked=encored;

for (let i=0;i<4;i++) {
    locked=tick(locked);
}

assert.equal(
    locked.restrictions.encore,undefined
);

console.log('Duration expiration: PASS');

const exhausted=tick({
    ...encored,
    moveSlots:[
        {id:'calmmind',pp:0}
    ]
});

assert.equal(
    exhausted.restrictions.encore,undefined
);

console.log('Encore PP exhaustion: PASS');

const switched=clear(both);

assert.equal(
    switched.restrictions.taunt,undefined
);

assert.equal(
    switched.restrictions.encore,undefined
);

assert.equal(switched.lastMove,null);

console.log('Switch reset: PASS');

assert.equal(target.restrictions,undefined);
assert.equal(target.lastMove,'Calm Mind');

assert.equal(
    run('Surf').supported,false
);

assert.equal(
    run('Taunt',{
        actor:{...actor,currentHP:0}
    }).outcomes[0].reason,'fainted'
);

console.log('Input protection: PASS');

console.log('\n=== RESTRICTION RESULTS ===');

console.table([
    ...taunt.outcomes.map(o=>({
        move:'Taunt',
        duration:o.target.restrictions.taunt.remaining,
        probability:o.probability
    })),
    ...encore.outcomes.map(o=>({
        move:'Encore',
        duration:o.target.restrictions.encore.remaining,
        probability:o.probability
    }))
]);

console.log('MOVE RESTRICTION V06 TEST: PASS');