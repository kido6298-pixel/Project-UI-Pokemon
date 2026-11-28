from pathlib import Path
from PIL import Image

ROOT = Path("data/dolphin")
OUTPUT = ROOT / "team_identity_templates"

folder = max(
    (ROOT / "team_scan").glob("*_stats"),
    key=lambda p: p.stat().st_mtime
)

BOXES = {
    "species": (88, 90, 168, 175),
    "nickname": (200, 110, 390, 158),
    "ability": (80, 220, 460, 275),
    "item": (80, 440, 460, 495)
}

LABELS = [
    ("Infernape", "ZEAL", "Blaze", "Life Orb"),
    ("Bronzong", "Amalgam", "Levitate", "Quick Claw"),
    ("Tyranitar", "Draupnir", "Sand Stream", "Lum Berry"),
    ("Garchomp", "Garchomp", "Sand Veil", "Focus Sash"),
    ("Suicune", "Monsoon", "Pressure", "Leftovers"),
    ("Zapdos", "Positron", "Pressure", "Sitrus Berry")
]

count = 0

for index, labels in enumerate(LABELS, 1):
    with Image.open(folder / f"stats_{index:02d}.png") as image:
        assert image.size == (1000, 800)

        for (category, box), label in zip(
            BOXES.items(), labels
        ):
            directory = OUTPUT / category
            directory.mkdir(parents=True, exist_ok=True)

            filename = f"{label}_{index:02d}.png"
            image.crop(box).save(directory / filename)

            count += 1
            print(category, filename)

assert count == 24

print("Templates:", count)
print("STEP 225: ALL TESTS PASS")
