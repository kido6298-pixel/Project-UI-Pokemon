import sys
import time
from pathlib import Path
from datetime import datetime

from dolphin_adapter.capture import DolphinCapture
from dolphin_adapter.viewport import normalize_game


def main():
    pid = int(sys.argv[1])
    capture = DolphinCapture(pid)

    directory = Path("data/dolphin/screens")
    directory.mkdir(parents=True, exist_ok=True)

    print("Select Dolphin within 5 seconds", flush=True)
    time.sleep(5)

    image = normalize_game(capture.capture())

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = directory / f"{stamp}.png"

    image.save(path)

    print("Saved:", path.resolve())
    print("STEP 197: CAPTURE COMPLETE")


if __name__ == "__main__":
    main()
