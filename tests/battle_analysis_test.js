const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
    analyzeBatch
} = require('../src/battle_analysis');

async function main() {
    const result = await analyzeBatch(
        'data/battles/v05_vs_v04_100'
    );

    assert.equal(result.battles,100);
    assert.equal(result.complete,true);
    assert.equal(result.draws,0);
    assert.equal(result.limited,0);

    assert.equal(result.agents.v05.wins,53);
    assert.equal(result.agents.v04.wins,47);

    for (const [type,a] of Object.entries(result.agents)) {
        assert.equal(a.battles,100);
        assert.equal(a.wins+a.losses+a.draws,a.battles);
        assert.equal(a.searchErrors,0);
        assert.equal(a.inferenceErrors,0);
        assert.equal(a.fallbacks,0);
        assert.ok(a.decisions>0);

        const actions = Object.values(a.actions)
            .reduce((sum,n) => sum+n,0);

        assert.equal(actions,a.attacks+a.switches);

        const encounters = Object.values(a.enemies)
            .reduce((sum,e) => sum+e.encounters,0);

        assert.equal(encounters,actions);

        console.log('\n=== '+type+' ===');

        console.log(JSON.stringify({
            wins:a.wins,
            losses:a.losses,
            winRate:a.winRate,
            averageTurns:a.averageTurns,
            decisions:a.decisions,
            searchDecisions:a.searchDecisions,
            attacks:a.attacks,
            switches:a.switches,
            switchRate:a.switchRate,
            posteriorRate:a.posteriorRate,
            averageCoverage:a.averageCoverage,
            evaluations:a.evaluations
        },null,2));

        console.log('Top actions:');

        console.table(
            Object.entries(a.actions)
                .sort((a,b) => b[1]-a[1])
                .slice(0,5)
                .map(([action,count]) => ({
                    action,count
                }))
        );
    }

    assert.ok(result.agents.v05.posteriorUses>0);
    assert.ok(result.agents.v05.coverageSamples>0);

    fs.mkdirSync('data/analysis',{recursive:true});

    fs.writeFileSync(
        'data/analysis/v05_vs_v04_100.json',
        JSON.stringify(result,null,2)
    );

    console.log('\nBATTLE ANALYSIS TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});