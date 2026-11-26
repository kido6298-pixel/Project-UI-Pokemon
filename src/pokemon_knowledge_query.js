const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');

class PokemonKnowledgeQuery {
    constructor(filename=path.join(
        __dirname,'../data/pokemon_knowledge.db'
    )) {
        this.db = new DatabaseSync(filename,{
            readOnly:true
        });

        this.db.exec(`
            PRAGMA query_only = ON;
            PRAGMA busy_timeout = 5000;
        `);
    }

    listRuns() {
        return this.db.prepare(`
            SELECT id,engine_version,task_hash,
                   battles,imported_at
            FROM analysis_runs
            ORDER BY imported_at DESC,id
        `).all();
    }

    getAgent(agent) {
        return this.db.prepare(`
            SELECT a.*,r.engine_version,r.task_hash
            FROM agent_statistics a
            JOIN analysis_runs r ON r.id=a.run_id
            WHERE a.agent=?
            ORDER BY r.imported_at DESC,r.id
        `).all(agent);
    }

    getEnemy(species,agent=null) {
        return this.db.prepare(`
            SELECT e.*,r.engine_version,r.task_hash,
                   r.battles AS source_battles
            FROM enemy_statistics e
            JOIN analysis_runs r ON r.id=e.run_id
            WHERE e.species=? COLLATE NOCASE
              AND (? IS NULL OR e.agent=?)
            ORDER BY r.imported_at DESC,r.id,e.agent
        `).all(species,agent,agent);
    }

    getActions(agent,limit=10) {
        if (!Number.isInteger(limit) ||
            limit<1 || limit>100) {
            throw new Error('Invalid limit');
        }

        return this.db.prepare(`
            WITH ranked AS (
                SELECT a.*,r.engine_version,r.task_hash,
                    ROW_NUMBER() OVER (
                        PARTITION BY a.run_id
                        ORDER BY a.count DESC,a.action
                    ) AS rank
                FROM action_statistics a
                JOIN analysis_runs r ON r.id=a.run_id
                WHERE a.agent=?
            )
            SELECT * FROM ranked
            WHERE rank<=?
            ORDER BY run_id,rank
        `).all(agent,limit);
    }

    getMatchup(agent,opponent) {
        return this.db.prepare(`
            SELECT m.*,r.engine_version,r.task_hash
            FROM matchup_statistics m
            JOIN analysis_runs r ON r.id=m.run_id
            WHERE m.matchup=?
            ORDER BY r.imported_at DESC,r.id
        `).all(agent+' vs '+opponent);
    }

    query(request) {
        if (!request || typeof request!=='object') {
            throw new Error('Invalid query');
        }

        const requireText = key => {
            const value = request[key];

            if (typeof value!=='string' ||
                !value.trim()) {
                throw new Error('Missing '+key);
            }

            return value.trim();
        };

        let rows;
        let metric;

        switch (request.type) {
            case 'runs':
                rows=this.listRuns();
                metric='experiment';
                break;

            case 'agent':
                rows=this.getAgent(
                    requireText('agent')
                );
                metric='battle_statistics';
                break;

            case 'enemy':
                rows=this.getEnemy(
                    requireText('species'),
                    request.agent==null
                        ? null
                        : requireText('agent')
                );
                metric='decision_statistics';
                break;

            case 'actions':
                rows=this.getActions(
                    requireText('agent'),
                    request.limit ?? 10
                );
                metric='searched_action_frequency';
                break;

            case 'matchup':
                rows=this.getMatchup(
                    requireText('agent'),
                    requireText('opponent')
                );
                metric='battle_statistics';
                break;

            default:
                throw new Error('Unknown query type');
        }

        return {
            schemaVersion:1,
            scope:'research_only',
            approvedForChat:false,
            query:request,
            metric,
            found:rows.length>0,
            count:rows.length,
            results:rows,
            limitations:[
                'Research data only.',
                'Not approved for normal chat.',
                'Results depend on experiment conditions.',
                'Experiments are not automatically pooled.',
                'Decision statistics are not Pokemon win rates.',
                'Associations do not establish causation.'
            ]
        };
    }

    close() {
        this.db.close();
    }
}

module.exports = {PokemonKnowledgeQuery};