const {Dex}=require('pokemon-showdown');
const {Pokemon,Generations}=require('@smogon/calc');

const {
    normalizeBoosts
}=require('./boost_value');

const {
    evaluateBoardV06
}=require('./board_value_v06');

const {
    evaluateHazardAdvantage
}=require('./hazard_value_v06_corrected');

const {
    predictSwitchOut,
    predictSwitchEntry
}=require('./switch_control_v06_corrected');

const dex=Dex.mod('gen4');
const gen=Generations.get(4);

function createPartyMember(config,active=false) {
    const copy=structuredClone(config);

    const p=new Pokemon(gen,copy.species,{
        level:50,...copy
    });

    const maxHP=p.maxHP();
    const currentHP=copy.curHP??p.curHP();

    if (!Number.isSafeInteger(currentHP) ||
        currentHP<0 || currentHP>maxHP) {
        throw new Error('Invalid member HP');
    }

    const moves=copy.moves ??
        copy.moveSlots?.map(
            s=>s.id??s.move
        ) ?? [];

    const attacks=moves.map(
        m=>dex.moves.get(m)
    );

    return {
        config:copy,
        species:copy.species,
        types:copy.types ??
            dex.species.get(copy.species).types,
        ability:copy.ability??'',
        item:copy.item??'',
        currentHP,maxHP,
        status:copy.status||null,
        boosts:normalizeBoosts(copy.boosts),
        restrictions:structuredClone(
            copy.restrictions??{}
        ),
        lastMove:copy.lastMove??null,
        moveSlots:structuredClone(
            copy.moveSlots??null
        ),
        toxicCounter:copy.toxicCounter??0,
        sleepState:structuredClone(
            copy.sleepState??null
        ),
        volatiles:structuredClone(
            copy.volatiles??{}
        ),
        ingrain:!!copy.ingrain,
        substitute:!!copy.substitute,
        active,
        fainted:currentHP===0,
        attackProfile:moves.length
            ? {
                physical:attacks.some(
                    m=>m.category==='Physical'
                ),
                special:attacks.some(
                    m=>m.category==='Special'
                )
            }
            : {physical:true,special:true}
    };
}

function memberConfig(state) {
    return {
        ...structuredClone(state.config),
        species:state.species,
        ability:state.ability,
        item:state.item,
        curHP:state.currentHP,
        status:state.status||'',
        boosts:structuredClone(state.boosts),
        restrictions:structuredClone(
            state.restrictions??{}
        ),
        lastMove:state.lastMove??null,
        moveSlots:structuredClone(
            state.moveSlots??null
        ),
        toxicCounter:state.toxicCounter??0,
        sleepState:structuredClone(
            state.sleepState??null
        ),
        volatiles:structuredClone(
            state.volatiles??{}
        ),
        ingrain:!!state.ingrain,
        substitute:!!state.substitute,
        active:!!state.active,
        fainted:state.currentHP===0
    };
}

function createParty({
    active,reserves=[],conditions={}
}) {
    if (reserves.length>2) {
        throw new Error(
            'Gen IV 6-to-3: maximum two reserves'
        );
    }

    return {
        active:createPartyMember(active,true),
        reserves:reserves.map(
            p=>createPartyMember(p,false)
        ),
        conditions:structuredClone(conditions)
    };
}

function evaluatePartyBoard({
    own,enemy,hazardField={}
}) {
    function members(party) {
        return [
            party.active,...party.reserves
        ].map(p=>({
            ...p,
            hpRatio:p.currentHP/p.maxHP,
            fainted:p.currentHP===0
        }));
    }

    const board=evaluateBoardV06({
        own:members(own),
        enemy:members(enemy)
    });

    const hazards=evaluateHazardAdvantage({
        ownReserves:own.reserves.map(memberConfig),
        enemyReserves:enemy.reserves.map(memberConfig),
        ownConditions:own.conditions,
        enemyConditions:enemy.conditions,
        field:hazardField
    });

    return {
        ...board,
        hazards,
        advantage:
            board.advantage+hazards.advantage
    };
}

function predictVoluntarySwitch({
    party,index,field={},trapped=false
}) {
    if (trapped) {
        throw new Error('Switch is trapped');
    }

    if (!Number.isSafeInteger(index) ||
        index<0 ||
        index>=party.reserves.length) {
        throw new Error('Invalid reserve index');
    }

    if (party.active.currentHP<=0) {
        throw new Error(
            'Forced replacement required'
        );
    }

    const next=structuredClone(party);
    const candidate=next.reserves[index];

    if (candidate.currentHP<=0 ||
        candidate.active) {
        throw new Error('Invalid switch candidate');
    }

    const outgoing=predictSwitchOut(next.active);

    const entry=predictSwitchEntry({
        candidate,
        conditions:next.conditions,
        field
    });

    next.active=entry.state;
    next.reserves[index]=outgoing;
    next.conditions=entry.conditions;

    return {
        party:next,
        hazards:entry.hazards,
        absorbed:entry.absorbed,
        faintedOnEntry:entry.faintedOnEntry,
        selectedIndex:index
    };
}

module.exports={
    createPartyMember,
    memberConfig,
    createParty,
    evaluatePartyBoard,
    predictVoluntarySwitch
};