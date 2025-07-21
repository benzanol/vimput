const vinputCommands = {
    Modes: {
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
    },
    Navigation: {
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
    },
    Deleting: {
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
    },
    "Visual Navigation": {
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
    },
    "Key Combos": {
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
    },
} as const;
export default vinputCommands;
