const fs = require('node:fs');
const assert = require('node:assert/strict');

for (const [file, own, opponent] of [
    ['logs/player1_visible.log', 'p1', 'p2'],
    ['logs/player2_visible.log', 'p2', 'p1']
]) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    let checked = 0;
    let ownExact = 0;

    for (const line of lines) {
        const parts = line.split('|');
        const event = parts[1];

        if (!['switch', 'drag', '-damage', '-heal'].includes(event)) {
            continue;
        }

        const target = parts[2] || '';
        const condition = ['switch', 'drag'].includes(event)
            ? parts[4]
            : parts[3];

        const hp = (condition || '').match(/^(\d+)\/(\d+)/);
        if (!hp) continue;

        if (target.startsWith(opponent)) {
            assert.equal(Number(hp[2]), 100, line);
            checked++;
        }

        if (target.startsWith(own) && Number(hp[2]) !== 100) {
            ownExact++;
        }
    }

    assert.ok(checked > 0);
    assert.ok(ownExact > 0);

    console.log(own + ' opponent HP checks:', checked);
    console.log(own + ' own exact HP checks:', ownExact);
}

console.log('HP PRIVACY TEST: PASS');
