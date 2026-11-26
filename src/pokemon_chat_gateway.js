const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');

class PokemonChatGateway {
    #enabled=false;
    #filename;

    constructor({
        filename=path.join(
            __dirname,'../data/pokemon_knowledge.db'
        ),
        enabled=false
    }={}) {
        this.#filename=filename;
        this.setEnabled(enabled);
    }

    setEnabled(enabled) {
        if (typeof enabled!=='boolean') {
            throw new Error('Invalid connection setting');
        }

        this.#enabled=enabled;
        return this.getStatus();
    }

    getStatus() {
        return {
            enabled:this.#enabled,
            scope:'pokemon_only',
            memoryWriteAllowed:false
        };
    }

    getKnowledge({limit=10}={}) {
        const response={
            schemaVersion:1,
            scope:'pokemon_only',
            enabled:this.#enabled,
            memoryWriteAllowed:false,
            results:[]
        };

        if (!this.#enabled) {
            return {
                ...response,
                status:'disabled'
            };
        }

        if (!Number.isInteger(limit) ||
            limit<1 || limit>100) {
            throw new Error('Invalid limit');
        }

        let db;

        try {
            db=new DatabaseSync(this.#filename,{
                readOnly:true
            });

            db.exec(`
                PRAGMA query_only=ON;
                PRAGMA busy_timeout=5000;
            `);

            const results=db.prepare(`
                SELECT
                    k.id,
                    k.statement,
                    k.conditions,
                    k.limitations,
                    k.updated_at
                FROM knowledge_claims k
                WHERE k.status='approved'
                  AND EXISTS (
                    SELECT 1
                    FROM knowledge_sources s
                    JOIN analysis_runs r
                        ON r.id=s.run_id
                    WHERE s.claim_id=k.id
                  )
                ORDER BY k.updated_at DESC,k.id
                LIMIT ?
            `).all(limit);

            return {
                ...response,
                status:results.length
                    ? 'available'
                    : 'no_approved_knowledge',
                results
            };

        } catch(error) {
            return {
                ...response,
                status:'unavailable'
            };
        } finally {
            if (db) db.close();
        }
    }
}

module.exports={PokemonChatGateway};