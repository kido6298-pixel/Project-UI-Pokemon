from dolphin_adapter.battle_recognition import recognize_battle_screen

SLOTS = {
    1: (390, 170, 404, 290),
    2: (765, 220, 779, 330),
    3: (390, 355, 404, 470),
}


def recognize_switch_selection(image):
    if recognize_battle_screen(image)["screen"] != "battle_switch":
        return {"selected_slot": None, "scores": {}}

    scores = {}

    for slot, box in SLOTS.items():
        region = image.crop(box).convert("RGB")

        count = sum(
            1 for r, g, b in region.getdata()
            if r >= 120
            and r > g * 1.35
            and g > b * 1.5
            and b < 80
        )

        scores[slot] = count / (
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

    return {
        "selected_slot": best,
        "scores": scores
    }
