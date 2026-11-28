import json
from pathlib import Path
from PIL import Image, ImageChops

SIZE = (1000, 800)
HEADER = (200, 100, 800, 150)

TEMPLATE = Path(
    "data/dolphin/templates/mode_header.png"
)

OPTIONS = {
    "colosseum": (48, 210, 62, 365),
    "ds_battle": (517, 210, 531, 365),
    "settings": (48, 435, 62, 500),
}


def header_mask(image):
    return image.crop(HEADER).convert("L").point(
        lambda p: 255 if p >= 180 else 0
    )


def header_similarity(image):
    with Image.open(TEMPLATE) as template:
        current = header_mask(image)
        diff = ImageChops.difference(
            current, template.convert("L")
        )
        mismatch = diff.histogram()[255]
        return 1 - mismatch / (
            current.width * current.height
        )


def orange_ratio(image, box):
    region = image.crop(box).convert("RGB")
    count = sum(
        1 for r, g, b in region.getdata()
        if r >= 120
        and r > g * 1.35
        and g > b * 1.5
        and b < 80
    )
    return count / (region.width * region.height)


def recognize(image):
    if image.size != SIZE:
        raise ValueError("Invalid normalized size")

    similarity = header_similarity(image)

    if similarity < 0.97:
        return {
            "screen": "unknown",
            "selected": None,
            "similarity": similarity
        }

    scores = {
        name: orange_ratio(image, box)
        for name, box in OPTIONS.items()
    }

    ranked = sorted(
        scores, key=scores.get, reverse=True
    )

    selected = ranked[0]

    if (
        scores[selected] < 0.20
        or scores[selected] - scores[ranked[1]] < 0.10
    ):
        selected = None

    return {
        "screen": "game_mode",
        "selected": selected,
        "similarity": similarity,
        "selection_scores": scores
    }


if __name__ == "__main__":
    with Image.open(
        "data/dolphin/game_capture.png"
    ) as image:

        TEMPLATE.parent.mkdir(
            parents=True, exist_ok=True
        )

        if not TEMPLATE.exists():
            header_mask(image).save(TEMPLATE)

        result = recognize(image)

        print(json.dumps(result, indent=2))

        assert result["screen"] == "game_mode"
        assert result["selected"] == "colosseum"

        blank = Image.new("RGB", SIZE)
        assert recognize(blank)["screen"] == "unknown"

    print("STEP 195: ALL TESTS PASS")
