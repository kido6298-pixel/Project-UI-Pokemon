import time

from dolphin_adapter.viewport import normalize_game
from dolphin_adapter.battle_recognition import recognize_battle_screen


class BattleObserver:

    def __init__(self, capture):
        self.capture = capture

    def observe(self):
        image = normalize_game(self.capture.capture())
        return recognize_battle_screen(image)

    def wait_for_screen(
        self,
        target,
        timeout=120,
        interval=0.5,
        stable_frames=3
    ):
        deadline = time.monotonic() + timeout
        consecutive = 0
        previous = None

        while time.monotonic() < deadline:
            result = self.observe()
            screen = result["screen"]

            if screen != previous:
                print("Screen:", screen, flush=True)
                previous = screen

            if screen == target:
                consecutive += 1

                if consecutive >= stable_frames:
                    return result
            else:
                consecutive = 0

            time.sleep(interval)

        raise TimeoutError(
            f"Screen not detected: {target}"
        )
