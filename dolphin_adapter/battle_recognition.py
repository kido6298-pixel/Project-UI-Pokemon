from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
SCREENS = ROOT / "data/dolphin/screens"
TEMPLATES = ROOT / "data/dolphin/templates"

DEFINITIONS = {
    "battle_command": (
        "20261128_153827.png",
        (400, 420, 600, 490)
    ),
    "battle_move": (
        "20261128_153529.png",
        (555, 475, 765, 520)
    ),
    "battle_switch": (
        "20261128_153922.png",
        (240, 80, 760, 130)
    ),
}


def text_mask(image, box):
    return image.crop(box).convert("L").point(
        lambda p: 255 if p >= 180 else 0
    )


def similarity(a, b):
    overlap = ImageChops.multiply(a, b)
    common = overlap.histogram()[255]
    total = a.histogram()[255] + b.histogram()[255]

    return 2 * common / total if total else 0.0


def build_templates():
    TEMPLATES.mkdir(parents=True, exist_ok=True)

    for name, (filename, box) in DEFINITIONS.items():
        with Image.open(SCREENS / filename) as image:
            text_mask(image, box).save(
                TEMPLATES / f"{name}.png"
            )


def recognize_battle_screen(image):
    if image.size != (1000, 800):
        raise ValueError("Invalid image size")

    scores = {}

    for name, (_, box) in DEFINITIONS.items():
        current = text_mask(image, box)

        with Image.open(
            TEMPLATES / f"{name}.png"
        ) as template:
            scores[name] = similarity(
                current, template.convert("L")
            )

    ranked = sorted(
        scores, key=scores.get, reverse=True
    )

    best = ranked[0]

    if (
        scores[best] < 0.80
        or scores[best] - scores[ranked[1]] < 0.15
    ):
        best = "unknown"

    return {
        "screen": best,
        "scores": scores
    }


if __name__ == "__main__":
    build_templates()

    for name, (filename, _) in DEFINITIONS.items():
        with Image.open(SCREENS / filename) as image:
            result = recognize_battle_screen(image)
            print(name, result)
            assert result["screen"] == name

    blank = Image.new("RGB", (1000, 800))
    assert recognize_battle_screen(blank)["screen"] == "unknown"

    print("Template tests: PASS")
