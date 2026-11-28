from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "data/dolphin/digit_templates"
SIZE = (24, 40)


def normalize_digit(image):
    return image.convert("L").resize(
        SIZE, Image.Resampling.NEAREST
    )


def extract_digits(image):
    image = image.convert("RGB")
    mask = Image.new("L", image.size)

    mask.putdata([
        255 if min(r, g, b) > 170
        and max(r, g, b) - min(r, g, b) < 35
        else 0
        for r, g, b in image.get_flattened_data()
    ])

    active = [
        sum(
            mask.getpixel((x, y)) > 0
            for y in range(mask.height)
        ) > 8
        for x in range(mask.width)
    ]

    regions = []
    start = None

    for x, value in enumerate(active + [False]):
        if value and start is None:
            start = x

        elif not value and start is not None:
            region = mask.crop(
                (start, 0, x, mask.height)
            )
            bounds = region.getbbox()

            if bounds:
                regions.append(region.crop(bounds))

            start = None

    return regions


def load_templates():
    templates = {}

    for path in TEMPLATES.glob("*.png"):
        char = path.stem.split("_")[0]

        if char == "slash":
            char = "/"

        with Image.open(path) as image:
            templates.setdefault(char, []).append(
                normalize_digit(image)
            )

    return templates


def recognize_digit(image, templates):
    current = normalize_digit(image)
    scores = {}

    for char, variants in templates.items():
        scores[char] = max(
            1 - ImageChops.difference(
                current, template
            ).histogram()[255] / (SIZE[0] * SIZE[1])
            for template in variants
        )

    ranked = sorted(
        scores, key=scores.get, reverse=True
    )

    best = ranked[0]

    if (
        scores[best] < 0.90
        or scores[best] - scores[ranked[1]] < 0.05
    ):
        return "?", scores[best]

    return best, scores[best]


def read_own_hp(image):
    if image.size != (1000, 800):
        raise ValueError("Invalid image size")

    region = image.crop((175, 114, 320, 147))
    region = region.resize(
        (580, 132), Image.Resampling.NEAREST
    )

    templates = load_templates()

    recognized = [
        recognize_digit(digit, templates)
        for digit in extract_digits(region)
    ]

    text = "".join(char for char, _ in recognized)

    result = {
        "text": text,
        "current_hp": None,
        "max_hp": None,
        "valid": False,
        "complete_alphabet": all(
            str(n) in templates for n in range(10)
        ),
        "scores": [
            round(score, 4)
            for _, score in recognized
        ]
    }

    parts = text.split("/")

    if len(parts) != 2:
        return result

    if not all(part.isdigit() for part in parts):
        return result

    current, maximum = map(int, parts)

    if not 0 <= current <= maximum <= 362:
        return result

    if maximum == 0:
        return result

    result.update({
        "current_hp": current,
        "max_hp": maximum,
        "valid": True
    })

    return result


if __name__ == "__main__":
    samples = {
        "20261128_153529.png": (174, 174),
        "20261128_153827.png": (174, 174),
        "20261128_154746.png": (1, 184)
    }

    for filename, expected in samples.items():
        with Image.open(
            ROOT / "data/dolphin/screens" / filename
        ) as image:
            result = read_own_hp(image)

        print(filename, result)

        assert result["valid"]
        assert (
            result["current_hp"],
            result["max_hp"]
        ) == expected

    print("STEP 210-D: ALL TESTS PASS")
