import ctypes
from ctypes import wintypes
from pathlib import Path

from PIL import ImageGrab

user32 = ctypes.WinDLL("user32", use_last_error=True)

user32.SetProcessDPIAware()

user32.GetForegroundWindow.restype = wintypes.HWND

user32.GetWindowThreadProcessId.argtypes = [
    wintypes.HWND,
    ctypes.POINTER(wintypes.DWORD)
]

user32.GetClientRect.argtypes = [
    wintypes.HWND,
    ctypes.POINTER(wintypes.RECT)
]

user32.ClientToScreen.argtypes = [
    wintypes.HWND,
    ctypes.POINTER(wintypes.POINT)
]


class DolphinCapture:

    def __init__(self, pid):
        self.pid = int(pid)

    def get_window(self):
        hwnd = user32.GetForegroundWindow()
        pid = wintypes.DWORD()

        user32.GetWindowThreadProcessId(
            hwnd, ctypes.byref(pid)
        )

        if pid.value != self.pid:
            raise RuntimeError("Dolphin is not foreground")

        return hwnd

    def get_bounds(self):
        hwnd = self.get_window()
        rect = wintypes.RECT()
        point = wintypes.POINT(0, 0)

        if not user32.GetClientRect(hwnd, ctypes.byref(rect)):
            raise RuntimeError("GetClientRect failed")

        if not user32.ClientToScreen(hwnd, ctypes.byref(point)):
            raise RuntimeError("ClientToScreen failed")

        width = rect.right - rect.left
        height = rect.bottom - rect.top

        if width <= 0 or height <= 0:
            raise RuntimeError("Invalid window size")

        return (
            point.x,
            point.y,
            point.x + width,
            point.y + height
        )

    def capture(self):
        return ImageGrab.grab(
            bbox=self.get_bounds(),
            all_screens=True
        )

    def save(self, filename):
        path = Path(filename)
        path.parent.mkdir(parents=True, exist_ok=True)

        image = self.capture()
        image.save(path)

        return image.size
