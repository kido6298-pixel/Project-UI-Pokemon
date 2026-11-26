function normalizeAbility(ability='') {
    return ability.toLowerCase()
        .replace(/[^a-z0-9]/g,'');
}

function predictStatusResidual(pokemon) {
    const {
        currentHP,
        maxHP,
        status,
        toxicCounter=0
    }=pokemon;

    if (!Number.isSafeInteger(currentHP) ||
        !Number.isSafeInteger(maxHP) ||
        maxHP<=0 ||
        currentHP<0 ||
        currentHP>maxHP) {
        throw new Error('Invalid HP');
    }

    if (!Number.isInteger(toxicCounter) ||
        toxicCounter<0 ||
        toxicCounter>15) {
        throw new Error('Invalid toxic counter');
    }

    const ability=normalizeAbility(
        pokemon.ability ??
        pokemon.config?.ability ??
        ''
    );

    let damage=0;
    let healing=0;
    let nextCounter=toxicCounter;

    if (currentHP>0) {
        if (status==='tox') {
            nextCounter=Math.min(
                15,toxicCounter+1
            );
        }

        const poisoned=
            status==='psn' || status==='tox';

        if (poisoned &&
            ability==='poisonheal') {

            healing=Math.max(
                1,Math.floor(maxHP/8)
            );

        } else if (ability!=='magicguard') {

            if (status==='brn') {
                const divisor=
                    ability==='heatproof'
                        ? 16 : 8;

                damage=Math.max(
                    1,Math.floor(maxHP/divisor)
                );
            }

            if (status==='psn') {
                damage=Math.max(
                    1,Math.floor(maxHP/8)
                );
            }

            if (status==='tox') {
                damage=Math.max(
                    1,
                    Math.floor(
                        maxHP*nextCounter/16
                    )
                );
            }
        }
    }

    const afterHP=Math.max(
        0,
        Math.min(
            maxHP,
            currentHP-damage+healing
        )
    );

    return {
        beforeHP:currentHP,
        afterHP,
        damage:Math.min(currentHP,damage),
        healing:Math.min(
            maxHP-currentHP,healing
        ),
        toxicCounter:nextCounter,
        fainted:afterHP===0
    };
}

module.exports={predictStatusResidual};