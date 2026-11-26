const assert = require('node:assert/strict');

const {
    team1,team2
} = require('../src/realistic_test_teams');

const {
    runBattleBatch
} = require('../src/battle_batch_runner');

async function main() {
    const tasks = Array.from({length:100},(_,index) => {
        const i = index+1;
        const pair = Math.floor(index/4);
        const mode = index%4;

        return {
            id:i,
            team1:mode<2 ? team1 : team2,
            team2:mode<2 ? team2 : team1,
            agent1:{
                type:mode%2===0 ? 'v05' : 'v04',
                seed:3000+pair
            },
            agent2:{
                type:mode%2===0 ? 'v04' : 'v05',
                seed:4000+pair
            },
            seed:[pair+10001,23456,34567,45678],
            includeHistory:true,
            includeLog:false
        };
    });

    const summary = await runBattleBatch({
        tasks,
        directory:'data/battles/v05_vs_v04_100',
        engineVersion:'v05-optimized-step125',
        workers:8,
        chunkSize:32,

        onProgress({completed,total,result}) {
            if (completed%10===0 || completed===total) {
                console.log(
                    completed+'/'+total,
                    'Winner='+result.winner,
                    'Turns='+result.turns
                );
            }
        }
    });

    console.log(JSON.stringify(summary,null,2));

    if (summary.interrupted && !summary.complete) {
        console.log('BATCH PAUSED');
        return;
    }

    assert.equal(summary.completed,100);
    assert.equal(summary.complete,true);

    console.log('STRATEGIC BATCH TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});