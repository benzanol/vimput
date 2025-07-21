// ==================== Commands ====================

type VinputCommandDef = {
    description: string;
    keys?: readonly KeyCombo[];
    mode?: "insert" | "normal" | "visual";
};

const vinputCommands = {
    Normal: {
        description: "Switch to normal mode",
        mode: "normal",
    },
    Visual: {
        description: "Switch to visual mode",
        mode: "visual",
    },
    Insert: {
        description: "Switch to insert mode",
        mode: "insert",
    },

    Left: {
        description: "Move cursor left",
        keys: ["ArrowLeft"],
    },
    Right: {
        description: "Move cursor right",
        keys: ["ArrowRight"],
    },
    Down: {
        description: "Move cursor down",
        keys: ["ArrowDown"],
    },
    Up: {
        description: "Move cursor up",
        keys: ["ArrowUp"],
    },
    BackwardWord: {
        description: "Move cursor to the previous word",
        keys: ["C-ArrowLeft"],
    },
    ForwardWord: {
        description: "Move cursor to the next word",
        keys: ["C-ArrowRight"],
    },
    LineStart: {
        description: "Move cursor to the start of the line",
        keys: ["Home"],
    },
    LineEnd: {
        description: "Move cursor to the end of the line",
        keys: ["End"],
    },

    Backspace: {
        description: "Delete character before the cursor",
        keys: ["Backspace"],
    },
    Delete: {
        description: "Delete character after the cursor",
        keys: ["Delete"],
    },
    BackspaceWord: {
        description: "Delete previous word",
        keys: ["C-Backspace"],
    },
    DeleteWord: {
        description: "Delete next word",
        keys: ["C-Delete"],
    },

    VisualLeft: {
        description: "Expand selection left",
        keys: ["S-ArrowLeft"],
    },
    VisualRight: {
        description: "Expand selection right",
        keys: ["S-ArrowRight"],
    },
    VisualDown: {
        description: "Expand selection down",
        keys: ["S-ArrowDown"],
    },
    VisualUp: {
        description: "Expand selection up",
        keys: ["S-ArrowUp"],
    },
    VisualBackwardWord: {
        description: "Expand selection to previous word",
        keys: ["C-S-ArrowLeft"],
    },
    VisualForwardWord: {
        description: "Expand selection to next word",
        keys: ["C-S-ArrowRight"],
    },
    VisualLineStart: {
        description: "Expand selection to the start of the line",
        keys: ["S-Home"],
    },
    VisualLineEnd: {
        description: "Expand selection to the end of the line",
        keys: ["S-End"],
    },

    Cut: {
        description: "Cut selection",
        keys: ["C-x"],
    },
    Copy: {
        description: "Copy selection",
        keys: ["C-c"],
    },
    Paste: {
        description: "Paste from clipboard",
        keys: ["C-v"],
    },
    Undo: {
        description: "Undo last action",
        keys: ["C-z"],
    },
    Redo: {
        description: "Redo last undone action",
        keys: ["C-S-z"],
    },
} as const;

type VinputCommand = keyof typeof vinputCommands;

async function performCommands(commands: VinputCommand[]): Promise<void> {
    for (const command of commands) {
        const commandDef: VinputCommandDef = vinputCommands[command];

        // Press the keys associated with the command
        for (const keyCombo of commandDef.keys ?? []) {
            await pressKey(keyCombo);
            // Add a tiny bit of delay to ensure that every key gets run
            await new Promise((resolve) => setTimeout(resolve, 1));
        }

        // Switch the mode associated with the command
        if (commandDef.mode) changeMode({ type: commandDef.mode });
    }
}

// ==================== Default Config ====================

// An action can either be a 'command', which executes normally, or an
// 'operator', which first waits for a motion, and then executes.
type VinputAction = { type: "command" | "operator"; commands: VinputCommand[] };
const defCommand = (commands: VinputCommand[]): VinputAction => ({ type: "command", commands });
const defOperator = (commands: VinputCommand[]): VinputAction => ({ type: "operator", commands });

// A mapping from keybindings to lists of commands
type VinputConfigKeymap = Record<string, VinputAction>;
type VinputConfig = {
    insert: VinputConfigKeymap;
    normal: VinputConfigKeymap;
    visual: VinputConfigKeymap;
    motion: VinputConfigKeymap;
};

