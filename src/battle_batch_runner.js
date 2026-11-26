const {
    BattleResultStore
} = require('./battle_result_store');

const {
    runParallelTasks
} = require('./generic_parallel_simulator');

const {
    validateTask
} = require('./battle_task');

async function runBattleBatch({
    tasks,
    directory,
    engineVersion,
    workers = 8,
    chunkSize = 64,
    taskTimeoutMs = 180000,
    onProgress = () => {},
    signal
}) {
    if (!Array.isArray(tasks) || !tasks.length) {
        throw new Error('Invalid tasks');
    }

    if (!Number.isInteger(chunkSize) || chunkSize < 1) {
        throw new Error('Invalid chunk size');
    }

    if (!Number.isInteger(workers) || workers < 1) {
        throw new Error('Invalid workers');
    }

    tasks = structuredClone(tasks);

    for (const task of tasks) {
        validateTask(task);
    }

    const store = new BattleResultStore({
        directory,tasks,engineVersion
    });

    const started = performance.now();
    const resumed = store.completed.size;

    let executed = 0;
    let peakRSSMB = 0;
    let interrupted = Boolean(signal?.aborted);

    const stop = () => {
        interrupted = true;
    };

    process.on('SIGINT',stop);
    signal?.addEventListener('abort',stop,{once:true});

    try {
        const remaining = tasks.filter(
            task => !store.has(task.id)
        );

        for (
            let offset = 0;
            offset < remaining.length && !interrupted;
            offset += chunkSize
        ) {
            const chunk = remaining.slice(
                offset,offset+chunkSize
            );

            const run = await runParallelTasks({
                tasks:chunk,
                workers,
                taskTimeoutMs,

                onProgress({id,result}) {
                    if (result.id !== chunk[id-1].id) {
                        throw new Error('Result ID mismatch');
                    }

                    store.append(result);
                    executed++;

                    onProgress({
                        completed:store.completed.size,
                        total:tasks.length,
                        resumed,
                        executed,
                        result
                    });
                }
            });

            peakRSSMB = Math.max(
                peakRSSMB,run.peakRSSMB
            );
        }

        return {
            total:tasks.length,
            resumed,
            executed,
            completed:store.completed.size,
            remaining:tasks.length-store.completed.size,
            complete:store.completed.size === tasks.length,
            interrupted,
            recoveredBytes:store.recoveredBytes,
            seconds:(performance.now()-started)/1000,
            peakRSSMB
        };
    } finally {
        process.removeListener('SIGINT',stop);
        signal?.removeEventListener('abort',stop);
        store.close();
    }
}

module.exports = {runBattleBatch};