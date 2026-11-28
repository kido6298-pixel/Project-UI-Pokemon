SLOTS = {
    1: (226, 410, 238, 510),
    2: (507, 410, 519, 510),
    3: (224, 585, 236, 685),
    4: (507, 585, 519, 685),
}


def recognize_move_selection(image):
    if image.size != (1000, 800):
        raise ValueError("Invalid image size")

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
