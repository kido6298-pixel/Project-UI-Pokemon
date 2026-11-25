const { Dex } = require('pokemon-showdown');

const formatId = 'gen4customgame@@@Team Preview,Min Team Size = 6,!! Max Team Size = 6,Picked Team Size = 3,!! Max Level = 50,!! Default Level = 50';

try {
    const validated = Dex.formats.validate(formatId);
    const format = Dex.formats.get(validated, true);
    const rules = Dex.formats.getRuleTable(format);

    const result = {
        generation: Dex.mod(format.mod).gen,
        teamPreview: rules.has('teampreview'),
        minTeamSize: rules.minTeamSize,
        maxTeamSize: rules.maxTeamSize,
        pickedTeamSize: rules.pickedTeamSize,
        maxLevel: rules.maxLevel
    };

    console.log(result);

    const pass =
        result.generation === 4 &&
        result.teamPreview &&
        result.minTeamSize === 6 &&
        result.maxTeamSize === 6 &&
        result.pickedTeamSize === 3 &&
        result.maxLevel === 50;

    console.log(pass ? 'RULE TEST: PASS' : 'RULE TEST: FAIL');
    if (!pass) process.exitCode = 1;

} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}



