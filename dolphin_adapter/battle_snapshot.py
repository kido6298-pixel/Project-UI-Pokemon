import json
from pathlib import Path
from PIL import Image
from dolphin_adapter.battle_state import read_battle_state

ROOT = Path("data/dolphin")

SAMPLES = [
    "20261128_153529.png",
    "20261128_153827.png",
    "20261128_154746.png"
]


def build_snapshot(filename):
    with Image.open(ROOT / "screens" / filename) as image:
        state = read_battle_state(image)

    if state["screen"] not in (
        "battle_command", "battle_move"
    ):
        raise ValueError("Unsupported screen")

    own = state["own"]
    enemy = state["enemy"]

    if not own["species"] or not own["hp_valid"]:
        raise ValueError("Own Pokemon recognition failed")

    if not enemy["species"] or enemy["hp_percent"] is None:
        raise ValueError("Enemy recognition failed")

    return {
        "schema_version": 1,
        "mode": "offline_replay_test",
        "source_image": filename,
        "observation": state,
        "execution_authorized": False,
        "assumptions": [
            "bench_hp_full_for_test",
            "pp_from_initial_team_for_test",
            "status_and_boosts_unknown",
            "weather_and_field_unknown",
            "enemy_hp_approximate",
            "no_battle_history"
        ]
    }


if __name__ == "__main__":
    snapshots = [
        build_snapshot(filename)
        for filename in SAMPLES
    ]

    output = ROOT / "battle_replay_input.json"

    output.write_text(
        json.dumps(snapshots, indent=2),
        encoding="utf-8"
    )

    for snapshot in snapshots:
        state = snapshot["observation"]
        print(snapshot["source_image"])
        print("Own:", state["own"])
        print("Enemy:", state["enemy"])

    print("STEP 240-B1: SNAPSHOTS GENERATED")
