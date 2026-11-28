from pathlib import Path
from PIL import Image
from dolphin_adapter.battle_recognition import (
    text_mask, similarity
)

ROOT = Path(__file__).resolve().parent.parent
BOX = (175, 450, 365, 495)

TEMPLATE = (
    ROOT / "data/dolphin/templates/switch_confirm.png"
)

SOURCE = (
    ROOT / "data/dolphin/screens/20261128_154302.png"
)

OPTIONS = {
    "switch": (48, 365, 62, 515),
    "stats": (505, 365, 519, 515),
    "moves": (733, 365, 747, 515),
    "previous": (365, 600, 379, 680),
    "next": (505, 600, 519, 680),
}


def recognize_confirmation(image):
    if image.size != (1000, 800):
        raise ValueError("Invalid image size")

    with Image.open(TEMPLATE) as template:
        score = similarity(
            text_mask(image, BOX),
            template.convert("L")
        )

    if score < 0.80:
        return {
            "screen": "unknown",
            "selected": None,
            "similarity": score
        }

    scores = {}

    for name, box in OPTIONS.items():
        region = image.crop(box).convert("RGB")

        count = sum(
            1 for r, g, b in region.getdata()
            if r >= 120
            and r > g * 1.35
            and g > b * 1.5
            and b < 80
        )

        scores[name] = count / (
            region.width * region.height
        )

    ranked = sorted(
        scores, key=scores.get, reverse=True
    )

    best = ranked[0]

    if (
        scores[best] < 0.20
        or scores[best] - scores[ranked[1]] < 0.10
    ):
        best = None

    return {
        "screen": "switch_confirm",
        "selected": best,
        "similarity": score,
        "scores": scores
    }


if __name__ == "__main__":
    TEMPLATE.parent.mkdir(
        parents=True, exist_ok=True
    )

    with Image.open(SOURCE) as image:
        text_mask(image, BOX).save(TEMPLATE)

        result = recognize_confirmation(image)
        print(result)

        assert result["screen"] == "switch_confirm"
        assert result["selected"] == "previous"

    print("Template test: PASS")
