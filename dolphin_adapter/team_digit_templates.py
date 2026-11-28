from pathlib import Path
from PIL import Image

ROOT = Path("data/dolphin")
OUTPUT = ROOT / "team_digit_templates"
OUTPUT.mkdir(parents=True, exist_ok=True)

folders = sorted(
    (ROOT / "team_scan").glob("*_stats"),
    key=lambda p: p.stat().st_mtime,
    reverse=True
)

if not folders:
    raise RuntimeError("Stats scan folder not found")

source = folders[0]

VALUES = [
    ["151/151", "140", "91", "145", "81", "170"],
    ["174/174", "155", "136", "99", "137", "34"],
    ["226/226", "213", "143", "113", "142", "89"],
    ["184/184", "200", "115", "90", "105", "154"],
    ["207/207", "81", "136", "155", "135", "106"],
    ["197/197", "95", "105", "145", "128", "148"]
]

BOXES = [
    (670, 225, 810, 265),
    (745, 319, 810, 356),
    (745, 361, 810, 398),
    (745, 403, 810, 440),
    (745, 445, 810, 482),
    (745, 487, 810, 524)
]


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


counts = {}
pending = []

for index, values in enumerate(VALUES, 1):
    path = source / f"stats_{index:02d}.png"

    with Image.open(path) as image:
        for row, (box, expected) in enumerate(
            zip(BOXES, values)
        ):
            digits = extract_digits(image.crop(box))

            if len(digits) != len(expected):
                raise RuntimeError(
                    f"{path.name} row={row}: "
                    f"expected={expected}, "
                    f"segments={len(digits)}"
                )

            for position, (char, digit) in enumerate(
                zip(expected, digits)
            ):
                label = "slash" if char == "/" else char
                filename = (
                    f"{label}_{index}_{row}_{position}.png"
                )

                pending.append((filename, digit))
                counts[label] = counts.get(label, 0) + 1

            print(path.name, row, expected, "OK")

assert all(str(i) in counts for i in range(10))
assert "slash" in counts

for filename, digit in pending:
    digit.save(OUTPUT / filename)

print("Template counts:", counts)
print("Total templates:", len(pending))
print("STEP 222: ALL TESTS PASS")
