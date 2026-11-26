const {Dex}=require('pokemon-showdown');

const {
    predictStatusResidual
}=require('./status_residual');

const dex=Dex.mod('gen4');

const id=value=>String(value??'')
    .toLowerCase()
    .replace(/[^a-z0-9]/g,'');

function clearStatus(p) {
    p.status=null;
    p.sleepState=null;
    p.toxicCounter=0;
}

function heal(p,divisor) {
    if (p.currentHP<=0) return;

    p.currentHP=Math.min(
        p.maxHP,
        p.currentHP+
        Math.max(1,Math.floor(p.maxHP/divisor))
    );
}

function damage(p,divisor) {
    if (p.currentHP<=0 ||
        id(p.ability)==='magicguard') return;

    p.currentHP=Math.max(
        0,
        p.currentHP-
        Math.max(1,Math.floor(p.maxHP/divisor))
    );
}

function normalizeState(input) {
    const p=structuredClone(input);

    if (!Number.isSafeInteger(p.maxHP) ||
        !Number.isSafeInteger(p.currentHP) ||
        p.maxHP<=0 ||
        p.currentHP<0 ||
        p.currentHP>p.maxHP) {
        throw new Error('Invalid HP');
    }

    p.ability=p.ability??p.config?.ability??'';
    p.item=p.item??p.config?.item??'';
    p.status=p.status||null;
    p.toxicCounter=p.toxicCounter??0;
    p.types=p.types??
        dex.species.get(p.species).types;

    if (!p.types?.length) {
        throw new Error('Missing types');
    }

    return p;
}

function cureBerry(p) {
    if (p.currentHP<=0) return;

    const item=id(p.item);

    const lum=item==='lumberry' &&
        (p.status||p.confusion);

    const chesto=item==='chestoberry' &&
        p.status==='slp';

    if (!lum&&!chesto) return;

    clearStatus(p);

    if (lum) p.confusion=false;

    p.item='';

    if (p.config) p.config.item='';
}

function applyWeather(p,weather) {
    if (p.currentHP<=0) return;

    const ability=id(p.ability);

    if (weather==='sandstorm') {
        const immune=p.types.some(
            t=>['Rock','Ground','Steel'].includes(t)
        )||ability==='sandveil';

        if (!immune) damage(p,16);
    }

    if (weather==='hail') {
        if (ability==='icebody') {
            heal(p,16);
        } else if (
            !p.types.includes('Ice') &&
            ability!=='snowcloak'
        ) {
            damage(p,16);
        }
    }

    if (weather==='rain') {
        if (ability==='raindish') heal(p,16);
        if (ability==='dryskin') heal(p,8);
        if (ability==='hydration') clearStatus(p);
    }

    if (weather==='sun' &&
        ability==='dryskin') {
        damage(p,8);
    }
}

function applyHeldItem(p) {
    if (p.currentHP<=0) return;

    const item=id(p.item);

    if (item==='leftovers') {
        heal(p,16);
    }

    if (item==='blacksludge') {
        if (p.types.includes('Poison')) {
            heal(p,16);
        } else {
            damage(p,8);
        }
    }
}

function applyStatus(p) {
    if (p.currentHP<=0) return;

    const ability=id(p.ability);

    const result=predictStatusResidual(p);

    if (p.status==='tox' &&
        !['magicguard','poisonheal']
            .includes(ability)) {

        const base=Math.max(
            1,Math.floor(p.maxHP/16)
        );

        p.currentHP=Math.max(
            0,
            p.currentHP-
            base*result.toxicCounter
        );
    } else {
        p.currentHP=result.afterHP;
    }

    p.toxicCounter=result.toxicCounter;
}

function applyOrb(p,weather) {
    if (p.currentHP<=0||p.status) return;

    const item=id(p.item);
    const ability=id(p.ability);

    if (weather==='sun' &&
        ability==='leafguard') return;

    if (item==='toxicorb') {
        if (p.types.includes('Poison')||
            p.types.includes('Steel')||
            ability==='immunity') return;

        p.status='tox';
        p.toxicCounter=0;
    }

    if (item==='flameorb') {
        if (p.types.includes('Fire')||
            ability==='waterveil') return;

        p.status='brn';
    }
}

function predictEndTurnV06(input,{
    weather='none',
    weatherSuppressed=false
}={}) {
    const p=normalizeState(input);

    const aliases={
        raindance:'rain',
        sunnyday:'sun',
        sand:'sandstorm'
    };

    weather=id(weather);
    weather=aliases[weather]??weather;

    if (weatherSuppressed||
        ['airlock','cloudnine']
            .includes(id(p.ability))) {
        weather='none';
    }

    if (!['none','rain','sun',
          'sandstorm','hail',''].includes(weather)) {
        throw new Error('Unsupported weather');
    }

    cureBerry(p);

    // Order 8: weather
    applyWeather(p,weather);

    // Order 10 / SubOrder 3: Shed Skin
    let outcomes=[{
        state:p,
        probability:1
    }];

    if (p.currentHP>0&&p.status&&
        id(p.ability)==='shedskin') {

        const cured=structuredClone(p);
        clearStatus(cured);

        outcomes=[
            {state:cured,probability:0.33},
            {state:p,probability:0.67}
        ];
    }

    for (const outcome of outcomes) {
        const state=outcome.state;

        // Order 10 / SubOrder 4
        applyHeldItem(state);

        // Order 10 / SubOrder 6
        applyStatus(state);

        // Order 10 / SubOrder 20
        applyOrb(state,weather);

        cureBerry(state);

        state.fainted=state.currentHP===0;

        if (state.config) {
            state.config={
                ...state.config,
                curHP:state.currentHP,
                item:state.item,
                status:state.status||'',
                toxicCounter:state.toxicCounter,
                sleepState:state.sleepState??null
            };
        }
    }

    return {
        outcomes,
        expectedHP:outcomes.reduce(
            (sum,o)=>sum+
                o.state.currentHP*o.probability,0
        ),
        koChance:outcomes.reduce(
            (sum,o)=>sum+
                (o.state.fainted?o.probability:0),0
        ),
        probabilitySum:outcomes.reduce(
            (sum,o)=>sum+o.probability,0
        )
    };
}

module.exports={
    predictEndTurnV06
};