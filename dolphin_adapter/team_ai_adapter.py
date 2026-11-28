import json
import re
from pathlib import Path

ROOT = Path("data/dolphin")


def to_id(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


def convert_pokemon(pokemon):
    if pokemon.get("data_complete") is not True:
        raise ValueError("Incomplete Pokemon data")

    stats = pokemon["battle_stats"]
    name = pokemon["nickname"]
    species = pokemon["species"]

    moves = sorted(
        pokemon["moves"],
        key=lambda m: m["slot"]
    )

    if [m["slot"] for m in moves] != [1, 2, 3, 4]:
        raise ValueError("Invalid move slots")

    hidden_power = None
    move_data = []

    for move in moves:
        if not move["valid"]:
            raise ValueError("Invalid move data")

        move_id = to_id(move["move"])

        if move_id == "hiddenpower":
            hidden_power = {
                "type": move["hidden_power_type"],
                "power": move["hidden_power_power"]
            }

        move_data.append({
            "move": move["move"],
            "id": move_id,
            "pp": move["pp"],
            "maxpp": move["max_pp"],
            "disabled": move["pp"] == 0
        })

    return {
        "slot": pokemon["slot"],
        "ident": f"p1: {name}",
        "details": f"{species}, L50",
        "condition": f"{stats['hp']}/{stats['hp']}",
        "active": False,
        "stats": {
            key: stats[key]
            for key in ("atk", "def", "spa", "spd", "spe")
        },
        "moves": [m["id"] for m in move_data],
        "baseAbility": to_id(pokemon["ability"]),
        "ability": to_id(pokemon["ability"]),
        "item": to_id(pokemon["item"]),
        "move_data": move_data,
        "hidden_power": hidden_power
    }


def convert_team(source):
    if source.get("data_complete") is not True:
        raise ValueError("Incomplete team data")

    if len(source["pokemon"]) != 6:
        raise ValueError("Invalid team size")

    pokemon = [
        convert_pokemon(p)
        for p in source["pokemon"]
    ]

    if len({p["ident"] for p in pokemon}) != 6:
        raise ValueError("Duplicate identity")

    return {
        "schema_version": 1,
        "generation": 4,
        "source": "dolphin",
        "source_scan": source["created_at"],
        "format": "singles_6_to_3",
        "ready_for_ai": False,
        "team_preview_request": {
            "teamPreview": True,
            "maxChosenTeamSize": 3,
            "side": {
                "id": "p1",
                "name": "Project U.I.",
                "pokemon": pokemon
            }
        }
    }


if __name__ == "__main__":
    source = json.loads(
        (ROOT / "team_resolved.json").read_text(
            encoding="utf-8"
        )
    )

    result = convert_team(source)

    team = result[
        "team_preview_request"
    ]["side"]["pokemon"]

    for p in team:
        print("\n", p["details"])
        print("Condition:", p["condition"])
        print("Stats:", p["stats"])
        print("Ability:", p["ability"])
        print("Item:", p["item"])
        print("Moves:", p["moves"])
        print("Hidden Power:", p["hidden_power"])

    assert len(team) == 6

    tyranitar = next(
        p for p in team
        if p["details"].startswith("Tyranitar,")
    )

    assert tyranitar["condition"] == "207/207"

    assert tyranitar["stats"] == {
        "atk": 194,
        "def": 130,
        "spa": 103,
        "spd": 130,
        "spe": 81
    }

    expected_hp = {
        "Infernape": "Ice",
        "Suicune": "Electric",
        "Zapdos": "Ice"
    }

    for p in team:
        species = p["details"].split(",")[0]

        if species in expected_hp:
            assert p["hidden_power"] == {
                "type": expected_hp[species],
                "power": 70
            }
        else:
            assert p["hidden_power"] is None

        assert len(p["moves"]) == 4
        assert len(p["move_data"]) == 4
        assert p["active"] is False

    print("\nLevel 50 conversion: PASS")
    print("Hidden Power metadata: PASS")
    print("Move slot preservation: PASS")

    output = ROOT / "team_ai_input.json"
    temporary = output.with_suffix(".tmp")

    temporary.write_text(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    temporary.replace(output)

    print("Pokemon:", len(team))
    print("Ready for AI:", result["ready_for_ai"])
    print("Saved:", output.resolve())
    print("STEP 236: ALL TESTS PASS")
