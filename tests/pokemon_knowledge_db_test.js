const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
    PokemonKnowledgeDB
} = require('../src/pokemon_knowledge_db');

const analysis = JSON.parse(
    fs.readFileSync(
        'data/analysis/v05_vs_v04_100.json',
        'utf8'
    )
);

function verify(db) {
    const first = db.importAnalysis(analysis);
    const second = db.importAnalysis(analysis);

    assert.equal(first.id,second.id);
    assert.equal(second.imported,false);

    const agents = db.getAgents(first.id);

    assert.equal(agents.length,2);
    assert.equal(
        agents.find(a => a.agent === 'v05').wins,
        53
    );
    assert.equal(
        agents.find(a => a.agent === 'v04').wins,
        47
    );

    for (
        const [agent,a] of
        Object.entries(analysis.agents)
    ) {
        for (
            const [species,e] of
            Object.entries(a.enemies)
        ) {
            const row = db.getEnemy(
                first.id,agent,species
            );

            assert.equal(
                row.encounters,e.encounters
            );
            assert.equal(row.attacks,e.attacks);
            assert.equal(row.switches,e.switches);
        }

        const actions = db.getTopActions(
            first.id,agent,10000
        );

        assert.equal(
            actions.length,
            Object.keys(a.actions).length
        );

        for (const row of actions) {
            assert.equal(
                row.count,a.actions[row.action]
            );
        }
    }

    assert.equal(
        db.getMatchups(first.id).length,
        Object.keys(analysis.matchups).length
    );

    const changed = structuredClone(analysis);
    changed.agents.v05.wins++;

    assert.throws(
        () => db.importAnalysis(changed),
        /Conflicting analysis/
    );

    assert.throws(
        () => db.importAnalysis({
            ...analysis,
            complete:false
        }),
        /Invalid or incomplete/
    );

    assert.equal(
        db.db.prepare(
            'PRAGMA integrity_check'
        ).get().integrity_check,
        'ok'
    );

    assert.equal(
        db.db.prepare(
            'PRAGMA foreign_key_check'
        ).all().length,
        0
    );

    return first.id;
}

const memory = new PokemonKnowledgeDB(':memory:');

try {
    verify(memory);
    console.log('Memory database: PASS');
    console.log('Duplicate prevention: PASS');
    console.log('Statistics equality: PASS');
    console.log('Conflict protection: PASS');
    console.log('Integrity check: PASS');
} finally {
    memory.close();
}

const filename = 'data/pokemon_knowledge.db';
const db = new PokemonKnowledgeDB(filename);

let id;

try {
    id = verify(db);

    console.log('\n=== AGENT STATISTICS ===');

    console.table(
        db.getAgents(id).map(a => ({
            agent:a.agent,
            battles:a.battles,
            wins:a.wins,
            losses:a.losses,
            winRate:a.win_rate
        }))
    );

    console.log('\n=== SUICUNE / V05 ===');
    console.log(db.getEnemy(id,'v05','Suicune'));

    console.log('\n=== TOP ACTIONS / V05 ===');
    console.table(db.getTopActions(id,'v05',5));

} finally {
    db.close();
}

const reopened = new PokemonKnowledgeDB(filename);

try {
    assert.equal(reopened.getAgents(id).length,2);

    assert.equal(
        reopened.importAnalysis(analysis).imported,
        false
    );

    console.log('Persistent database: PASS');
} finally {
    reopened.close();
}

console.log('Database:',filename);
console.log('Database bytes:',fs.statSync(filename).size);
console.log('POKEMON KNOWLEDGE DB TEST: PASS');