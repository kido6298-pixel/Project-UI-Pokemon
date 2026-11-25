const fs = require('node:fs');

const { records } = JSON.parse(
    fs.readFileSync(
        'logs/strategic_v04_test.json',
        'utf8'
    )
);

const battles = [];
const switches = [];
const repeated = [];
const negative = [];

for (const battle of records) {
    const history = battle.history || [];

    const ownWinner =
        battle.side === 'p1' ? 'AI-1' : 'AI-2';

    const result =
        battle.winner === 'DRAW' ? 'DRAW' :
        battle.winner === ownWinner ? 'WIN' : 'LOSS';

    let switchCount = 0;
    let repeatedCount = 0;
    let negativeCount = 0;
    let previous = null;

    for (const entry of history) {
        const chosen = entry.chosen;

        if (chosen.score < 0) {
            negativeCount++;

            negative.push({
                battle: battle.battle,
                result,
                turn: entry.turn,
                enemy: entry.enemy,
                action: chosen.name,
                score: chosen.score
            });
        }

        if (chosen.type === 'switch') {
            switchCount++;

            const attacks = entry.candidates
                .filter(c => c.type === 'attack')
                .sort((a, b) => b.score - a.score);

            const bestAttack = attacks[0];

            switches.push({
                battle: battle.battle,
                result,
                turn: entry.turn,
                enemy: entry.enemy,
                destination: chosen.name,
                score: chosen.score,
                bestAttack: bestAttack?.name,
                attackScore: bestAttack?.score,
                advantage: bestAttack
                    ? chosen.score - bestAttack.score
                    : null
            });

            if (
                previous?.chosen.type === 'switch' &&
                entry.turn === previous.turn + 1
            ) {
                repeatedCount++;

                repeated.push({
                    Battle: battle.battle,
                    Result: result,
                    Turn: entry.turn,
                    Previous: previous.chosen.name,
                    Next: chosen.name,
                    Enemy: entry.enemy
                });
            }
        }

        previous = entry;
    }

    battles.push({
        battle: battle.battle,
        side: battle.side,
        result,
        turns: battle.turns,
        decisions: history.length,
        switches: switchCount,
        repeated: repeatedCount,
        negative: negativeCount
    });
}

function summarize(group) {
    const sum = key => group.reduce(
        (total, row) => total + row[key], 0
    );

    return {
        Battles: group.length,
        AvgTurns: sum('turns') /
            Math.max(1, group.length),
        AvgSwitches: sum('switches') /
            Math.max(1, group.length),
        SwitchRate: sum('switches') /
            Math.max(1, sum('decisions')),
        Repeated: sum('repeated'),
        Negative: sum('negative')
    };
}

console.log('\n=== WIN / LOSS COMPARISON ===');

console.table([
    {
        Result: 'WIN',
        ...summarize(
            battles.filter(b => b.result === 'WIN')
        )
    },
    {
        Result: 'LOSS',
        ...summarize(
            battles.filter(b => b.result === 'LOSS')
        )
    }
]);

console.log('\n=== SIDE COMPARISON ===');

console.table(['p1', 'p2'].map(side => {
    const group = battles.filter(b => b.side === side);

    return {
        Side: side,
        Battles: group.length,
        Wins: group.filter(
            b => b.result === 'WIN'
        ).length,
        ...summarize(group)
    };
}));

console.log('\n=== BATTLE DETAILS ===');
console.table(battles);

console.log('\n=== CONSECUTIVE SWITCHES ===');
console.table(repeated);

console.log('\n=== SWITCH DECISIONS ===');

console.table(switches.map(s => ({
    Battle: s.battle,
    Result: s.result,
    Turn: s.turn,
    Enemy: s.enemy,
    Destination: s.destination,
    Score: s.score.toFixed(4),
    BestAttack: s.bestAttack,
    AttackScore: s.attackScore?.toFixed(4),
    Advantage: s.advantage?.toFixed(4)
})));

console.log('\n=== SWITCH ADVANTAGE DISTRIBUTION ===');

console.table([0.05, 0.10, 0.20, 0.30, 0.50].map(
    threshold => ({
        Threshold: threshold,
        BelowThreshold: switches.filter(
            s => s.advantage !== null &&
                 s.advantage < threshold
        ).length
    })
));

fs.writeFileSync(
    'logs/strategic_v04_analysis.json',
    JSON.stringify({
        battles,
        switches,
        repeated,
        negative
    }, null, 2)
);

console.log('\nV0.4 LOG ANALYSIS: COMPLETE');
