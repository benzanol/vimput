// ==================== Commands ====================

import { CommandName, flattenedCommands } from "./utils/commands";

async function performCommands(commands: CommandName[]): Promise<void> {
    for (const command of commands) {
        const commandDef = flattenedCommands[command];

        // Press the keys associated with the command
        for (const keyCombo of commandDef.keys ?? []) {
            await pressKey(keyCombo);
            // Add a tiny bit of delay to ensure that every key gets run.
            // If you disable this, sequences with a lot of keys will skip some.
            await new Promise((resolve) => setTimeout(resolve, 1));
        }

        // Switch the mode associated with the command
        if (commandDef.mode) changeState({ mode: commandDef.mode });
    }
}

// ==================== Mode ====================

// For the motion mode, we need to know which operator to run once the
// user provides a motion, and also which mode to return to after the
// operator is performed.
type VinputState =
    | { mode: "insert" | "normal" | "visual"; repeat?: number }
    | {
          mode: "motion";
          repeat?: number;
          operator: CommandName[];
          previous: "insert" | "normal" | "visual";
      };

// Don't show the mode icon until the config is loaded
let state: VinputState = { mode: "insert" };

async function showModeIcon(mode: VinputState["mode"]): Promise<void> {
    await chrome.runtime.sendMessage(null, { type: "changeMode", mode });
}

function changeState(newState: VinputState) {
    const modeChanged = newState.mode !== state.mode;
    state = newState;
    if (modeChanged) showModeIcon(state.mode);
}

// ==================== Config ====================

import { defaultVinputConfig, type VinputConfig } from "./utils/config";

let config: VinputConfig = defaultVinputConfig;

// Get the stored config
chrome.storage.sync.get("config", (result) => {
    if (result.config) {
        config = result.config;

        // Set the default mode
        const m = config.settings.DefaultMode;
        if (m === "insert" || m === "normal" || m === "visual") {
            state = { mode: m };
        }
        showModeIcon(state.mode);
    }
});

// Listen for when the stored config changes
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes.config) {
        config = changes.config.newValue;
    }
});

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
    if (["Control", "Shift", "Alt", "Meta", "CapsLock"].includes(event.key)) return;

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
            console.log("Blocked Overlapping Event:", key, pressingKey);
        }
        return;
    }

    const repeat = state.repeat ?? 1;

    // Check if it is a numeric argument
    if (state.mode !== "insert" && key.match(/^[0123456789]$/)) {
        const newRepeat = +((state.repeat ?? "") + key);
        changeState({ ...state, repeat: newRepeat });
        preventEvent(event);
        return;
    } else {
        // If not actively updating the repeat number, reset it
        changeState({ ...state, repeat: undefined });
    }

    const modeBindings = config[state.mode];
    const keyBinding = modeBindings[key];
    if (!keyBinding) {
        // Exit motion mode if an invalid motion key was pressed
        if (state.mode === "motion") {
            changeState({ mode: state.previous });
            preventEvent(event);
        }
        return;
    }

    // Prevent whatever the key would have originally done
    preventEvent(event);

    // If its an operator, switch to motion mode
    if (keyBinding.type === "operator") {
        if (state.mode === "motion") {
            console.error("Cannot perform an operator as a motion");
            return;
        }
        changeState({ mode: "motion", operator: keyBinding.commands, previous: state.mode });
        return;
    }

    // Perform the actual command
    for (let i = 0; i < repeat; i++) {
        await performCommands(keyBinding.commands);
    }

    // If the last mode was motion, then perform the operator
    if (state.mode === "motion") {
        // Add a tiny bit of delay to make the behavior more consistent
        await new Promise((resolve) => setTimeout(resolve, 20));
        await performCommands(state.operator);

        // If still in motion mode, restore the old mode
        if (state.mode === "motion") {
            changeState({ mode: state.previous });
        }
    }
}

// ==================== Updating Mode from Events ====================

// Enable visual mode when selecting in normal mode
window.addEventListener("selectionchange", () => {
    if (handlingKeydown) return;

    if (state.mode === "motion") changeState({ mode: state.previous });

    const active = document.activeElement as HTMLInputElement | undefined;
    const start = active?.selectionStart;
    const end = active?.selectionEnd;
    const selecting = start !== undefined && end !== undefined && start !== end;

    if (selecting && state.mode === "normal") {
        changeState({ mode: "visual" });
    } else if (!selecting && state.mode === "visual") {
        changeState({ mode: "normal" });
    }
});
