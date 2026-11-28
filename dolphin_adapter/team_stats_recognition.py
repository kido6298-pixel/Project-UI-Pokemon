from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path("data/dolphin")
TEMPLATES = ROOT / "team_digit_templates"
SIZE = (24, 40)

BOXES = {
    "hp": (670, 225, 810, 265),
    "atk": (745, 319, 810, 356),
    "def": (745, 361, 810, 398),
    "spa": (745, 403, 810, 440),
    "spd": (745, 445, 810, 482),
    "spe": (745, 487, 810, 524)
}


def extract_digits(image):
    image = image.convert("RGB")
    mask = Image.new("L", image.size)

    mask.putdata([
        255 if min(r, g, b) > 185
        and max(r, g, b) - min(r, g, b) < 35
        else 0
        for r, g, b in image.get_flattened_data()
    ])

    width, height = mask.size
    pixels = mask.load()

    columns = [
        any(pixels[x, y] for y in range(height))
        for x in range(width)
    ]

    runs = []
    start = None

    for x, occupied in enumerate(columns + [False]):
        if occupied and start is None:
            start = x
        elif not occupied and start is not None:
            part = mask.crop((start, 0, x, height))
            bounds = part.getbbox()

            if bounds:
                runs.append(part.crop(bounds))

            start = None

    return runs


def normalize(image):
    image = image.convert("L")
    bounds = image.getbbox()

    canvas = Image.new("L", SIZE)

    if not bounds:
        return canvas

    image = image.crop(bounds)

    scale = min(
        (SIZE[0] - 6) / image.width,
        (SIZE[1] - 6) / image.height
    )

    width = max(1, round(image.width * scale))
    height = max(1, round(image.height * scale))

    image = image.resize(
        (width, height),
        Image.Resampling.NEAREST
    )

    canvas.paste(image, (
        (SIZE[0] - width) // 2,
        (SIZE[1] - height) // 2
    ))

    return canvas


def glyph_similarity(image, template):
    best = 0.0

    area1 = image.histogram()[255]
    area2 = template.histogram()[255]

    if area1 + area2 == 0:
        return 0.0

    for dx in range(-2, 3):
        for dy in range(-2, 3):
            shifted = ImageChops.offset(
                template, dx, dy
            )

            overlap = ImageChops.multiply(
                image, shifted
            ).histogram()[255]

            score = 2 * overlap / (area1 + area2)
            best = max(best, score)

    return best


def load_templates(exclude_index=None):
    templates = {}

    for path in TEMPLATES.glob("*.png"):
        parts = path.stem.split("_")

        if len(parts) != 4:
            continue

        label, index, row, position = parts

        if exclude_index is not None:
            if int(index) == exclude_index:
                continue

        label = "/" if label == "slash" else label

        with Image.open(path) as image:
            templates.setdefault(label, []).append(
                normalize(image)
            )

    return templates


def recognize_digit(image, templates):
    image = normalize(image)

    scores = {
        label: max(
            glyph_similarity(image, template)
            for template in variants
        )
        for label, variants in templates.items()
    }

    ranked = sorted(
        scores.items(),
        key=lambda item: item[1],
        reverse=True
    )

    if len(ranked) < 2:
        return "?", 0

    label, score = ranked[0]
    margin = score - ranked[1][1]

    if score < 0.90 or margin < 0.05:
        return "?", score

    return label, score


def read_number(image, box, templates):
    results = [
        recognize_digit(digit, templates)
        for digit in extract_digits(image.crop(box))
    ]

    return "".join(char for char, score in results)


def read_stats(image, templates=None):
    if image.size != (1000, 800):
        raise ValueError("Invalid image size")

    if templates is None:
        templates = load_templates()

    raw = {
        key: read_number(image, box, templates)
        for key, box in BOXES.items()
    }

    result = {
        "valid": False,
        "raw": raw,
        "current_hp": None,
        "max_hp": None,
        "stats": {}
    }

    hp = raw["hp"].split("/")

    if len(hp) != 2 or not all(x.isdigit() for x in hp):
        return result

    current, maximum = map(int, hp)

    if not 0 <= current <= maximum <= 714 or maximum == 0:
        return result

    stats = {}

    for key in ("atk", "def", "spa", "spd", "spe"):
        value = raw[key]

        if not value.isdigit():
            return result

        value = int(value)

        if not 1 <= value <= 999:
            return result

        stats[key] = value

    result.update({
        "valid": True,
        "current_hp": current,
        "max_hp": maximum,
        "stats": stats
    })

    return result


if __name__ == "__main__":
    folders = sorted(
        (ROOT / "team_scan").glob("*_stats"),
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )

    expected = [
        [151, 140, 91, 145, 81, 170],
        [174, 155, 136, 99, 137, 34],
        [226, 213, 143, 113, 142, 89],
        [184, 200, 115, 90, 105, 154],
        [207, 81, 136, 155, 135, 106],
        [197, 95, 105, 145, 128, 148]
    ]

    keys = ["atk", "def", "spa", "spd", "spe"]
    passed = 0

    for index, values in enumerate(expected, 1):
        path = folders[0] / f"stats_{index:02d}.png"

        # Exclude templates from the test image.
        templates = load_templates(exclude_index=index)

        with Image.open(path) as image:
            result = read_stats(image, templates)

        actual = [
            result["max_hp"],
            *[result["stats"].get(k) for k in keys]
        ]

        ok = (
            result["valid"]
            and actual == values
            and result["current_hp"] == values[0]
        )

        print(path.name, result)
        print("PASS" if ok else "FAIL")

        passed += int(ok)

    blank = Image.new("RGB", (1000, 800))
    assert not read_stats(blank)["valid"]

    print(f"Recognition: {passed}/6")

    if passed != 6:
        raise RuntimeError("Recognition validation failed")

    print("STEP 223: ALL TESTS PASS")
