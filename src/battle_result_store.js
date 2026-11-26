const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function hash(value) {
    return crypto.createHash('sha256')
        .update(JSON.stringify(value))
        .digest('hex');
}

class BattleResultStore {
    constructor({directory,tasks,engineVersion}) {
        if (!Array.isArray(tasks) || !tasks.length) {
            throw new Error('Invalid tasks');
        }

        if (!engineVersion) {
            throw new Error('Missing engine version');
        }

        this.directory = path.resolve(directory);
        this.tasks = new Map();
        this.completed = new Set();
        this.fd = null;
        this.recoveredBytes = 0;

        for (const task of tasks) {
            if (!Number.isSafeInteger(task.id) ||
                task.id < 1 ||
                this.tasks.has(task.id)) {
                throw new Error('Invalid or duplicate task ID');
            }
            this.tasks.set(task.id,hash(task));
        }

        this.manifest = {
            schemaVersion:1,
            engineVersion,
            taskCount:tasks.length,
            taskHash:hash(tasks)
        };

        fs.mkdirSync(this.directory,{recursive:true});

        this.manifestPath = path.join(
            this.directory,'manifest.json'
        );

        this.resultPath = path.join(
            this.directory,'results.jsonl'
        );

        this.lockPath = path.join(
            this.directory,'batch.lock'
        );

        this.lockFd = fs.openSync(this.lockPath,'wx');

        try {
            fs.writeFileSync(
                this.lockFd,
                JSON.stringify({
                    pid:process.pid,
                    startedAt:new Date().toISOString()
                })
            );

            this.initialize();
            this.load();
            this.fd = fs.openSync(this.resultPath,'a');
        } catch (error) {
            this.close();
            throw error;
        }
    }

    initialize() {
        if (fs.existsSync(this.manifestPath)) {
            const existing = JSON.parse(
                fs.readFileSync(this.manifestPath,'utf8')
            );

            if (hash(existing) !== hash(this.manifest)) {
                throw new Error('Batch conditions mismatch');
            }
            return;
        }

        if (fs.existsSync(this.resultPath) &&
            fs.statSync(this.resultPath).size > 0) {
            throw new Error('Results without manifest');
        }

        const temp = this.manifestPath+'.tmp';

        fs.writeFileSync(
            temp,
            JSON.stringify(this.manifest,null,2)
        );

        fs.renameSync(temp,this.manifestPath);
    }

    validateRecord(record) {
        if (!record ||
            record.schemaVersion !== 1 ||
            !this.tasks.has(record.id) ||
            record.taskHash !== this.tasks.get(record.id) ||
            !record.result ||
            record.result.id !== record.id ||
            !['AI-1','AI-2','DRAW'].includes(
                record.result.winner
            ) ||
            record.resultHash !== hash(record.result)) {
            throw new Error('Invalid result record');
        }

        if (this.completed.has(record.id)) {
            throw new Error('Duplicate stored result');
        }
    }

    load() {
        if (!fs.existsSync(this.resultPath)) return;

        const fd = fs.openSync(this.resultPath,'r+');
        const buffer = Buffer.alloc(65536);

        let pending = Buffer.alloc(0);
        let validBytes = 0;

        try {
            let bytes;

            while ((bytes = fs.readSync(
                fd,buffer,0,buffer.length,null
            )) > 0) {
                pending = Buffer.concat([
                    pending,buffer.subarray(0,bytes)
                ]);

                let newline;

                while ((newline = pending.indexOf(10)) >= 0) {
                    const line = pending.subarray(0,newline);

                    const record = JSON.parse(
                        line.toString('utf8')
                    );

                    this.validateRecord(record);
                    this.completed.add(record.id);

                    validBytes += newline+1;
                    pending = pending.subarray(newline+1);
                }
            }

            if (pending.length) {
                this.recoveredBytes = pending.length;

                const recoveryPath = path.join(
                    this.directory,
                    'recovery-'+crypto.randomUUID()+'.bin'
                );

                fs.writeFileSync(recoveryPath,pending);
                fs.truncateSync(this.resultPath,validBytes);
                fs.fsyncSync(fd);
            }
        } finally {
            fs.closeSync(fd);
        }
    }

    has(id) {
        return this.completed.has(id);
    }

    append(result) {
        if (this.fd === null) {
            throw new Error('Store is closed');
        }

        const record = {
            schemaVersion:1,
            id:result.id,
            taskHash:this.tasks.get(result.id),
            resultHash:hash(result),
            savedAt:new Date().toISOString(),
            result
        };

        this.validateRecord(record);

        const data = Buffer.from(
            JSON.stringify(record)+'\n','utf8'
        );

        let offset = 0;

        while (offset < data.length) {
            const written = fs.writeSync(
                this.fd,data,offset,data.length-offset
            );
            if (written <= 0) {
                throw new Error('Result write failed');
            }
            offset += written;
        }

        fs.fsyncSync(this.fd);
        this.completed.add(result.id);
    }

    close() {
        try {
            if (this.fd !== null) {
                fs.closeSync(this.fd);
                this.fd = null;
            }
        } finally {
            if (this.lockFd !== null) {
                fs.closeSync(this.lockFd);
                this.lockFd = null;
                fs.unlinkSync(this.lockPath);
            }
        }
    }
}

module.exports = {BattleResultStore,hash};