const defaultVinputConfig: VinputConfig = {
    insert: {
        "C-q": defCommand(["Normal"]),
    },
    normal: {
        i: defCommand(["Insert"]),
        a: defCommand(["Right", "Insert"]),
        "S-I": defCommand(["BackwardWord", "Insert"]),
        "S-A": defCommand(["ForwardWord", "Insert"]),
        v: defCommand(["Visual"]),

        h: defCommand(["Left"]),
        j: defCommand(["Down"]),
        k: defCommand(["Up"]),
        l: defCommand(["Right"]),
        b: defCommand(["BackwardWord"]),
        w: defCommand(["ForwardWord"]),
        e: defCommand(["ForwardWord"]),
        "S-^": defCommand(["LineStart"]),
        "S-$": defCommand(["LineEnd"]),

        x: defCommand(["Delete"]),
        "S-X": defCommand(["DeleteWord"]),
        z: defCommand(["Backspace"]),
        "S-Z": defCommand(["BackspaceWord"]),

        u: defCommand(["Undo"]),
        "S-U": defCommand(["Redo"]),

        p: defCommand(["Paste"]),

        d: defOperator(["Cut"]),
        c: defOperator(["Cut", "Insert"]),
        y: defOperator(["Copy", "Right"]),
    },
    visual: {
        q: defCommand(["Normal", "Right"]),

        h: defCommand(["VisualLeft"]),
        j: defCommand(["VisualDown"]),
        k: defCommand(["VisualUp"]),
        l: defCommand(["VisualRight"]),
        b: defCommand(["VisualBackwardWord"]),
        w: defCommand(["VisualForwardWord"]),
        e: defCommand(["VisualForwardWord"]),
        "S-^": defCommand(["VisualLineStart"]),
        "S-$": defCommand(["VisualLineEnd"]),

        i: defCommand(["Left", "Insert"]),
        a: defCommand(["Right", "Insert"]),

        c: defCommand(["Cut", "Insert"]),
        d: defCommand(["Cut", "Normal"]),
        y: defCommand(["Copy"]),
    },
    motion: {
        h: defCommand(["VisualLeft"]),
        j: defCommand(["VisualDown"]),
        k: defCommand(["VisualUp"]),
        l: defCommand(["VisualRight"]),
        b: defCommand(["VisualBackwardWord"]),
        w: defCommand(["VisualForwardWord"]),
        e: defCommand(["VisualForwardWord"]),
        "S-^": defCommand(["VisualLineStart"]),
        "S-$": defCommand(["VisualLineEnd"]),

        d: defCommand(["LineStart", "VisualLineEnd"]),
        c: defCommand(["LineStart", "VisualLineEnd"]),
        y: defCommand(["LineStart", "VisualLineEnd"]),

        "S-W": defCommand(["BackwardWord", "VisualForwardWord"]),
    },
};

// ==================== Mode ====================

// For the motion mode, we need to know which operator to run once the
// user provides a motion, and also which mode to return to after the
// operator is performed.
type Mode =
    | { type: "insert" | "normal" | "visual"; repeat?: number }
    | {
          type: "motion";
          repeat?: number;
          operator: VinputCommand[];
          previous: "insert" | "normal" | "visual";
      };

// Initially change the mode in order to set the extension icon
let mode: Mode = { type: "normal" };
changeMode({ type: "insert" });

function changeMode(newMode: Mode) {
    if (newMode.type !== mode.type) {
        chrome.runtime.sendMessage(null, { type: "changeMode", mode: newMode });
    }

    mode = newMode;
}

// ==================== Handling Key Presses ====================

// Cancel the original key event
function preventEvent(e: KeyboardEvent): void {
    e.preventDefault();
    e.stopPropagation();
}

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
let handlingKeydown = false;
window.addEventListener("keydown", async (event) => {
    handlingKeydown = true;
    try {
        await handleKeydown(event);
    } finally {
        // By waiting before setting to false the keydown, the
        // selection change listener runs before it is set to false,
        // meaning that if a command makes the visual selection have
        // length 0, visual mode will not be immediately disabled
        setTimeout(() => (handlingKeydown = false), 1);
    }
});

async function handleKeydown(event: KeyboardEvent): Promise<void> {
    let key = event.key;
    if (event.shiftKey) key = "S-" + key;
    if (event.ctrlKey) key = "C-" + key;
    if (event.altKey) key = "A-" + key;

    if (pressingKey) {
        if (pressingKey === key) {
            // This is an event triggered by the extension simulating a
            // key (well probably, it technically could be a coincidence)
            console.log("Extension Pressed:", key);
        } else {
            // The user pressed a key while the extension was in the
            // process of performing a keybind. In this case, block the
            // user's key press.
            preventEvent(event);
            console.log("Blocked Overlapping Event:", key);
        }
        return;
    }

    const repeat = mode.repeat ?? 1;

    // Check if it is a numeric argument
    if (mode.type !== "insert" && key.match(/^[0123456789]$/)) {
        const newRepeat = +((mode.repeat ?? "") + key);
        changeMode({ ...mode, repeat: newRepeat });
        preventEvent(event);
        return;
    } else {
        // If not actively updating the repeat number, reset it
        changeMode({ ...mode, repeat: undefined });
    }

    const modeBindings = defaultVinputConfig[mode.type];
    const keyBinding = modeBindings[key];
    if (!keyBinding) {
        // Exit motion mode if an invalid motion key was pressed
        if (mode.type === "motion") changeMode({ type: mode.previous });
        return;
    }

    // Prevent whatever the key would have originally done
    preventEvent(event);

    // If its an operator, switch to motion mode
    if (keyBinding.type === "operator") {
        if (mode.type === "motion") {
            console.error("Cannot perform an operator as a motion");
            return;
        }
        changeMode({ type: "motion", operator: keyBinding.commands, previous: mode.type });
        return;
    }

    // Perform the actual command
    for (let i = 0; i < repeat; i++) {
        await performCommands(keyBinding.commands);
    }

    // If the last mode was motion, then perform the operator
    if (mode.type === "motion") {
        // Add a tiny bit of delay to make the behavior more consistent
        await new Promise((resolve) => setTimeout(resolve, 20));
        await performCommands(mode.operator);

        // If still in motion mode, restore the old mode
        if (mode.type === "motion") {
            changeMode({ type: mode.previous });
        }
    }
}

// ==================== Updating Mode from Events ====================

// Enable visual mode when selecting in normal mode
const win = window;
window.addEventListener("selectionchange", () => {
    if (handlingKeydown) return;

    if (mode.type === "motion") changeMode({ type: mode.previous });

    const active = document.activeElement as HTMLInputElement | undefined;
    const start = active?.selectionStart;
    const end = active?.selectionEnd;
    const selecting = start !== undefined && end !== undefined && start !== end;

    if (selecting && mode.type === "normal") {
        changeMode({ type: "visual" });
    } else if (!selecting && mode.type === "visual") {
        changeMode({ type: "normal" });
    }
});
