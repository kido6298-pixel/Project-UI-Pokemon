from pathlib import Path
from PIL import Image

SOURCE = Path("data/dolphin/hp_samples")
OUTPUT = Path("data/dolphin/digit_templates")
OUTPUT.mkdir(parents=True, exist_ok=True)


def extract_digits(image):
    image = image.convert("RGB")
    mask = Image.new("L", image.size)

    mask.putdata([
        255 if min(r, g, b) > 170
        and max(r, g, b) - min(r, g, b) < 35
        else 0
        for r, g, b in image.getdata()
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


samples = {
    "174_174.png": "174/174",
    "174_174_after.png": "174/174",
    "1_184.png": "1/184"
}

for filename, label in samples.items():
    with Image.open(SOURCE / filename) as image:
        digits = extract_digits(image)

    assert len(digits) == len(label), (
        filename, len(digits), len(label)
    )

    for index, (digit, char) in enumerate(
        zip(digits, label)
    ):
        name = "slash" if char == "/" else char

        digit.save(
            OUTPUT / f"{name}_{Path(filename).stem}_{index}.png"
        )

    print(filename, "Segmentation: PASS")

print("STEP 210-C: ALL TESTS PASS")
