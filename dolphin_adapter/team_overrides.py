import json
import hashlib
from pathlib import Path

ROOT = Path("data/dolphin")
SOURCE = ROOT / "team_scan.json"
OUTPUT = ROOT / "team_overrides.json"


def fingerprint(pokemon):
    identity = {
        "species": pokemon["species"],
        "nickname": pokemon["nickname"],
        "moves": [
            m["move"] for m in pokemon["moves"]
        ]
    }

    raw = json.dumps(
        identity, sort_keys=True
    ).encode("utf-8")

    return hashlib.sha256(raw).hexdigest()


def create_overrides():
    source = json.loads(
        SOURCE.read_text(encoding="utf-8")
    )

    if len(source["pokemon"]) != 6:
        raise RuntimeError("Invalid team size")

    result = {
        "schema_version": 1,
        "confirmed": False,
        "pokemon": []
    }

    for pokemon in source["pokemon"]:
        entry = {
            "species": pokemon["species"],
            "nickname": pokemon["nickname"],
            "fingerprint": fingerprint(pokemon),
            "confirmed": False,
            "level": None,
            "ability": None,
            "item": None,
            "stats": {},
            "battle_stats": None,
            "moves": {},
            "hidden_power": {}
        }

        for key, value in pokemon["stats"].items():
            if value is None:
                entry["stats"][key] = None

        if pokemon["max_hp"] is None:
            entry["stats"]["hp"] = None

        for move in pokemon["moves"]:
            slot = str(move["slot"])

            if not move["valid"]:
                entry["moves"][slot] = {
                    "move": move["move"],
                    "pp": move["pp"],
                    "max_pp": move["max_pp"]
                }

            if move["move"] == "Hidden Power":
                entry["hidden_power"][slot] = {
                    "type": None,
                    "power": None
                }

        if pokemon["species"] == "Tyranitar":
            entry["battle_stats"] = {
                "hp": None,
                "atk": None,
                "def": None,
                "spa": None,
                "spd": None,
                "spe": None
            }

        result["pokemon"].append(entry)

        print(pokemon["species"])
        print("Issues:", pokemon["issues"])

    if OUTPUT.exists():
        print("Existing overrides preserved")
        return

    OUTPUT.write_text(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    print("\nSaved:", OUTPUT.resolve())
    print("STEP 233: OVERRIDE TEMPLATE GENERATED")


if __name__ == "__main__":
    create_overrides()
