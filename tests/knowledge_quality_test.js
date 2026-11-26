const assert=require('node:assert/strict');

const {
    PokemonKnowledgeDB
}=require('../src/pokemon_knowledge_db');

const {
    KnowledgeQuality
}=require('../src/knowledge_quality');

const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const directory=fs.mkdtempSync(
    path.join(os.tmpdir(),'pokemon-quality-')
);

const filename=path.join(directory,'test.db');

let sourceDB;
let quality;

try {
    const analysis=JSON.parse(
        fs.readFileSync(
            'data/analysis/v05_vs_v04_100.json',
            'utf8'
        )
    );

    sourceDB=new PokemonKnowledgeDB(filename);

    const {id:runId}=sourceDB.importAnalysis(
        analysis
    );

    sourceDB.close();
    sourceDB=null;

    quality=new KnowledgeQuality(filename);

    const input={
        statement:'V05 won 53 of 100 battles.',
        conditions:'Recorded v05 versus v04 experiment.',
        limitations:'Does not establish general superiority.',
        sourceRunIds:[runId]
    };

    const claim=quality.register(input);

    assert.equal(claim.status,'research');
    assert.equal(quality.listApproved().length,0);

    console.log('Default research status: PASS');

    assert.throws(
        ()=>quality.register({
            ...input,
            sourceRunIds:[]
        }),
        /Missing evidence/
    );

    assert.throws(
        ()=>quality.register({
            ...input,
            sourceRunIds:['invalid-run']
        })
    );

    assert.equal(
        quality.db.prepare(`
            SELECT COUNT(*) AS count
            FROM knowledge_claims
        `).get().count,
        1
    );

    console.log('Evidence requirement: PASS');

    assert.throws(
        ()=>quality.transition(
            claim.id,'approved',
            'manual_operator','Test'
        ),
        /Invalid transition/
    );

    quality.transition(
        claim.id,'review',
        'research_process','Review requested'
    );

    assert.equal(quality.listApproved().length,0);

    console.log('Review requirement: PASS');

    assert.throws(
        ()=>quality.transition(
            claim.id,'approved',
            'automatic_ai','Test'
        ),
        /Manual approval required/
    );

    console.log('Automatic approval rejection: PASS');

    quality.transition(
        claim.id,'approved',
        'manual_operator','Test approval only'
    );

    assert.equal(quality.listApproved().length,1);

    console.log('Manual approval: PASS');

    quality.transition(
        claim.id,'revoked',
        'manual_operator','Test revocation'
    );

    assert.equal(quality.listApproved().length,0);

    assert.equal(
        quality.get(claim.id).status,
        'revoked'
    );

    assert.throws(
        ()=>quality.transition(
            claim.id,'approved',
            'manual_operator','Test'
        ),
        /Invalid transition/
    );

    console.log('Revocation: PASS');

    assert.deepEqual(
        quality.getAudit(claim.id).map(
            r=>r.new_status
        ),
        ['research','review','approved','revoked']
    );

    console.log('Audit history: PASS');

} finally {
    if (quality) quality.close();
    if (sourceDB) sourceDB.close();

    fs.rmSync(directory,{
        recursive:true,
        force:true
    });
}

const production=new KnowledgeQuality();

try {
    assert.equal(
        production.listApproved().length,
        0
    );

    console.log('Production approved claims: 0');
} finally {
    production.close();
}

console.log('KNOWLEDGE QUALITY TEST: PASS');