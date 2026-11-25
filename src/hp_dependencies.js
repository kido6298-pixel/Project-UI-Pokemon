const { Dex } = require('pokemon-showdown');

const dex = Dex.mod('gen4');

const attackerHPMoves = new Set([
    'eruption',
    'waterspout',
    'flail',
    'reversal',
    'painsplit',
    'endeavor'
]);

const defenderHPMoves = new Set([
    'brine',
    'crushgrip',
    'wringout',
    'painsplit',
    'endeavor',
    'superfang'
]);

const attackerHPAbilities = new Set([
    'overgrow',
    'blaze',
    'torrent',
    'swarm'
]);

const verifiedMoves = new Set([
    'earthquake',
    'dragonclaw',
    'icebeam',
    'surf',
    'bulletpunch',
    'flamethrower',
    'seedbomb',
    'xscissor',
    'shadowball',
    'thunderbolt',
    'meteormash',
    'bodyslam',
    'crunch',
    'stoneedge',
    'waterfall',
    'icefang',
    'earthpower',
    'heatwave',
    'machpunch'
]);

function toID(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function getHPDependencies({
    attacker,
    defender,
    move,
    moveOptions = {}
}) {
    const data = dex.moves.get(move);
    const ability = toID(attacker?.ability);

    const supported =
        data.exists &&
        data.gen <= 4 &&
        data.category !== 'Status' &&
        verifiedMoves.has(data.id) &&
        !data.multihit &&
        !data.basePowerCallback &&
        !data.damageCallback &&
        Object.keys(moveOptions).length === 0;

    return {
        move: data.id,
        attackerDependent:
            !supported ||
            !ability ||
            attackerHPMoves.has(data.id) ||
            attackerHPAbilities.has(ability),
        defenderDependent:
            !supported ||
            defenderHPMoves.has(data.id),
        supported
    };
}

module.exports = { getHPDependencies };
