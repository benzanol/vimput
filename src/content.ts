type Mode = "insert" | "normal" | "visual";

// ==================== Helpers ====================

let mode: Mode = "insert";
function changeMode(newMode: Mode) {
    mode = newMode;
    console.log("Changed Mode:", mode);
}

// Cancel the original key event
function preventEvent(e: KeyboardEvent): void {
    e.preventDefault();
    e.stopPropagation();
}

// Make a list of a certain length
function repeat<T>(length: number, elem: T): T[] {
    return Array.from({ length }, () => elem);
}

// ==================== Key presses ====================

// A simple way to do actions on key bindings
type KeyBinding = {
    keys?: KeyCombo[];
    mode?: Mode;
};

// Send to the backend to perform key press actions. Store globally
// that the key is being pressed so that the event listener can ignore
// it.
let pressingKey: KeyCombo | undefined = undefined;
async function pressKey(key: KeyCombo): Promise<void> {
    return new Promise((resolve) => {
        pressingKey = key;
        chrome.runtime.sendMessage(null, { type: "pressKey", key }, () => {
            pressingKey = undefined;
            resolve();
        });
    });
}

// Detect all key presses
let lastKey: string | undefined = undefined;
window.addEventListener("keydown", async (event) => {
    let key = event.key;
    if (event.shiftKey) key = "S-" + key;
    if (event.ctrlKey) key = "C-" + key;
    if (event.altKey) key = "A-" + key;

    if (pressingKey && pressingKey === key) {
        // This is an event triggered by the extension simulating a
        // key (well probably, it technically could be a coincidence)
        console.log("Extension Pressed:", key);
        return;
    } else if (pressingKey) {
        // The user pressed a key while the extension was in the
        // process of performing a keybind. In this case, block the
        // user's key press.
        preventEvent(event);
        console.log("Blocked Overlapping Event:", key);
        return;
    }

    const modeBindings = bindings[mode];
    const keyBinding = modeBindings[key];
    if (keyBinding) {
        preventEvent(event);

        // Press keys specified by the binding
        for (const combo of keyBinding.keys ?? []) {
            await pressKey(combo);
        }

        // Change mode if specified by the binding
        if (keyBinding.mode) changeMode(keyBinding.mode);
    }

    lastKey = key;
});

// ==================== Insert ====================

const bindings: Record<Mode, Record<string, KeyBinding>> = {
    insert: {
        "C-q": { keys: ["ArrowLeft"], mode: "normal" },
    },
    normal: {
        h: { keys: ["ArrowLeft"] },
        l: { keys: ["ArrowRight"] },
        j: { keys: ["ArrowDown"] },
        k: { keys: ["ArrowUp"] },

        "S-H": { keys: repeat(4, "ArrowLeft") },
        "S-L": { keys: repeat(4, "ArrowRight") },
        "S-J": { keys: repeat(4, "ArrowDown") },
        "S-K": { keys: repeat(4, "ArrowUp") },

        b: { keys: ["C-ArrowLeft"] },
        e: { keys: ["C-ArrowRight"] },

        z: { keys: ["Backspace"] },
        x: { keys: ["Delete"] },
        Z: { keys: ["C-Backspace"] },
        X: { keys: ["C-Delete"] },

        i: { mode: "insert" },
        a: { keys: ["ArrowRight"], mode: "insert" },

        v: { mode: "visual" },
        p: { keys: ["C-v"] },
        u: { keys: ["C-z"] },
        U: { keys: ["C-S-z"] },
    },
    visual: {
        h: { keys: ["S-ArrowLeft"] },
        l: { keys: ["S-ArrowRight"] },
        j: { keys: ["S-ArrowDown"] },
        k: { keys: ["S-ArrowUp"] },

        "S-H": { keys: repeat(4, "S-ArrowLeft") },
        "S-L": { keys: repeat(4, "S-ArrowRight") },
        "S-J": { keys: repeat(4, "S-ArrowDown") },
        "S-K": { keys: repeat(4, "S-ArrowUp") },

        b: { keys: ["C-S-ArrowLeft"] },
        e: { keys: ["C-S-ArrowRight"] },

        d: { keys: ["Backspace"], mode: "normal" },
        c: { keys: ["Backspace"], mode: "insert" },
        s: { keys: ["C-x"], mode: "normal" },
        y: { keys: ["C-c"] },
        q: { keys: ["ArrowRight"], mode: "normal" },
        i: { keys: ["ArrowLeft"], mode: "insert" },
        a: { keys: ["ArrowRight"], mode: "insert" },
    },
};
