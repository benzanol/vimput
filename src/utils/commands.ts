export const commandTypes = {
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
        Top: {
            description: "Move cursor to the start of the editable area",
            keys: ["C-Home"],
        },
        Bottom: {
            description: "Move cursor to the start of the editable area",
            keys: ["C-End"],
        },
    },
    "Navigation with Selection": {
        SelectLeft: {
            description: "Expand selection left",
            keys: ["S-ArrowLeft"],
        },
        SelectRight: {
            description: "Expand selection right",
            keys: ["S-ArrowRight"],
        },
        SelectDown: {
            description: "Expand selection down",
            keys: ["S-ArrowDown"],
        },
        SelectUp: {
            description: "Expand selection up",
            keys: ["S-ArrowUp"],
        },
        SelectBackwardWord: {
            description: "Expand selection to previous word",
            keys: ["C-S-ArrowLeft"],
        },
        SelectForwardWord: {
            description: "Expand selection to next word",
            keys: ["C-S-ArrowRight"],
        },
        SelectLineStart: {
            description: "Expand selection to the start of the line",
            keys: ["S-Home"],
        },
        SelectLineEnd: {
            description: "Expand selection to the end of the line",
            keys: ["S-End"],
        },
        SelectTop: {
            description: "Expand selection to the start of the editable area",
            keys: ["C-S-Home"],
        },
        SelectBottom: {
            description: "Expand selection to the end of the editable area",
            keys: ["C-S-End"],
        },
    },
    Editing: {
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
        Enter: {
            description: "Create a new line",
            keys: ["Enter"],
        },
        // Could not figure out how to make space work
        // Space: {
        //     description: "Insert a space",
        //     keys: [" "],
        // },
        Tab: {
            description: "Press the tab key",
            keys: ["Tab"],
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
    },
    "Custom Commands": {
        ExitSelection: {
            description: "Exit the selection, putting the cursor on the correct side",
        },
        SwapSelectionDirection: {
            description: "Move the cursor to the opposite side of the selection",
        },
    },
} as const;

export type CommandType = keyof typeof commandTypes;
export type CommandName = { [K in CommandType]: keyof typeof commandTypes[K] }[CommandType];
export type CommandDef = {
    description: string;
    keys?: readonly KeyCombo[];
    mode?: "insert" | "normal" | "visual";
};

export const flattenedCommands = Object.fromEntries(
    Object.values(commandTypes).flatMap((type) => Object.entries(type)),
) as Record<CommandName, CommandDef>;
