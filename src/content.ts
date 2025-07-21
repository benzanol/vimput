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
window.addEventListener("keydown", async (event) => {
    if (pressingKeys) return;

    let key = event.key;
    if (event.shiftKey) key = "S-" + key;
    if (event.ctrlKey) key = "C-" + key;
    if (event.altKey) key = "A-" + key;
    console.log("Handling", mode, key);

    try {
        if (mode === "insert") await handleInsert(key, event);
        else if (mode === "normal") await handleNormal(key, event);
        else if (mode === "visual") await handleVisual(key, event);
    } finally {
        lastKey = key;
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

async function handleInsert(key: string, event: KeyboardEvent): Promise<void> {
    if (lastKey === "j" && key === "k") {
        preventEvent(event);
        await pressKey("Backspace");
        changeMode("normal");
    } else if (key === "C-q") {
        preventEvent(event);
        changeMode("normal");
    }
}

// ==================== Normal ====================

const normalModeBindings: Record<string, KeyBinding> = {
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
};

async function handleNormal(key: string, event: KeyboardEvent): Promise<void> {
    const binding = normalModeBindings[key];
    if (binding) {
        preventEvent(event);
        await handleBinding(binding);
    }
}

// ==================== Visual ====================

const visualModeBindings: Record<string, KeyBinding> = {
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
};

async function handleVisual(key: string, event: KeyboardEvent): Promise<void> {
    const binding = visualModeBindings[key];
    if (binding) {
        preventEvent(event);
        await handleBinding(binding);
    }
}
