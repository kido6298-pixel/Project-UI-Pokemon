from pathlib import Path
import re
from PIL import Image

from dolphin_adapter.team_stats_recognition import (
    normalize, extract_digits, recognize_digit
)

TEMPLATES = Path("data/dolphin/team_pp_templates")


def load_pp_templates(exclude_index=None):
    result = {}

    for path in TEMPLATES.glob("*.png"):
        label, index, slot, position = path.stem.split("_")

        if exclude_index is not None:
            if int(index) == exclude_index:
                continue

        label = "/" if label == "slash" else label
        label = "P" if label == "prefix" else label

        with Image.open(path) as image:
            result.setdefault(label, []).append(
                normalize(image)
            )

    return result


def read_pp(image, templates=None):
    if templates is None:
        templates = load_pp_templates()

    results = [
        recognize_digit(digit, templates)
        for digit in extract_digits(image)
    ]

    raw = "".join(char for char, score in results)

    result = {
        "raw": raw,
        "pp": None,
        "max_pp": None,
        "valid": False
    }

    match = re.fullmatch(r"P(\d{1,2})/(\d{1,2})", raw)

    if not match:
        return result

    current, maximum = map(int, match.groups())

    if 0 <= current <= maximum <= 64 and maximum > 0:
        result.update({
            "pp": current,
            "max_pp": maximum,
            "valid": True
        })

    return result
