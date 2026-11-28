from pathlib import Path
from PIL import Image

from dolphin_adapter.team_identity_recognition import (
    prepare, similarity
)

from dolphin_adapter.team_pp_recognition import (
    load_pp_templates as load_digit_templates,
    read_pp
)

ROOT = Path("data/dolphin")
TEMPLATES = ROOT / "team_move_templates"

MOVE_BOXES = [
    (92, 244, 490, 275),
    (550, 244, 950, 275),
    (92, 421, 490, 451),
    (550, 421, 950, 451)
]

PP_BOXES = [
    (320, 306, 443, 333),
    (780, 306, 900, 333),
    (320, 483, 443, 510),
    (780, 483, 900, 510)
]


def load_move_templates(exclude_species=None):
    result = {}

    for path in TEMPLATES.glob("*.png"):
        move, species, slot = path.stem.rsplit("_", 2)

        if species == exclude_species:
            continue

        with Image.open(path) as image:
            template = prepare(image, "move")

        if template is not None:
            result.setdefault(move, []).append(template)

    return result


def recognize_move(image, templates):
    sample = prepare(image, "move")

    scores = sorted(
        [
            (move, max(
                similarity(sample, t, "move")
                for t in variants
            ))
            for move, variants in templates.items()
        ],
        key=lambda x: x[1],
        reverse=True
    )

    if len(scores) < 2:
        return None, 0.0, 0.0

    move, score = scores[0]
    margin = score - scores[1][1]

    if score < 0.90 or margin < 0.05:
        move = None

    return move, round(score, 4), round(margin, 4)


def read_moves(image, templates=None, digits=None):
    if image.size != (1000, 800):
        raise ValueError("Invalid image size")

    if templates is None:
        templates = load_move_templates()

    if digits is None:
        digits = load_digit_templates()

    results = []

    for slot, (move_box, pp_box) in enumerate(
        zip(MOVE_BOXES, PP_BOXES), 1
    ):
        move, score, margin = recognize_move(
            image.crop(move_box), templates
        )

        pp_result = read_pp(
            image.crop(pp_box), digits
        )

        raw_pp = pp_result["raw"]
        pp = pp_result["pp"]
        max_pp = pp_result["max_pp"]

        results.append({
            "slot": slot,
            "move": move,
            "score": score,
            "margin": margin,
            "pp": pp,
            "max_pp": max_pp,
            "raw_pp": raw_pp,
            "valid": move is not None and pp is not None
        })

    return results


if __name__ == "__main__":
    expected = [
        ("Bronzong", [
            ("Gyro Ball", 8),
            ("Earthquake", 16),
            ("Hypnosis", 32),
            ("Explosion", 5)
        ]),
        ("Tyranitar", [
            ("Stone Edge", 8),
            ("Crunch", 24),
            ("Sleep Talk", 16),
            ("Fire Punch", 24)
        ]),
        ("Garchomp", [
            ("Rock Tomb", 10),
            ("Earthquake", 10),
            ("Outrage", 15),
            ("Swords Dance", 30)
        ]),
        ("Suicune", [
            ("Surf", 24),
            ("Ice Beam", 16),
            ("Hidden Power", 24),
            ("Calm Mind", 32)
        ]),
        ("Zapdos", [
            ("Thunderbolt", 24),
            ("Hidden Power", 24),
            ("Heat Wave", 16),
            ("Thunder Wave", 32)
        ]),
        ("Infernape", [
            ("Hidden Power", 24),
            ("Fire Blast", 8),
            ("Close Combat", 8),
            ("Thunder Punch", 24)
        ])
    ]

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

    templates = load_move_templates()
    digits = load_digit_templates()

    move_pass = 0
    pp_pass = 0
    move_wrong = 0
    pp_wrong = 0
    move_rejected = 0
    pp_rejected = 0

    for index, (species, moves) in enumerate(expected, 1):
        print(f"\n=== {species} ===")

        with Image.open(
            folder / f"moves_{index:02d}.png"
        ) as image:
            results = read_moves(image, templates, digits)

        for result, (move, pp) in zip(results, moves):
            print(result)

            if result["move"] == move:
                move_pass += 1
            elif result["move"] is None:
                move_rejected += 1
            else:
                move_wrong += 1

            if result["pp"] == pp and result["max_pp"] == pp:
                pp_pass += 1
            elif result["pp"] is None:
                pp_rejected += 1
            else:
                pp_wrong += 1

    blank = Image.new("RGB", (1000, 800))

    assert all(
        r["move"] is None and r["pp"] is None
        for r in read_moves(blank, templates, digits)
    )

    print("\n=== SUMMARY ===")
    print(f"Move recognition: {move_pass}/24")
    print(f"PP recognition: {pp_pass}/24")
    print("Move rejected:", move_rejected)
    print("PP rejected:", pp_rejected)
    print("Move wrong:", move_wrong)
    print("PP wrong:", pp_wrong)
    print("Blank image: PASS")
    assert move_pass == 24
    assert pp_pass == 24
    assert move_wrong == 0
    assert pp_wrong == 0

    print("STEP 231: ALL TESTS PASS")
