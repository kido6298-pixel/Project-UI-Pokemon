const fs = require('node:fs');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const {hash} = require('./battle_result_store');

class PokemonKnowledgeDB {
    constructor(filename) {
        if (filename !== ':memory:') {
            fs.mkdirSync(
                path.dirname(path.resolve(filename)),
                {recursive:true}
            );
        }

        this.db = new DatabaseSync(filename);

        this.db.exec(`
            PRAGMA foreign_keys = ON;
            PRAGMA busy_timeout = 5000;
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = FULL;

            CREATE TABLE IF NOT EXISTS analysis_runs (
                id TEXT PRIMARY KEY,
                engine_version TEXT NOT NULL,
                task_hash TEXT NOT NULL,
                battles INTEGER NOT NULL,
                imported_at TEXT NOT NULL,
                analysis_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agent_statistics (
                run_id TEXT NOT NULL,
                agent TEXT NOT NULL,
                battles INTEGER NOT NULL,
                wins INTEGER NOT NULL,
                losses INTEGER NOT NULL,
                draws INTEGER NOT NULL,
                win_rate REAL,
                switch_rate REAL,
                posterior_rate REAL,
                average_coverage REAL,
                PRIMARY KEY (run_id,agent),
                FOREIGN KEY (run_id)
                    REFERENCES analysis_runs(id)
                    ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS enemy_statistics (
                run_id TEXT NOT NULL,
                agent TEXT NOT NULL,
                species TEXT NOT NULL,
                encounters INTEGER NOT NULL,
                attacks INTEGER NOT NULL,
                switches INTEGER NOT NULL,
                winning_decisions INTEGER NOT NULL,
                losing_decisions INTEGER NOT NULL,
                drawn_decisions INTEGER NOT NULL,
                PRIMARY KEY (run_id,agent,species),
                FOREIGN KEY (run_id,agent)
                    REFERENCES agent_statistics(run_id,agent)
                    ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS action_statistics (
                run_id TEXT NOT NULL,
                agent TEXT NOT NULL,
                action TEXT NOT NULL,
                count INTEGER NOT NULL,
                PRIMARY KEY (run_id,agent,action),
                FOREIGN KEY (run_id,agent)
                    REFERENCES agent_statistics(run_id,agent)
                    ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS matchup_statistics (
                run_id TEXT NOT NULL,
                matchup TEXT NOT NULL,
                battles INTEGER NOT NULL,
                wins INTEGER NOT NULL,
                losses INTEGER NOT NULL,
                draws INTEGER NOT NULL,
                win_rate REAL,
                PRIMARY KEY (run_id,matchup),
                FOREIGN KEY (run_id)
                    REFERENCES analysis_runs(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_enemy_species
                ON enemy_statistics(species,agent);

            CREATE INDEX IF NOT EXISTS idx_agent_type
                ON agent_statistics(agent);
        `);
    }

    importAnalysis(analysis) {
        if (
            analysis.schemaVersion !== 1 ||
            !analysis.complete ||
            !analysis.source?.engineVersion ||
            !analysis.source?.taskHash ||
            analysis.battles !== analysis.source.taskCount
        ) {
            throw new Error('Invalid or incomplete analysis');
        }

        const id = hash([
            analysis.source.engineVersion,
            analysis.source.taskHash
        ]);

        const existing = this.db.prepare(`
            SELECT analysis_json
            FROM analysis_runs
            WHERE id = ?
        `).get(id);

        if (existing) {
            if (
                hash(JSON.parse(existing.analysis_json)) !==
                hash(analysis)
            ) {
                throw new Error('Conflicting analysis');
            }

            return {id,imported:false};
        }

        this.db.exec('BEGIN IMMEDIATE');

        try {
            this.db.prepare(`
                INSERT INTO analysis_runs
                VALUES (?,?,?,?,?,?)
            `).run(
                id,
                analysis.source.engineVersion,
                analysis.source.taskHash,
                analysis.battles,
                new Date().toISOString(),
                JSON.stringify(analysis)
            );

            const insertAgent = this.db.prepare(`
                INSERT INTO agent_statistics
                VALUES (?,?,?,?,?,?,?,?,?,?)
            `);

            const insertEnemy = this.db.prepare(`
                INSERT INTO enemy_statistics
                VALUES (?,?,?,?,?,?,?,?,?)
            `);

            const insertAction = this.db.prepare(`
                INSERT INTO action_statistics
                VALUES (?,?,?,?)
            `);

            const insertMatchup = this.db.prepare(`
                INSERT INTO matchup_statistics
                VALUES (?,?,?,?,?,?,?)
            `);

            for (
                const [agent,a] of
                Object.entries(analysis.agents)
            ) {
                insertAgent.run(
                    id,agent,
                    a.battles,a.wins,a.losses,a.draws,
                    a.winRate,a.switchRate,
                    a.posteriorRate,a.averageCoverage
                );

                for (
                    const [species,e] of
                    Object.entries(a.enemies)
                ) {
                    insertEnemy.run(
                        id,agent,species,
                        e.encounters,e.attacks,e.switches,
                        e.winningBattleDecisions,
                        e.losingBattleDecisions,
                        e.drawnBattleDecisions
                    );
                }

                for (
                    const [action,count] of
                    Object.entries(a.actions)
                ) {
                    insertAction.run(
                        id,agent,action,count
                    );
                }
            }

            for (
                const [matchup,m] of
                Object.entries(analysis.matchups)
            ) {
                insertMatchup.run(
                    id,matchup,
                    m.battles,m.wins,m.losses,m.draws,
                    m.winRate
                );
            }

            this.db.exec('COMMIT');

            return {id,imported:true};

        } catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
    }

    getAgents(runId) {
        return this.db.prepare(`
            SELECT *
            FROM agent_statistics
            WHERE run_id = ?
            ORDER BY agent
        `).all(runId);
    }

    getEnemy(runId,agent,species) {
        return this.db.prepare(`
            SELECT *
            FROM enemy_statistics
            WHERE run_id = ?
              AND agent = ?
              AND species = ? COLLATE NOCASE
        `).get(runId,agent,species) ?? null;
    }

    getTopActions(runId,agent,limit=10) {
        if (!Number.isInteger(limit) || limit < 1) {
            throw new Error('Invalid limit');
        }

        return this.db.prepare(`
            SELECT action,count
            FROM action_statistics
            WHERE run_id = ? AND agent = ?
            ORDER BY count DESC,action ASC
            LIMIT ?
        `).all(runId,agent,limit);
    }

    getMatchups(runId) {
        return this.db.prepare(`
            SELECT *
            FROM matchup_statistics
            WHERE run_id = ?
            ORDER BY matchup
        `).all(runId);
    }

    close() {
        this.db.close();
    }
}

module.exports = {PokemonKnowledgeDB};