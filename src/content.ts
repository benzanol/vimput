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

// Send to the backend to perform key press actions
let pressingKeys = false;
async function pressKey(key: KeyCombo): Promise<void> {
    return new Promise((resolve) => {
        pressingKeys = true;
        chrome.runtime.sendMessage(null, { type: "pressKey", key }, () => {
            pressingKeys = false;
            resolve();
        });
    });
}

// Detect all key presses
let lastKey: string | undefined = undefined;
window.addEventListener("keydown", (e) => {
    if (pressingKeys) {
        // console.log("Auto pressed:", e.key);
        return;
    }

    if (e.ctrlKey || e.altKey || (e.shiftKey && e.key.length > 1)) return;
    console.log("Handling", mode, e.key);

    try {
        if (mode === "insert") handleInsert(e);
        else if (mode === "normal") handleNormal(e);
        else if (mode === "visual") handleVisual(e);
    } finally {
        lastKey = e.key;
    }
});

// ==================== Binding system ====================

// A simple way to do actions on key bindings
type KeyBinding = {
    keys?: KeyCombo[];
    mode?: Mode;
};

async function handleBinding(binding: KeyBinding): Promise<void> {
    for (const combo of binding.keys ?? []) {
        await pressKey(combo);
    }

    if (binding.mode) changeMode(binding.mode);
}

// ==================== Insert ====================

async function handleInsert(e: KeyboardEvent): Promise<void> {
    if (lastKey === "j" && e.key === "k") {
        preventEvent(e);
        await pressKey("Backspace");
        changeMode("normal");
    }
}

// ==================== Normal ====================

const normalModeBindings: Record<string, KeyBinding> = {
    h: { keys: ["ArrowLeft"] },
    l: { keys: ["ArrowRight"] },
    j: { keys: ["ArrowDown"] },
    k: { keys: ["ArrowUp"] },

    H: { keys: repeat(4, "ArrowLeft") },
    L: { keys: repeat(4, "ArrowRight") },
    J: { keys: repeat(4, "ArrowDown") },
    K: { keys: repeat(4, "ArrowUp") },

    b: { keys: ["C-ArrowLeft"] },
    e: { keys: ["C-ArrowRight"] },

    z: { keys: ["Backspace"] },
    x: { keys: ["Delete"] },
    Z: { keys: ["C-Backspace"] },
    X: { keys: ["C-Delete"] },

    i: { mode: "insert" },
    a: { keys: ["ArrowRight"], mode: "insert" },

    v: { keys: ["S-ArrowRight"], mode: "visual" },
    p: { keys: ["C-v"] },
    u: { keys: ["C-z"] },
    U: { keys: ["C-S-z"] },
};

async function handleNormal(e: KeyboardEvent): Promise<void> {
    const binding = normalModeBindings[e.key];
    if (binding) {
        preventEvent(e);
        handleBinding(binding);
    }
}

// ==================== Visual ====================

const visualModeBindings: Record<string, KeyBinding> = {
    h: { keys: ["S-ArrowLeft"] },
    l: { keys: ["S-ArrowRight"] },
    j: { keys: ["S-ArrowDown"] },
    k: { keys: ["S-ArrowUp"] },

    H: { keys: repeat(4, "S-ArrowLeft") },
    L: { keys: repeat(4, "S-ArrowRight") },
    J: { keys: repeat(4, "S-ArrowDown") },
    K: { keys: repeat(4, "S-ArrowUp") },

    b: { keys: ["C-S-ArrowLeft"] },
    e: { keys: ["C-S-ArrowRight"] },

    d: { keys: ["Backspace"], mode: "normal" },
    c: { keys: ["Backspace"], mode: "insert" },
    s: { keys: ["C-x"], mode: "normal" },
    y: { keys: ["C-c"] },
    q: { keys: ["ArrowRight"], mode: "normal" },
};

async function handleVisual(e: KeyboardEvent): Promise<void> {
    const binding = visualModeBindings[e.key];
    if (binding) {
        preventEvent(e);
        handleBinding(binding);
    }
}
