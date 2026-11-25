const {
    CachedCalculations
} = require('./cached_calculations');

const {
    predictDamage
} = require('./damage');

const {
    getHPDependencies
} = require('./hp_dependencies');

class HPCachedCalculations extends CachedCalculations {
    constructor(options = {}) {
        super(options);

        this.normalizedRequests = 0;
        this.exactRequests = 0;
    }

    predictDamage(options) {
        const dependencies = getHPDependencies(options);

        const {attacker, defender} = options;

        // Preserve unusual HP configurations.
        const unsafeHP = config =>
            config.originalCurHP !== undefined ||
            config.isDynamaxed ||
            (
                config.curHP !== undefined &&
                (
                    !Number.isInteger(config.curHP) ||
                    config.curHP <= 0
                )
            );

        if (
            !dependencies.supported ||
            unsafeHP(attacker) ||
            unsafeHP(defender)
        ) {
            this.exactRequests++;
            return super.predictDamage(options);
        }

        const normalizedAttacker = {...attacker};
        const normalizedDefender = {...defender};

        if (!dependencies.attackerDependent) {
            delete normalizedAttacker.curHP;
        }

        if (!dependencies.defenderDependent) {
            delete normalizedDefender.curHP;
        }

        const normalized = {
            ...options,
            attacker: normalizedAttacker,
            defender: normalizedDefender
        };

        this.normalizedRequests++;

        const result = this.damageCache.getOrCompute(
            normalized,
            () => predictDamage(normalized)
        );

        if (dependencies.defenderDependent) {
            return result;
        }

        const requestedHP = defender.curHP;

        const currentHP =
            requestedHP > 0 &&
            requestedHP <= result.maxHP
                ? requestedHP
                : result.maxHP;

        const koChance =
            result.rolls && currentHP > 0
                ? result.rolls.filter(
                    damage => damage >= currentHP
                ).length / result.rolls.length
                : null;

        return {
            ...result,
            currentHP,
            koChance
        };
    }

    stats() {
        return {
            ...super.stats(),
            normalizedRequests: this.normalizedRequests,
            exactRequests: this.exactRequests
        };
    }

    clear() {
        super.clear();

        this.normalizedRequests = 0;
        this.exactRequests = 0;
    }
}

module.exports = { HPCachedCalculations };
