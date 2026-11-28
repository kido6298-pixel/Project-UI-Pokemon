import json
import copy
from pathlib import Path
from dolphin_adapter.team_overrides import fingerprint

ROOT = Path("data/dolphin")
STAT_KEYS = ("hp", "atk", "def", "spa", "spd", "spe")

HP_TYPES = {
    "Fighting", "Flying", "Poison", "Ground",
    "Rock", "Bug", "Ghost", "Steel",
    "Fire", "Water", "Grass", "Electric",
    "Psychic", "Ice", "Dragon", "Dark"
}


def read_json(name):
    return json.loads(
        (ROOT / name).read_text(encoding="utf-8")
    )


def valid_int(value, minimum, maximum):
    return (
        type(value) is int
        and minimum <= value <= maximum
    )


def resolve_team(scan, overrides):
    result = copy.deepcopy(scan)

    entries = {
        (p["species"], p["nickname"]): p
        for p in overrides["pokemon"]
    }

    if len(entries) != 6 or len(result["pokemon"]) != 6:
        raise ValueError("Invalid team size")

    confirmed = (
        overrides.get("confirmed") is True
        and overrides.get("confirmed_scan")
        == scan["created_at"]
    )

    seen = set()

    for pokemon in result["pokemon"]:
        key = (
            pokemon["species"],
            pokemon["nickname"]
        )

        if key in seen:
            raise ValueError("Duplicate Pokemon")

        seen.add(key)

        entry = entries.get(key)

        if not entry:
            raise ValueError(f"Missing override: {key}")

        if entry["fingerprint"] != fingerprint(pokemon):
            raise ValueError(f"Identity changed: {key}")

        issues = []

        if not confirmed or entry.get("confirmed") is not True:
            issues.append("confirmation_required")

        for field in ("level", "ability", "item"):
            value = entry.get(field)

            if value is not None:
                pokemon[field] = value

        for stat, value in entry.get("stats", {}).items():
            if value is None:
                continue

            if stat == "hp":
                pokemon["max_hp"] = value
            elif stat in STAT_KEYS:
                pokemon["stats"][stat] = value
            else:
                raise ValueError(f"Unknown stat: {stat}")

        if not valid_int(pokemon["level"], 1, 100):
            issues.append("level_invalid")

        for field in ("ability", "item"):
            if not isinstance(pokemon.get(field), str):
                issues.append(f"{field}_unknown")
            elif not pokemon[field].strip():
                issues.append(f"{field}_empty")

        source_stats = {
            "hp": pokemon["max_hp"],
            **pokemon["stats"]
        }

        for stat in STAT_KEYS:
            if not valid_int(
                source_stats.get(stat), 1, 999
            ):
                issues.append(f"{stat}_invalid")

        if entry.get("battle_stats") is not None:
            battle_stats = entry["battle_stats"]
        elif pokemon["level"] == 50:
            battle_stats = source_stats
        else:
            battle_stats = None

        pokemon["battle_stats"] = battle_stats

        if battle_stats is None:
            issues.append("battle_stats_missing")
        else:
            for stat in STAT_KEYS:
                if not valid_int(
                    battle_stats.get(stat), 1, 999
                ):
                    issues.append(f"battle_{stat}_invalid")

        moves = pokemon["moves"]

        if len(moves) != 4:
            issues.append("invalid_move_count")

        if {m["slot"] for m in moves} != {1, 2, 3, 4}:
            issues.append("invalid_move_slots")

        for move in moves:
            slot = str(move["slot"])

            for field, value in entry.get(
                "moves", {}
            ).get(slot, {}).items():
                if field in ("move", "pp", "max_pp"):
                    if value is not None:
                        move[field] = value

            move_valid = (
                isinstance(move.get("move"), str)
                and bool(move["move"].strip())
                and valid_int(move.get("max_pp"), 1, 64)
                and valid_int(
                    move.get("pp"), 0, move["max_pp"]
                )
            )

            if not move_valid:
                issues.append(f"move_{slot}_invalid")

            if move["move"] == "Hidden Power":
                hp = entry.get(
                    "hidden_power", {}
                ).get(slot, {})

                move["hidden_power_type"] = hp.get("type")
                move["hidden_power_power"] = hp.get("power")

                if (
                    hp.get("type") not in HP_TYPES
                    or not valid_int(
                        hp.get("power"), 30, 70
                    )
                ):
                    issues.append(
                        f"move_{slot}_hidden_power_invalid"
                    )
                    move_valid = False

            move["valid"] = move_valid

        pokemon["issues"] = issues
        pokemon["data_complete"] = not issues
        pokemon["ready_for_ai"] = False

    result["data_complete"] = all(
        p["data_complete"] for p in result["pokemon"]
    )

    result["ready_for_ai"] = False
    result["integration_status"] = "bridge_not_validated"

    return result


if __name__ == "__main__":
    scan = read_json("team_scan.json")
    overrides = read_json("team_overrides.json")

    result = resolve_team(scan, overrides)

    for pokemon in result["pokemon"]:
        print(
            f"\n=== {pokemon['species']} ==="
        )
        print("Level:", pokemon["level"])
        print("Ability:", pokemon["ability"])
        print("Item:", pokemon["item"])
        print("Battle stats:", pokemon["battle_stats"])

        for move in pokemon["moves"]:
            print(
                move["slot"],
                move["move"],
                move["pp"],
                move["max_pp"],
                move.get("hidden_power_type", ""),
                move.get("hidden_power_power", "")
            )

        print("Issues:", pokemon["issues"])
        print("Complete:", pokemon["data_complete"])

    # Verify missing confirmation is rejected.
    unconfirmed = copy.deepcopy(overrides)
    unconfirmed["confirmed"] = False

    assert not resolve_team(
        scan, unconfirmed
    )["data_complete"]

    # Verify changed scan requires confirmation.
    changed = copy.deepcopy(scan)
    changed["created_at"] = "different_scan"

    assert not resolve_team(
        changed, overrides
    )["data_complete"]

    # Verify invalid Hidden Power is rejected.
    invalid = copy.deepcopy(overrides)

    for entry in invalid["pokemon"]:
        for hp in entry["hidden_power"].values():
            hp["power"] = 71

    assert not resolve_team(
        scan, invalid
    )["data_complete"]

    print("\nConfirmation guard: PASS")
    print("Rescan guard: PASS")
    print("Hidden Power validation: PASS")

    output = ROOT / "team_resolved.json"
    temp = output.with_suffix(".tmp")

    temp.write_text(
        json.dumps(
            result, indent=2, ensure_ascii=False
        ),
        encoding="utf-8"
    )

    temp.replace(output)

    print("Pokemon:", len(result["pokemon"]))
    print("Data complete:", result["data_complete"])
    print("Ready for AI:", result["ready_for_ai"])
    print("Saved:", output.resolve())

    if not result["data_complete"]:
        raise RuntimeError("Unresolved team information")

    print("STEP 235: ALL TESTS PASS")
