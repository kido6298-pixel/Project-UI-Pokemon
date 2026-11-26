const { parentPort } =
    require('node:worker_threads');

const { runBattleTask } =
    require('./battle_task');

parentPort.on('message', async ({id,task}) => {
    try {
        const result = await runBattleTask(task);

        parentPort.postMessage({
            id,
            result
        });
    } catch (error) {
        parentPort.postMessage({
            id,
            error:error.stack || error.message
        });
    }
});
