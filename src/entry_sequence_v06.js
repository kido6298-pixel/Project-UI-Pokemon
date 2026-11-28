const {
    predictEntryAbility,
    normalizeWeather,
    getEffectiveWeather
}=require('./entry_ability_v06_corrected');

const {
    memberConfig
}=require('./party_state_v06');

const {
    effectiveSpeed
}=require('./speed');

const id=value=>String(value??'')
    .toLowerCase()
    .replace(/[^a-z0-9]/g,'');

function entrySpeed(state,weather='none') {
    let speed=effectiveSpeed(memberConfig(state));

    const ability=id(state.ability);
    const item=id(state.item);

    if (
        (ability==='swiftswim'&&weather==='rain')||
        (ability==='chlorophyll'&&weather==='sun')
    ) {
        speed*=2;
    }

    if ([
        'ironball','machobrace',
        'powerweight','powerbracer',
        'powerbelt','powerlens',
        'powerband','poweranklet'
    ].includes(item)) {
        speed=Math.floor(speed/2);
    }

    if (ability==='slowstart'&&
        state.volatiles?.slowstart) {
        speed=Math.floor(speed/2);
    }

    return Math.max(1,speed);
}

function predictEntrySequence({
    own,enemy,
    ownEntering=true,
    enemyEntering=true,
    weather='none',
    weatherSuppressed=false
}) {
    const initialWeather=normalizeWeather(weather);

    const effective=getEffectiveWeather({
        own,enemy,
        weather:initialWeather,
        weatherSuppressed
    }).effectiveWeather;

    const ownSpeed=entrySpeed(own,effective);
    const enemySpeed=entrySpeed(enemy,effective);

    const entrants=[];

    if (ownEntering&&own.currentHP>0) {
        entrants.push('own');
    }

    if (enemyEntering&&enemy.currentHP>0) {
        entrants.push('enemy');
    }

    let orders;

    if (entrants.length<2) {
        orders=[{order:entrants,probability:1}];
    } else if (ownSpeed===enemySpeed) {
        orders=[
            {order:['own','enemy'],probability:0.5},
            {order:['enemy','own'],probability:0.5}
        ];
    } else {
        orders=[{
            order:ownSpeed>enemySpeed
                ? ['own','enemy']
                : ['enemy','own'],
            probability:1
        }];
    }

    const outcomes=orders.map(branch=>{
        let a=structuredClone(own);
        let b=structuredClone(enemy);
        let currentWeather=initialWeather;

        const events=[];

        function activate(side,phase) {
            const result=predictEntryAbility({
                actor:side==='own'?a:b,
                target:side==='own'?b:a,
                weather:currentWeather
            });

            if (side==='own') {
                a=result.actor;
                b=result.target;
            } else {
                b=result.actor;
                a=result.target;
            }

            currentWeather=result.weather;

            events.push(...result.events.map(event=>({
                ...event,side,phase
            })));
        }

        for (const side of branch.order) {
            activate(side,'entry');
        }

        // Trace can retry when a valid opponent appears.
        // Already copied abilities must not activate twice.
        if (entrants.length) {
            for (const side of ['own','enemy']) {
                const actor=side==='own'?a:b;
                const target=side==='own'?b:a;

                if (
                    actor.currentHP>0&&
                    target.currentHP>0&&
                    id(actor.ability)==='trace'
                ) {
                    activate(side,'trace_retry');
                }
            }
        }

        return {
            own:a,
            enemy:b,
            order:branch.order,
            events,
            probability:branch.probability,
            ...getEffectiveWeather({
                own:a,enemy:b,
                weather:currentWeather,
                weatherSuppressed
            })
        };
    });

    return {
        ownSpeed,
        enemySpeed,
        speedTie:ownSpeed===enemySpeed,
        probabilitySum:outcomes.reduce(
            (sum,o)=>sum+o.probability,0
        ),
        outcomes
    };
}

module.exports={
    entrySpeed,
    predictEntrySequence
};