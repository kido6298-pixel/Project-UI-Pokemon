import json
from pathlib import Path
from PIL import Image

from dolphin_adapter.battle_recognition import recognize_battle_screen
from dolphin_adapter.pokemon_recognition import recognize_pokemon
from dolphin_adapter.hp_recognition import read_enemy_hp
from dolphin_adapter.own_hp_recognition import read_own_hp
from dolphin_adapter.command_recognition import recognize_command
from dolphin_adapter.move_recognition import recognize_move_selection


def read_battle_state(image):
    screen = recognize_battle_screen(image)["screen"]

    result = {
        "schema_version": 1,
        "screen": screen,
        "own": None,
        "enemy": None,
        "selection": None,
        "ready_for_ai": False,
        "limitations": []
    }

    if screen not in ("battle_command", "battle_move"):
        return result

    own = recognize_pokemon(image, "own")
    enemy = recognize_pokemon(image, "enemy")

    own_hp = read_own_hp(image)
    enemy_hp = read_enemy_hp(image)

    result["own"] = {
        "species": own["species"],
        "current_hp": own_hp["current_hp"],
        "max_hp": own_hp["max_hp"],
        "hp_valid": own_hp["valid"]
    }

    result["enemy"] = {
        "species": enemy["species"],
        "hp_percent": enemy_hp["hp_percent"],
        "hp_range": enemy_hp.get("hp_range"),
        "hp_color": enemy_hp["color"]
    }

    if screen == "battle_command":
        result["selection"] = recognize_command(image)["selected"]
    else:
        result["selection"] = recognize_move_selection(image)["selected_slot"]

    if not own_hp["complete_alphabet"]:
        result["limitations"].append("incomplete_hp_alphabet")

    if not own_hp["valid"]:
        result["limitations"].append("own_hp_unknown")

    if own["species"] is None:
        result["limitations"].append("own_species_unknown")

    if enemy["species"] is None:
        result["limitations"].append("enemy_species_unknown")

    if enemy_hp["hp_percent"] is None:
        result["limitations"].append("enemy_hp_uncertain")

    result["limitations"].extend([
        "limited_species_templates",
        "moves_not_registered",
        "status_not_recognized",
        "battle_history_not_available"
    ])

    return result


if __name__ == "__main__":
    samples = {
        "20261128_153529.png": ("Bronzong", "Suicune", 174, 174),
        "20261128_153827.png": ("Bronzong", "Suicune", 174, 174),
        "20261128_154746.png": ("Garchomp", "Bronzong", 1, 184)
    }

    for filename, expected in samples.items():
        with Image.open(
            Path("data/dolphin/screens") / filename
        ) as image:
            result = read_battle_state(image)

        print(json.dumps(result, indent=2))

        actual = (
            result["own"]["species"],
            result["enemy"]["species"],
            result["own"]["current_hp"],
            result["own"]["max_hp"]
        )

        assert actual == expected
        assert result["ready_for_ai"] is False

    blank = Image.new("RGB", (1000, 800))
    assert read_battle_state(blank)["screen"] == "unknown"

    print("STEP 213: ALL TESTS PASS")
