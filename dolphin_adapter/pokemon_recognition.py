from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
SCREENS = ROOT / "data/dolphin/screens"
TEMPLATES = ROOT / "data/dolphin/pokemon_names"

BOXES = {
    "own": (54, 85, 235, 113),
    "enemy": (750, 85, 947, 113)
}

SAMPLES = [
    ("20261128_153529.png", "own", "Bronzong"),
    ("20261128_153529.png", "enemy", "Suicune"),
    ("20261128_153827.png", "own", "Bronzong"),
    ("20261128_153827.png", "enemy", "Suicune"),
    ("20261128_154746.png", "own", "Garchomp"),
    ("20261128_154746.png", "enemy", "Bronzong")
]


def name_mask(image, side):
    region = image.crop(BOXES[side]).convert("RGB")
    mask = Image.new("L", region.size)

    mask.putdata([
        255 if r > 150 and g > 130
        and b < 120 and g > b * 1.5
        else 0
        for r, g, b in region.get_flattened_data()
    ])

    bounds = mask.getbbox()

    if bounds is None:
        return None

    return mask.crop(bounds).resize(
        (180, 28), Image.Resampling.NEAREST
    )


def similarity(a, b):
    common = ImageChops.multiply(a, b).histogram()[255]
    total = a.histogram()[255] + b.histogram()[255]
    return 2 * common / total if total else 0


def build_templates():
    TEMPLATES.mkdir(parents=True, exist_ok=True)

    for filename, side, species in SAMPLES:
        with Image.open(SCREENS / filename) as image:
            mask = name_mask(image, side)

        if mask is None:
            raise RuntimeError("Name extraction failed")

        mask.save(
            TEMPLATES /
            f"{side}_{species}_{Path(filename).stem}.png"
        )


def recognize_pokemon(image, side):
    mask = name_mask(image, side)

    if mask is None:
        return {"species": None, "scores": {}}

    scores = {}

    for path in TEMPLATES.glob(f"{side}_*.png"):
        species = path.stem.split("_")[1]

        with Image.open(path) as template:
            score = similarity(
                mask, template.convert("L")
            )

        scores[species] = max(
            scores.get(species, 0), score
        )

    ranked = sorted(
        scores, key=scores.get, reverse=True
    )

    if not ranked:
        return {"species": None, "scores": {}}

    best = ranked[0]
    second = scores[ranked[1]] if len(ranked) > 1 else 0

    if scores[best] < 0.90 or scores[best] - second < 0.10:
        best = None

    return {
        "species": best,
        "scores": scores
    }


if __name__ == "__main__":
    build_templates()

    for filename, side, expected in SAMPLES:
        with Image.open(SCREENS / filename) as image:
            result = recognize_pokemon(image, side)

        print(side, expected, result)
        assert result["species"] == expected

    blank = Image.new("RGB", (1000, 800))

    for side in ("own", "enemy"):
        assert recognize_pokemon(blank, side)["species"] is None

    print("STEP 212: ALL TESTS PASS")
