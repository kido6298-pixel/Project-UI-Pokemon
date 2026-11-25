const { Dex } = require('pokemon-showdown');

const formatId = Dex.formats.validate(
    'gen4customgame@@@Team Preview,Min Team Size = 6,!! Max Team Size = 6,Picked Team Size = 3,!! Max Level = 50,!! Default Level = 50'
);

const format = Dex.formats.get(formatId, true);
const rules = Dex.formats.getRuleTable(format);

console.log('\n=== FORMAT ===');
console.log(formatId);

console.log('\n=== RULES ===');

for (const [key, value] of rules) {
    console.log(key, ':', value);
}

console.log('\n=== HP RULES ===');

for (const name of [
    'HP Percentage Mod',
    'Exact HP Mod',
    'Cancel Mod'
]) {
    const rule = Dex.formats.get(name);
    console.log(name, ':', rule.exists, rule.id);
}
