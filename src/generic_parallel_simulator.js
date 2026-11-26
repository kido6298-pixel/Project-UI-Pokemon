const { Worker } = require('node:worker_threads');
const path = require('node:path');
const os = require('node:os');

async function runParallelTasks({
    tasks,
    workers = 8,
    onProgress = () => {},
    taskTimeoutMs = 180000
}) {
    const count = Array.isArray(tasks) ? tasks.length : 0;
    if (count < 1) {
        throw new Error('Invalid battle count');
    }

    if (!Number.isInteger(workers) || workers < 1) {
        throw new Error('Invalid worker count');
    }

    if (!Number.isFinite(taskTimeoutMs) ||
        taskTimeoutMs <= 0) {
        throw new Error('Invalid timeout');
    }

    workers = Math.min(
        workers,
        count,
        os.availableParallelism()
    );

    const started = performance.now();

    const results = new Array(count);
    const pool = [];
    const timers = new Map();

    let nextId = 1;
    let completed = 0;
    let peakRSS = process.memoryUsage().rss;
    let settled = false;

    const memoryTimer = setInterval(() => {
        peakRSS = Math.max(
            peakRSS,
            process.memoryUsage().rss
        );
    },100);

    try {
        await new Promise((resolve,reject) => {
            function fail(error) {
                if (settled) return;

                settled = true;
                reject(error);
            }

            function assign(worker) {
                if (settled || nextId > count) return;

                const id = nextId++;

                worker.currentTask = id;

                timers.set(
                    worker,
                    setTimeout(() => {
                        fail(new Error(
                            'Battle timeout: ' + id
                        ));
                    },taskTimeoutMs)
                );

                worker.postMessage({id,task:tasks[id-1]});
            }

            for (let i = 0; i < workers; i++) {
                const worker = new Worker(
                    path.join(
                        __dirname,
                        'generic_battle_worker.js'
                    )
                );

                pool.push(worker);

                worker.on('error',fail);

                worker.on('exit',code => {
                    if (!settled) {
                        fail(new Error(
                            'Unexpected worker exit: ' + code
                        ));
                    }
                });

                worker.on('message',message => {
                    if (settled) return;

                    clearTimeout(timers.get(worker));
                    timers.delete(worker);

                    const {id,result,error} = message;

                    if (error) {
                        fail(new Error(error));
                        return;
                    }

                    if (
                        id !== worker.currentTask ||
                        results[id-1] !== undefined ||
                        !result
                    ) {
                        fail(new Error(
                            'Invalid worker response'
                        ));
                        return;
                    }

                    results[id-1] = result;
                    completed++;

                    peakRSS = Math.max(
                        peakRSS,
                        process.memoryUsage().rss
                    );

                    try {
                        onProgress({
                            completed,
                            count,
                            id,
                            result
                        });
                    } catch (error) {
                        fail(error);
                        return;
                    }

                    if (completed === count) {
                        settled = true;
                        resolve();
                        return;
                    }

                    assign(worker);
                });

                assign(worker);
            }
        });
    } finally {
        clearInterval(memoryTimer);

        for (const timer of timers.values()) {
            clearTimeout(timer);
        }

        await Promise.allSettled(
            pool.map(worker => worker.terminate())
        );
    }

    const seconds =
        (performance.now() - started) / 1000;

    return {
        workers,
        count,
        seconds,
        battlesPerSecond: count / seconds,
        peakRSSMB: peakRSS / 1024 / 1024,
        results
    };
}

module.exports = { runParallelTasks };

