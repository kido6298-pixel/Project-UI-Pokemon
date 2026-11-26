const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const {
    PokemonKnowledgeDB
}=require('../src/pokemon_knowledge_db');

const {
    KnowledgeQuality
}=require('../src/knowledge_quality');

const {
    PokemonChatGateway
}=require('../src/pokemon_chat_gateway');

const directory=fs.mkdtempSync(
    path.join(os.tmpdir(),'pokemon-gateway-')
);

const filename=path.join(directory,'test.db');

let sourceDB;
let quality;

try {
    const missing=new PokemonChatGateway({
        filename:path.join(directory,'missing.db')
    });

    assert.equal(
        missing.getKnowledge().status,
        'disabled'
    );

    assert.equal(
        fs.existsSync(
            path.join(directory,'missing.db')
        ),
        false
    );

    missing.setEnabled(true);

    assert.equal(
        missing.getKnowledge().status,
        'unavailable'
    );

    assert.equal(
        missing.getKnowledge().results.length,0
    );

    console.log('Fail-closed protection: PASS');

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

    function register(statement) {
        return quality.register({
            statement,
            conditions:'Test experiment only',
            limitations:'Not general battle knowledge',
            sourceRunIds:[runId]
        });
    }

    const research=register('RESEARCH_ONLY');
    const review=register('REVIEW_ONLY');
    const approved=register('APPROVED_ONLY');
    const revoked=register('REVOKED_ONLY');

    quality.transition(
        review.id,'review',
        'research_process','Test'
    );

    for (const claim of [approved,revoked]) {
        quality.transition(
            claim.id,'review',
            'research_process','Test'
        );

        quality.transition(
            claim.id,'approved',
            'manual_operator','Test'
        );
    }

    quality.transition(
        revoked.id,'revoked',
        'manual_operator','Test'
    );

    const gateway=new PokemonChatGateway({
        filename
    });

    assert.equal(
        gateway.getStatus().enabled,false
    );

    assert.equal(
        gateway.getKnowledge().results.length,0
    );

    console.log('Default disconnected: PASS');

    gateway.setEnabled(true);

    const result=gateway.getKnowledge();

    assert.equal(result.status,'available');
    assert.equal(result.results.length,1);
    assert.equal(
        result.results[0].id,approved.id
    );

    const serialized=JSON.stringify(result);

    for (const secret of [
        'RESEARCH_ONLY',
        'REVIEW_ONLY',
        'REVOKED_ONLY'
    ]) {
        assert.equal(
            serialized.includes(secret),false
        );
    }

    console.log('Approved-only access: PASS');
    console.log('Unapproved knowledge isolation: PASS');

    gateway.setEnabled(false);

    assert.equal(
        gateway.getKnowledge().results.length,0
    );

    assert.equal(
        gateway.getKnowledge().status,'disabled'
    );

    console.log('Immediate disconnection: PASS');

    gateway.setEnabled(true);

    assert.equal(
        gateway.getKnowledge().results.length,1
    );

    console.log('Reconnection: PASS');

    quality.transition(
        approved.id,'revoked',
        'manual_operator','Test'
    );

    assert.equal(
        gateway.getKnowledge().results.length,0
    );

    assert.equal(
        gateway.getKnowledge().status,
        'no_approved_knowledge'
    );

    console.log('Immediate revocation: PASS');

    assert.equal(
        gateway.getStatus().memoryWriteAllowed,
        false
    );

    assert.equal(
        gateway.getKnowledge().memoryWriteAllowed,
        false
    );

    assert.throws(
        ()=>gateway.setEnabled('true'),
        /Invalid connection setting/
    );

    console.log('Connection setting validation: PASS');

} finally {
    if (quality) quality.close();
    if (sourceDB) sourceDB.close();

    fs.rmSync(directory,{
        recursive:true,
        force:true
    });
}

const production=new PokemonChatGateway();

assert.equal(
    production.getStatus().enabled,false
);

assert.equal(
    production.getKnowledge().results.length,0
);

console.log('Production connection: OFF');
console.log('POKEMON CHAT GATEWAY TEST: PASS');