from pathlib import Path
from PIL import Image

ROOT = Path("data/dolphin")
OUTPUT = ROOT / "team_move_templates"

folders = [
    p for p in (ROOT / "team_scan").iterdir()
    if p.is_dir()
    and all(
        (p / f"moves_{i:02d}.png").exists()
        for i in range(1, 7)
    )
]

if not folders:
    raise RuntimeError("Move scan folder not found")

folder = max(
    folders,
    key=lambda p: p.stat().st_mtime
)

BOXES = [
    (92, 244, 490, 275),
    (550, 244, 950, 275),
    (92, 421, 490, 451),
    (550, 421, 950, 451)
]

LABELS = [
    ("Bronzong", [
        "Gyro Ball",
        "Earthquake",
        "Hypnosis",
        "Explosion"
    ]),
    ("Tyranitar", [
        "Stone Edge",
        "Crunch",
        "Sleep Talk",
        "Fire Punch"
    ]),
    ("Garchomp", [
        "Rock Tomb",
        "Earthquake",
        "Outrage",
        "Swords Dance"
    ]),
    ("Suicune", [
        "Surf",
        "Ice Beam",
        "Hidden Power",
        "Calm Mind"
    ]),
    ("Zapdos", [
        "Thunderbolt",
        "Hidden Power",
        "Heat Wave",
        "Thunder Wave"
    ]),
    ("Infernape", [
        "Hidden Power",
        "Fire Blast",
        "Close Combat",
        "Thunder Punch"
    ])
]

OUTPUT.mkdir(parents=True, exist_ok=True)

count = 0
unique = set()

print("Source:", folder.resolve())

for index, (species, moves) in enumerate(LABELS, 1):
    with Image.open(
        folder / f"moves_{index:02d}.png"
    ) as image:

        assert image.size == (1000, 800)

        for slot, (box, move) in enumerate(
            zip(BOXES, moves), 1
        ):
            filename = f"{move}_{species}_{slot}.png"
            image.crop(box).save(OUTPUT / filename)

            count += 1
            unique.add(move)

            print(species, slot, move)

assert count == 24
assert len(unique) == 21

print("Templates:", count)
print("Unique moves:", len(unique))
print("STEP 227: ALL TESTS PASS")
