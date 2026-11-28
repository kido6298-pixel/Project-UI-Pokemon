const fs = require('node:fs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const input = 'src/agents/strategic_agent_v05_optimized.js';
const output = 'src/agents/strategic_agent_dolphin.js';

const original = fs.readFileSync(input, 'utf8');
let source = original.replace(/\r\n/g, '\n');

function replaceExact(before, after) {
    const count = source.split(before).length - 1;

    assert.equal(
        count, 1,
        'Unexpected source structure: ' + before
    );

    source = source.replace(before, after);
}

replaceExact(
    "const { buildOwnConfig } = require('../pokemon_config');",
    "const { buildDolphinConfig } = require('../../dolphin_adapter/damage_adapter');"
);

replaceExact(
    "    FastHPCachedCalculations\n} = require('../fast_hp_cached_calculations');",
    "    DolphinCalculations\n} = require('../../dolphin_adapter/damage_adapter');"
);

replaceExact(
    'class StrategicAgentV05Optimized extends StrategicAgentV03',
    'class StrategicAgentDolphin extends StrategicAgentV03'
);

replaceExact(
    'new FastHPCachedCalculations()',
    'new DolphinCalculations()'
);

replaceExact(
    'const own = buildOwnConfig(',
    'const own = buildDolphinConfig('
);

replaceExact(
    'const candidate = buildOwnConfig(pokemon);',
    'const candidate = buildDolphinConfig(pokemon);'
);

replaceExact(
    'module.exports = { StrategicAgentV05Optimized };',
    'module.exports = { StrategicAgentDolphin };'
);

// Normalize line endings for source matching.
assert.ok(!source.includes('buildOwnConfig('));
assert.ok(!source.includes('new FastHPCachedCalculations()'));


replaceExact(
    '.filter(a => isSimpleAttack(a.move));',
    ".filter(a => a.move.id === 'hiddenpower' || isSimpleAttack(a.move));"
);

replaceExact(
    '.filter(isSimpleAttack)',
    ".filter(move => move.id === 'hiddenpower' || isSimpleAttack(move))"
);

const hash = crypto.createHash('sha256')
    .update(original)
    .digest('hex');

source =
    '// Dolphin-specific experimental agent\n' +
    '// Base source SHA256: ' + hash + '\n' +
    source;

fs.writeFileSync(output, source, 'utf8');

assert.equal(
    fs.readFileSync(input, 'utf8'),
    original
);

console.log('Original AI preserved: PASS');
console.log('Dolphin agent generated: PASS');
console.log('Saved:', output);

