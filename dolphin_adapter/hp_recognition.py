from pathlib import Path
from PIL import Image

ENEMY_BAR = (750, 119, 944, 129)
FULL_WIDTH = 227
HIDDEN_WIDTH = 33


def hp_color(r, g, b):
    if g > 140 and g > r * 1.5 and g > b * 1.5:
        return "green"

    if r > 150 and g > 100 and b < 100:
        return "yellow"

    if r > 140 and r > g * 1.7 and r > b * 1.7:
        return "red"

    return None


def read_enemy_hp(image):
    if image.size != (1000, 800):
        raise ValueError("Invalid image size")

    image = image.convert("RGB")
    x1, y1, x2, y2 = ENEMY_BAR

    columns = []

    for x in range(x1, x2):
        colors = [
            hp_color(*image.getpixel((x, y)))
            for y in range(y1, y2)
        ]

        valid = [c for c in colors if c]

        if len(valid) >= 6:
            columns.append(
                (x, max(set(valid), key=valid.count))
            )

    if not columns:
        return {
            "hp_percent": None,
            "hp_range": [0, 15],
            "color": None
        }

    end = max(x for x, _ in columns)

    width = end - x1 + 1 + HIDDEN_WIDTH

    percent = min(
        100.0,
        width / FULL_WIDTH * 100
    )

    colors = [c for _, c in columns]

    return {
        "hp_percent": round(percent, 2),
        "color": max(set(colors), key=colors.count)
    }


if __name__ == "__main__":
    directory = Path("data/dolphin/screens")

    samples = [
        "20261128_153529.png",
        "20261128_153827.png",
        "20261128_154746.png"
    ]

    results = []

    for filename in samples:
        with Image.open(directory / filename) as image:
            result = read_enemy_hp(image)
            results.append(result)
            print(filename, result)

    assert results[0]["hp_percent"] >= 98
    assert 70 <= results[1]["hp_percent"] <= 90
    assert results[2]["hp_percent"] >= 98

    print("STEP 210-A: ALL TESTS PASS")
