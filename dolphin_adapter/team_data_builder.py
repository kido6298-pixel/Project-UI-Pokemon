import json
from pathlib import Path
from datetime import datetime, timezone
from PIL import Image

from dolphin_adapter.team_identity_recognition import (
    read_identity, load_templates as load_identity
)

from dolphin_adapter.team_stats_recognition import (
    read_stats, load_templates as load_stats
)

from dolphin_adapter.team_move_recognition import (
    read_moves, load_move_templates
)

from dolphin_adapter.team_pp_recognition import (
    load_pp_templates
)

ROOT = Path("data/dolphin")
SCAN = ROOT / "team_scan"
OUTPUT = ROOT / "team_scan.json"


def find_folder(pattern, prefix):
    folders = [
        p for p in SCAN.glob(pattern)
        if p.is_dir() and all(
            (p / f"{prefix}_{i:02d}.png").exists()
            for i in range(1, 7)
        )
    ]

    if not folders:
        raise RuntimeError(f"Missing scan: {prefix}")

    return max(
        folders,
        key=lambda p: p.stat().st_mtime
    )


def build_team():
    stats_folder = find_folder(
        "*_validation", "stats"
    )

    moves_folder = find_folder(
        "*", "moves"
    )

    identity_templates = load_identity()
    stat_templates = load_stats()
    move_templates = load_move_templates()
    pp_templates = load_pp_templates()

    team = []
    move_pages = {}
    seen = set()

    for index in range(1, 7):
        path = moves_folder / f"moves_{index:02d}.png"

        with Image.open(path) as image:
            identity = read_identity(
                image, identity_templates
            )

            species = identity["species"]["value"]
            nickname = identity["nickname"]["value"]

            if not species or not nickname:
                raise RuntimeError(
                    f"Unknown move page identity: {path}"
                )

            key = (species, nickname)

            if key in move_pages:
                raise RuntimeError(
                    f"Duplicate move page: {key}"
                )

            move_pages[key] = {
                "source": str(path),
                "moves": read_moves(
                    image, move_templates, pp_templates
                )
            }

    for index in range(1, 7):
        path = stats_folder / f"stats_{index:02d}.png"

        with Image.open(path) as image:
            identity = read_identity(
                image, identity_templates
            )

            stats = read_stats(
                image, stat_templates
            )

        species = identity["species"]["value"]
        nickname = identity["nickname"]["value"]

        if not species or not nickname:
            raise RuntimeError(
                f"Unknown stats page identity: {path}"
            )

        key = (species, nickname)

        if key in seen:
            raise RuntimeError(
                f"Duplicate Pokemon: {key}"
            )

        seen.add(key)

        if key not in move_pages:
            raise RuntimeError(
                f"Missing moves for {key}"
            )

        page = move_pages.pop(key)
        moves = page["moves"]
        issues = []

        ability = identity["ability"]["value"]
        item = identity["item"]["value"]

        if ability is None:
            issues.append("ability_unknown")

        if item is None:
            issues.append("item_unknown")

        raw = stats["raw"]
        hp = raw["hp"].split("/")

        current_hp = None
        max_hp = None

        if len(hp) == 2 and all(
            x.isdigit() for x in hp
        ):
            current, maximum = map(int, hp)

            if 0 <= current <= maximum <= 714 and maximum > 0:
                current_hp = current
                max_hp = maximum

        if max_hp is None:
            issues.append("hp_unknown")

        values = {}

        for name in ("atk", "def", "spa", "spd", "spe"):
            text = raw[name]

            value = int(text) if text.isdigit() else None

            if value is None or not 1 <= value <= 999:
                value = None
                issues.append(f"{name}_unknown")

            values[name] = value

        issues.append("level_unverified")

        for move in moves:
            if not move["valid"]:
                issues.append(
                    f"move_{move['slot']}_unknown"
                )

            if move["move"] == "Hidden Power":
                move["hidden_power_type"] = None
                move["hidden_power_power"] = None

                issues.append(
                    f"move_{move['slot']}_hidden_power_unknown"
                )

        pokemon = {
            "slot": index,
            "species": species,
            "nickname": nickname,
            "level": None,
            "battle_level": 50,
            "ability": ability,
            "item": item,
            "current_hp": current_hp,
            "max_hp": max_hp,
            "stats": values,
            "moves": moves,
            "battle_stats": None,
            "issues": issues,
            "ready_for_ai": False,
            "source": {
                "stats": str(path),
                "moves": page["source"]
            },
            "recognition": {
                "identity": identity,
                "stats_raw": raw
            }
        }

        team.append(pokemon)

    if move_pages or len(team) != 6:
        raise RuntimeError("Team matching failed")

    return {
        "schema_version": 1,
        "created_at": datetime.now(
            timezone.utc
        ).isoformat(),
        "generation": 4,
        "format": "singles_6_to_3",
        "ready_for_ai": False,
        "pokemon": team
    }


if __name__ == "__main__":
    result = build_team()

    temporary = OUTPUT.with_suffix(".tmp")

    temporary.write_text(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    temporary.replace(OUTPUT)

    for pokemon in result["pokemon"]:
        print(
            f"\n{pokemon['slot']}: "
            f"{pokemon['species']}"
        )

        print("Ability:", pokemon["ability"])
        print("Item:", pokemon["item"])
        print("HP:", pokemon["max_hp"])
        print("Stats:", pokemon["stats"])

        print("Moves:", [
            m["move"] for m in pokemon["moves"]
        ])

        print("Issues:", pokemon["issues"])

    print("\nPokemon:", len(result["pokemon"]))
    print("Ready for AI:", result["ready_for_ai"])
    print("Saved:", OUTPUT.resolve())
    print("STEP 232: TEAM DATA GENERATED")
