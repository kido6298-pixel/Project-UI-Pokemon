function predictStatusSwitchV06(pokemon) {
    const result=structuredClone(pokemon);

    if (result.status==='tox') {
        result.toxicCounter=0;
    }

    return result;
}

module.exports={predictStatusSwitchV06};