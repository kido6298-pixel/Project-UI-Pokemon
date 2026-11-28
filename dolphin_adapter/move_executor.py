import time

from dolphin_adapter.viewport import normalize_game
from dolphin_adapter.move_recognition import recognize_move_selection


class MoveExecutor:

    def __init__(self, capture, controller):
        self.capture = capture
        self.controller = controller

    def observe(self):
        image = normalize_game(self.capture.capture())
        result = recognize_move_selection(image)
        return result["selected_slot"]

    def select(self, target):
        if target not in (1, 2, 3, 4):
            raise ValueError("Invalid move slot")

        for _ in range(4):
            current = self.observe()

            if current is None:
                raise RuntimeError("Selection unknown")

            if current == target:
                return True

            row, col = divmod(current - 1, 2)
            target_row, target_col = divmod(target - 1, 2)

            if row != target_row:
                button = "DOWN" if target_row > row else "UP"
                expected = current + (2 if button == "DOWN" else -2)
            else:
                button = "RIGHT" if target_col > col else "LEFT"
                expected = current + (1 if button == "RIGHT" else -1)

            self.controller.press(button)
            time.sleep(0.8)

            actual = self.observe()

            if actual != expected:
                raise RuntimeError(
                    f"Unexpected selection: {actual}"
                )

        raise RuntimeError("Selection failed")

    def execute(self, target):
        self.select(target)

        if self.observe() != target:
            raise RuntimeError("Final verification failed")

        self.controller.press("A")
        return True
