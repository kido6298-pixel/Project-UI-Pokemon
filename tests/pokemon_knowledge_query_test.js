const assert = require('node:assert/strict');

const {
    PokemonKnowledgeQuery
} = require('../src/pokemon_knowledge_query');

const db = new PokemonKnowledgeQuery();

try {
    const queries = [
        {type:'runs'},
        {type:'agent',agent:'v05'},
        {type:'enemy',species:'suicune',agent:'v05'},
        {type:'actions',agent:'v05',limit:5},
        {type:'matchup',agent:'v05',opponent:'v04'}
    ];

    const results = queries.map(q => db.query(q));

    for (const result of results) {
        assert.equal(result.found,true);
        assert.equal(result.scope,'research_only');
        assert.equal(result.approvedForChat,false);

        console.log(
            result.query.type+' search: PASS'
        );
    }

    assert.ok(results[0].results.some(
        r => r.battles===100
    ));

    assert.ok(results[1].results.some(
        r => r.battles===100 &&
             r.wins===53 &&
             r.losses===47
    ));

    assert.equal(
        results[2].metric,
        'decision_statistics'
    );

    assert.ok(results[3].results.some(
        r => r.action==='attack:Surf' &&
             r.count===159 &&
             r.rank===1
    ));

    assert.ok(results[4].results.some(
        r => r.wins===53 &&
             r.losses===47
    ));

    console.log('Statistics equality: PASS');

    const missing=db.query({
        type:'enemy',
        species:'UnknownPokemon'
    });

    assert.equal(missing.found,false);
    assert.equal(missing.count,0);

    console.log('Missing knowledge: PASS');

    assert.throws(
        () => db.query({type:'invalid'}),
        /Unknown query type/
    );

    assert.throws(
        () => db.query({
            type:'actions',
            agent:'v05',
            limit:1000
        }),
        /Invalid limit/
    );

    console.log('Invalid query handling: PASS');

    assert.throws(
        () => db.db.exec(
            'CREATE TABLE forbidden_test(id INTEGER)'
        )
    );

    console.log('Read-only protection: PASS');
    console.log('Research-only metadata: PASS');

    console.log(
        '\nPOKEMON KNOWLEDGE QUERY TEST: PASS'
    );

} finally {
    db.close();
}