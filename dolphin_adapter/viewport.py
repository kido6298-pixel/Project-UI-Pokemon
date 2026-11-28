from pathlib import Path
from PIL import Image

REFERENCE_SIZE = (1920, 1009)
REFERENCE_BOX = (328, 0, 1591, 1009)
OUTPUT_SIZE = (1000, 800)


def crop_game(image):
    if image.size != REFERENCE_SIZE:
        raise RuntimeError(
            f"Uncalibrated capture size: {image.size}"
        )

    return image.crop(REFERENCE_BOX).convert("RGB")


def normalize_game(image):
    return crop_game(image).resize(
        OUTPUT_SIZE,
        Image.Resampling.LANCZOS
    )


if __name__ == "__main__":
    source = Path("data/dolphin/window_capture.png")
    output = Path("data/dolphin/game_capture.png")

    with Image.open(source) as image:
        cropped = crop_game(image)
        normalized = normalize_game(image)

        print("Original:", image.size)
        print("Cropped:", cropped.size)
        print("Normalized:", normalized.size)

        normalized.save(output)

    print("STEP 194: CROP COMPLETE")
