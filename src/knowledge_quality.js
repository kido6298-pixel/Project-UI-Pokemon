const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {DatabaseSync} = require('node:sqlite');

class KnowledgeQuality {
    constructor(filename=path.join(
        __dirname,'../data/pokemon_knowledge.db'
    )) {
        this.db = new DatabaseSync(filename);

        this.db.exec(`
            PRAGMA foreign_keys=ON;
            PRAGMA busy_timeout=5000;

            CREATE TABLE IF NOT EXISTS knowledge_claims (
                id TEXT PRIMARY KEY,
                statement TEXT NOT NULL,
                conditions TEXT NOT NULL,
                limitations TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'research'
                    CHECK(status IN (
                        'research','review',
                        'approved','revoked'
                    )),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS knowledge_sources (
                claim_id TEXT NOT NULL,
                run_id TEXT NOT NULL,
                PRIMARY KEY(claim_id,run_id),
                FOREIGN KEY(claim_id)
                    REFERENCES knowledge_claims(id),
                FOREIGN KEY(run_id)
                    REFERENCES analysis_runs(id)
            );

            CREATE TABLE IF NOT EXISTS knowledge_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                claim_id TEXT NOT NULL,
                previous_status TEXT,
                new_status TEXT NOT NULL,
                actor TEXT NOT NULL,
                reason TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(claim_id)
                    REFERENCES knowledge_claims(id)
            );
        `);
    }

    requireText(value,name) {
        if (typeof value !== 'string' ||
            !value.trim()) {
            throw new Error('Missing '+name);
        }
        return value.trim();
    }

    transaction(callback) {
        this.db.exec('BEGIN IMMEDIATE');

        try {
            const result=callback();
            this.db.exec('COMMIT');
            return result;
        } catch(error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
    }

    register({
        statement,
        conditions,
        limitations,
        sourceRunIds
    }) {
        statement=this.requireText(
            statement,'statement'
        );

        conditions=this.requireText(
            conditions,'conditions'
        );

        limitations=this.requireText(
            limitations,'limitations'
        );

        if (!Array.isArray(sourceRunIds) ||
            !sourceRunIds.length) {
            throw new Error('Missing evidence');
        }

        const sources=[...new Set(sourceRunIds)];
        const id=randomUUID();
        const now=new Date().toISOString();

        return this.transaction(()=>{
            this.db.prepare(`
                INSERT INTO knowledge_claims
                VALUES (?,?,?,?,?,?,?)
            `).run(
                id,statement,conditions,
                limitations,'research',now,now
            );

            const insert=this.db.prepare(`
                INSERT INTO knowledge_sources
                VALUES (?,?)
            `);

            for (const runId of sources) {
                insert.run(id,runId);
            }

            this.audit(
                id,null,'research',
                'research_import',
                'Initial registration'
            );

            return this.get(id);
        });
    }

    audit(id,previous,next,actor,reason) {
        this.db.prepare(`
            INSERT INTO knowledge_audit (
                claim_id,previous_status,
                new_status,actor,reason,created_at
            ) VALUES (?,?,?,?,?,?)
        `).run(
            id,previous,next,actor,reason,
            new Date().toISOString()
        );
    }

    get(id) {
        const claim=this.db.prepare(`
            SELECT * FROM knowledge_claims
            WHERE id=?
        `).get(id);

        if (!claim) return null;

        return {
            ...claim,
            sources:this.db.prepare(`
                SELECT run_id FROM knowledge_sources
                WHERE claim_id=?
                ORDER BY run_id
            `).all(id).map(r=>r.run_id)
        };
    }

    transition(id,next,actor,reason) {
        actor=this.requireText(actor,'actor');
        reason=this.requireText(reason,'reason');

        return this.transaction(()=>{
            const claim=this.get(id);

            if (!claim) {
                throw new Error('Unknown knowledge');
            }

            const allowed={
                research:['review','revoked'],
                review:['research','approved','revoked'],
                approved:['revoked'],
                revoked:[]
            };

            if (!allowed[claim.status].includes(next)) {
                throw new Error('Invalid transition');
            }

            if (next==='approved' &&
                actor!=='manual_operator') {
                throw new Error(
                    'Manual approval required'
                );
            }

            this.db.prepare(`
                UPDATE knowledge_claims
                SET status=?,updated_at=?
                WHERE id=?
            `).run(
                next,new Date().toISOString(),id
            );

            this.audit(
                id,claim.status,next,actor,reason
            );

            return this.get(id);
        });
    }

    listApproved() {
        return this.db.prepare(`
            SELECT id,statement,conditions,limitations
            FROM knowledge_claims
            WHERE status='approved'
            ORDER BY created_at,id
        `).all();
    }

    getAudit(id) {
        return this.db.prepare(`
            SELECT * FROM knowledge_audit
            WHERE claim_id=?
            ORDER BY id
        `).all(id);
    }

    close() {
        this.db.close();
    }
}

module.exports={KnowledgeQuality};