const {Pokemon,Generations}=require('@smogon/calc');
const {applyBoosts}=require('./boost_value');

const gen=Generations.get(4);

const id=value=>String(value??'')
    .toLowerCase()
    .replace(/[^a-z0-9]/g,'');

const WEATHER_ABILITIES=Object.freeze({
    sandstream:'sandstorm',
    snowwarning:'hail',
    drizzle:'rain',
    drought:'sun'
});

const INTIMIDATE_IMMUNITIES=new Set([
    'clearbody',
    'whitesmoke',
    'hypercutter'
]);

const TRACE_EXCLUSIONS=new Set([
    '',
    'trace',
    'forecast',
    'multitype',
    'flowergift'
]);

function sync(state) {
    state.config={
        ...state.config,
        ability:state.ability,
        boosts:structuredClone(state.boosts),
        originalAbility:state.originalAbility
    };

    return state;
}

function changeBoost(state,changes) {
    state.boosts=applyBoosts(
        state.boosts,changes
    );

    return sync(state);
}

function normalizeWeather(weather='none') {
    const aliases={
        raindance:'rain',
        sunnyday:'sun',
        sand:'sandstorm',
        '':'none'
    };

    const value=id(weather);
    const result=aliases[value]??value;

    if (![
        'none','rain','sun',
        'sandstorm','hail'
    ].includes(result)) {
        throw new Error('Invalid weather');
    }

    return result;
}

function getEffectiveWeather({
    own,enemy,weather='none',
    weatherSuppressed=false
}) {
    const suppressed=weatherSuppressed ||
        [own,enemy].some(p=>
            p.currentHP>0 &&
            ['airlock','cloudnine']
                .includes(id(p.ability))
        );

    return {
        weather:normalizeWeather(weather),
        effectiveWeather:suppressed
            ? 'none'
            : normalizeWeather(weather),
        suppressed
    };
}

function getDefenseStats(state) {
    const pokemon=new Pokemon(
        gen,state.species,{
            level:50,
            ...state.config,
            ability:state.ability,
            boosts:state.boosts
        }
    );

    function boosted(stat) {
        const stage=state.boosts?.[stat]??0;

        return Math.floor(
            pokemon.rawStats[stat]*
            (stage>=0
                ? (2+stage)/2
                : 2/(2-stage))
        );
    }

    return {
        def:boosted('def'),
        spd:boosted('spd')
    };
}

function predictEntryAbility({
    actor,target,weather='none'
}) {
    const a=structuredClone(actor);
    const b=structuredClone(target);

    let nextWeather=normalizeWeather(weather);

    const events=[];

    function activate(depth=0) {
        if (a.currentHP<=0) return;

        if (depth>1) {
            throw new Error(
                'Recursive ability activation'
            );
        }

        const ability=id(a.ability);

        if (Object.hasOwn(
            WEATHER_ABILITIES,ability
        )) {
            nextWeather=WEATHER_ABILITIES[ability];

            events.push({
                ability,
                effect:'weather',
                weather:nextWeather
            });

            return;
        }

        if (ability==='intimidate') {
            if (b.currentHP<=0) return;

            const blocked=
                INTIMIDATE_IMMUNITIES.has(
                    id(b.ability)
                ) || !!b.substitute;

            const before=b.boosts?.atk??0;

            if (!blocked) {
                changeBoost(b,{atk:-1});
            }

            events.push({
                ability,
                effect:'boost',
                target:b.species,
                blocked,
                change:(b.boosts?.atk??0)-before
            });

            return;
        }

        if (ability==='download') {
            if (b.currentHP<=0) return;

            const stats=getDefenseStats(b);

            const stat=stats.def<stats.spd
                ? 'atk'
                : 'spa';

            changeBoost(a,{[stat]:1});

            events.push({
                ability,
                effect:'boost',
                stat,
                stats
            });

            return;
        }

        if (ability==='trace') {
            if (b.currentHP<=0) return;

            if (TRACE_EXCLUSIONS.has(
                id(b.ability)
            )) {
                events.push({
                    ability,
                    effect:'trace',
                    success:false
                });

                return;
            }

            a.originalAbility=
                a.originalAbility??a.ability;

            a.ability=b.ability;
            sync(a);

            events.push({
                ability,
                effect:'trace',
                success:true,
                copied:a.ability
            });

            activate(depth+1);
            return;
        }

        if ([
            'pressure',
            'airlock',
            'cloudnine'
        ].includes(ability)) {
            events.push({
                ability,
                effect:'passive'
            });
        }
    }

    activate();

    return {
        actor:a,
        target:b,
        events,
        ...getEffectiveWeather({
            own:a,
            enemy:b,
            weather:nextWeather
        })
    };
}

function restoreOriginalAbility(state) {
    const next=structuredClone(state);

    const original=next.originalAbility ??
        next.config?.originalAbility;

    if (original) {
        next.ability=original;
        delete next.originalAbility;

        next.config={
            ...next.config,
            ability:original
        };

        delete next.config.originalAbility;
    }

    return next;
}

module.exports={
    WEATHER_ABILITIES,
    normalizeWeather,
    getEffectiveWeather,
    getDefenseStats,
    predictEntryAbility,
    restoreOriginalAbility
};