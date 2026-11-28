import ctypes
import time

from ctypes import wintypes

user32 = ctypes.WinDLL("user32", use_last_error=True)

user32.GetForegroundWindow.restype = wintypes.HWND
user32.GetWindowThreadProcessId.argtypes = [
    wintypes.HWND,
    ctypes.POINTER(wintypes.DWORD)
]

user32.keybd_event.argtypes = [
    ctypes.c_ubyte,
    ctypes.c_ubyte,
    wintypes.DWORD,
    ctypes.c_size_t
]

KEYS = {
    "A": 0x55,
    "B": 0x4F,
    "UP": 0x49,
    "DOWN": 0x4B,
    "LEFT": 0x4A,
    "RIGHT": 0x4C,
    "ONE": 0x4E,
    "TWO": 0x4D,
}


class DolphinController:

    def __init__(self, pid):
        self.pid = int(pid)
        self.enabled = False
        self.pressed = set()

    def foreground_ok(self):
        pid = wintypes.DWORD()
        hwnd = user32.GetForegroundWindow()
        user32.GetWindowThreadProcessId(
            hwnd, ctypes.byref(pid)
        )
        return pid.value == self.pid

    def enable(self):
        self.enabled = True

    def disable(self):
        self.enabled = False
        self.release_all()

    def press(self, button, duration=0.2):
        if not self.enabled:
            raise RuntimeError("Controller disabled")

        if button not in KEYS:
            raise ValueError("Unknown button")

        if not 0.05 <= duration <= 1.0:
            raise ValueError("Invalid duration")

        if not self.foreground_ok():
            raise RuntimeError("Dolphin is not foreground")

        vk = KEYS[button]
        scan = user32.MapVirtualKeyW(vk, 0)

        self.pressed.add(vk)

        try:
            user32.keybd_event(vk, scan, 0, 0)
            time.sleep(duration)
        finally:
            user32.keybd_event(vk, scan, 2, 0)
            self.pressed.discard(vk)

    def release_all(self):
        for vk in list(self.pressed):
            scan = user32.MapVirtualKeyW(vk, 0)
            user32.keybd_event(vk, scan, 2, 0)

        self.pressed.clear()
