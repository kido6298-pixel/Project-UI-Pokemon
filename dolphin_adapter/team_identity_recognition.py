from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageStat

ROOT = Path("data/dolphin")
TEMPLATES = ROOT / "team_identity_templates"

BOXES = {
    "species": (88, 90, 168, 175),
    "nickname": (200, 110, 390, 158),
    "ability": (80, 220, 460, 275),
    "item": (80, 440, 460, 495)
}

EXPECTED = [
    ("Infernape", "ZEAL", "Blaze", "Life Orb"),
    ("Bronzong", "Amalgam", "Levitate", "Quick Claw"),
    ("Tyranitar", "Draupnir", "Sand Stream", "Lum Berry"),
    ("Garchomp", "Garchomp", "Sand Veil", "Focus Sash"),
    ("Suicune", "Monsoon", "Pressure", "Leftovers"),
    ("Zapdos", "Positron", "Pressure", "Sitrus Berry")
]


def prepare(image, category):
    image = image.convert("RGB")

    if category == "species":
        image = image.resize((64, 64))
        mask = Image.new("L", (64, 64))
        ImageDraw.Draw(mask).ellipse(
            (8, 8, 55, 55), fill=255
        )
        result = Image.new("RGB", (64, 64))
        result.paste(image, (0, 0), mask)
        return result

    mask = Image.new("L", image.size)

    mask.putdata([
        255 if min(r, g, b) > 185
        and max(r, g, b) - min(r, g, b) < 35
        else 0
        for r, g, b in image.get_flattened_data()
    ])

    bounds = mask.getbbox()

    if not bounds:
        return None

    return mask.crop(bounds).resize(
        (240, 40), Image.Resampling.NEAREST
    )


def similarity(a, b, category):
    if a is None or b is None:
        return 0.0

    if category == "species":
        difference = ImageChops.difference(a, b)
        return 1 - sum(
            ImageStat.Stat(difference).mean
        ) / (3 * 255)

    area = a.histogram()[255] + b.histogram()[255]

    if not area:
        return 0.0

    overlap = ImageChops.multiply(
        a, b
    ).histogram()[255]

    return 2 * overlap / area


def load_templates():
    result = {}

    for category in BOXES:
        result[category] = {}

        for path in (TEMPLATES / category).glob("*.png"):
            label = path.stem.rsplit("_", 1)[0]

            with Image.open(path) as image:
                template = prepare(image, category)

            result[category].setdefault(
                label, []
            ).append(template)

    return result


def recognize(image, category, templates):
    sample = prepare(
        image.crop(BOXES[category]), category
    )

    scores = {
        label: max(
            similarity(sample, t, category)
            for t in variants
        )
        for label, variants in templates[category].items()
    }

    ranked = sorted(
        scores.items(),
        key=lambda x: x[1],
        reverse=True
    )

    if len(ranked) < 2:
        return {"value": None, "scores": scores}

    best, score = ranked[0]
    margin = score - ranked[1][1]

    valid = score >= 0.90 and margin >= 0.05

    return {
        "value": best if valid else None,
        "score": round(score, 4),
        "margin": round(margin, 4),
        "scores": {
            k: round(v, 4)
            for k, v in ranked
        }
    }


def read_identity(image, templates=None):
    if image.size != (1000, 800):
        raise ValueError("Invalid image size")

    if templates is None:
        templates = load_templates()

    return {
        category: recognize(image, category, templates)
        for category in BOXES
    }


if __name__ == "__main__":
    folder = max(
        (ROOT / "team_scan").glob("*_validation"),
        key=lambda p: p.stat().st_mtime
    )

    templates = load_templates()
    passed = 0
    rejected = 0
    wrong = 0

    for index, labels in enumerate(EXPECTED, 1):
        with Image.open(
            folder / f"stats_{index:02d}.png"
        ) as image:
            result = read_identity(image, templates)

        print(f"\n=== {labels[0]} ===")

        for category, expected in zip(BOXES, labels):
            info = result[category]
            actual = info["value"]

            if actual == expected:
                passed += 1
                status = "PASS"
            elif actual is None:
                rejected += 1
                status = "REJECTED"
            else:
                wrong += 1
                status = "WRONG"

            print(
                category, actual,
                "score:", info.get("score"),
                "margin:", info.get("margin"),
                status
            )

            if status != "PASS":
                print("Expected:", expected)
                print("Scores:", info["scores"])

    blank = Image.new("RGB", (1000, 800))
    result = read_identity(blank, templates)

    assert all(
        info["value"] is None
        for info in result.values()
    )

    print(f"\nRecognition: {passed}/24")
    print("Rejected:", rejected)
    print("Wrong:", wrong)
    print("Blank image: PASS")
    print("STEP 226: VALIDATION COMPLETE")
