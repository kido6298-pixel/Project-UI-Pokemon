from dolphin_adapter.battle_recognition import recognize_battle_screen

OPTIONS = {
    "fight": (224, 410, 238, 510),
    "pokemon": (224, 585, 238, 685),
    "surrender": (507, 585, 521, 685),
}


def recognize_command(image):
    screen = recognize_battle_screen(image)

    if screen["screen"] != "battle_command":
        return {"selected": None, "scores": {}}

    scores = {}

    for name, box in OPTIONS.items():
        region = image.crop(box).convert("RGB")

        count = sum(
            1 for r, g, b in region.getdata()
            if r >= 120
            and r > g * 1.35
            and g > b * 1.5
            and b < 80
        )

        scores[name] = count / (
            region.width * region.height
        )

    ranked = sorted(
        scores, key=scores.get, reverse=True
    )

    best = ranked[0]

    if (
        scores[best] < 0.20
        or scores[best] - scores[ranked[1]] < 0.10
    ):
        best = None

    return {"selected": best, "scores": scores}
