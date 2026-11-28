from pathlib import Path
from PIL import Image

from dolphin_adapter.team_stats_recognition import (
    extract_digits
)

from dolphin_adapter.team_move_recognition import (
    PP_BOXES
)

ROOT = Path("data/dolphin")
OUTPUT = ROOT / "team_pp_templates"

folder = max(
    [
        p for p in (ROOT / "team_scan").iterdir()
        if p.is_dir() and all(
            (p / f"moves_{i:02d}.png").exists()
            for i in range(1, 7)
        )
    ],
    key=lambda p: p.stat().st_mtime
)

EXPECTED = [
    [8, 16, 32, 5],
    [8, 24, 16, 24],
    [10, 10, 15, 30],
    [24, 16, 24, 32],
    [24, 24, 16, 32],
    [24, 8, 8, 24]
]

pending = []
passed = 0
rejected = 0

for index, values in enumerate(EXPECTED, 1):
    with Image.open(
        folder / f"moves_{index:02d}.png"
    ) as image:

        for slot, (box, pp) in enumerate(
            zip(PP_BOXES, values), 1
        ):
            digits = extract_digits(image.crop(box))
            expected = f"{pp}/{pp}"

            if len(digits) != len(expected) + 1:
                print(
                    f"REJECTED: Pokemon {index} "
                    f"slot {slot} "
                    f"segments={len(digits)}"
                )
                rejected += 1
                continue

            labels = ["prefix"] + list(expected)

            for position, (label, digit) in enumerate(
                zip(labels, digits)
            ):
                if label == "/":
                    label = "slash"

                filename = (
                    f"{label}_{index}_{slot}_{position}.png"
                )

                pending.append((filename, digit))

            passed += 1
            print(
                f"PASS: Pokemon {index} "
                f"slot {slot} {expected}"
            )

OUTPUT.mkdir(parents=True, exist_ok=True)

for filename, digit in pending:
    digit.save(OUTPUT / filename)

print("\n=== SUMMARY ===")
print(f"Segmentation: {passed}/24")
print("Rejected:", rejected)
print("Templates:", len(pending))
print("Labels:", sorted({
    name.split("_")[0]
    for name, _ in pending
}))
print("STEP 229: TEMPLATE GENERATION COMPLETE")
