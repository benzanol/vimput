// ==================== Commands ====================

import { CommandName, flattenedCommands } from "./utils/commands";

// Send to the backend to perform key press actions. Store globally
// that the key is being pressed so that the event listener can ignore
// it.
let pressingKey: [KeyCombo, Date] | undefined = undefined;
async function pressKey(key: KeyCombo): Promise<void> {
    verboseLog(`Sending key: '${key}'`);
    return new Promise((resolve) => {
        pressingKey = [key, new Date()];
        chrome.runtime.sendMessage(null, { type: "pressKey", key }, () => {
            pressingKey = undefined;
            // Add a tiny bit of delay to ensure that every key gets run.
            // If you disable this, sequences with a lot of keys will skip some.
            setTimeout(resolve, 1);
        });
    });
}

async function performCommands(commands: CommandName[]): Promise<void> {
    for (const command of commands) {
        const commandDef = flattenedCommands[command];

        // Press the keys associated with the command
        for (const keyCombo of commandDef.keys ?? []) {
            await pressKey(keyCombo);
        }

        // Switch the mode associated with the command
        if (commandDef.mode) changeState({ mode: commandDef.mode });

        // Perform custom commands
        if (command === "ExitSelection") {
            const direction = activeWindow(window).getSelection()?.direction;
            if (direction === "forward") {
                await pressKey("ArrowRight");
            } else if (direction === "backward") {
                await pressKey("ArrowLeft");
            }
        } else if (command === "SwapSelectionDirection") {
            const sel = activeWindow(window).getSelection();
            if (!sel || !sel.anchorNode || !sel.focusNode) return;
            sel.setBaseAndExtent(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset);
        }
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

const upcaseMode = () => state.mode[0].toUpperCase() + state.mode.slice(1);

function allDocuments(): Document[] {
    const all = [document];
    document.querySelectorAll("frame, iframe").forEach((frame) => {
        const doc = (frame as HTMLIFrameElement).contentDocument;
        if (doc) all.push(doc);
    });
    return all;
}

function activeWindow(win: Window): Window {
    const a = win.document.activeElement;
    if (["FRAME", "IFRAME"].includes(a?.tagName!)) {
        const subWin = (a as HTMLIFrameElement).contentWindow;
        if (subWin) return activeWindow(subWin);
    }
    return win;
}

// Frame-agnostic way to get the nearest parent element of node
function nearestElement(node: Node | null | undefined): Element | null {
    if (node && typeof node === "object" && node.constructor.name === "Element") {
        return node as Element;
    } else if (node) {
        return node.parentElement;
    } else {
        return null;
    }
}

function isBgDark(): boolean {
    const doc = activeWindow(window).document;
    const focusNode = doc.getSelection()?.focusNode;
    const activeElem = nearestElement(focusNode) ?? doc.activeElement ?? doc.body;

    const bg = getComputedStyle(activeElem).backgroundColor;
    const [r, g, b] = bg.match(/\d+/g)?.map(Number) || [255, 255, 255];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    return luminance < 128;
}

let caretColorElems: HTMLElement[] = [];
function changeState(newState: VinputState, forceRefresh: boolean = false) {
    const modeChanged = newState.mode !== state.mode;
    state = newState;
    if (modeChanged || forceRefresh) {
        verboseLog("Changed mode:", state.mode);

        // Remove the old caret color
        for (const elem of caretColorElems) {
            elem.style.caretColor = "unset";
        }
        caretColorElems = [];

        // Set the new caret color
        let newColor = config.settings[upcaseMode() + "CaretColor"];
        if (isBgDark()) newColor = config.settings[upcaseMode() + "DarkCaretColor"] ?? newColor;

        if (newColor) {
            caretColorElems = allDocuments().map((doc) => {
                doc.body.style.caretColor = newColor;
                return doc.body;
            });
        }

        // Change the mode icon
        chrome.runtime.sendMessage(null, { type: "changeMode", mode: state.mode });
    }
}

// ==================== Config ====================

import { defaultVinputConfig, type VinputConfig } from "./utils/config";

let config: VinputConfig = defaultVinputConfig;

function verboseLog(...data: any[]) {
    if (config.settings.Verbose === "true") {
        console.log("vinput:", ...data);
    }
}

// Get the stored config
chrome.storage.sync.get("config", (result) => {
    config = { ...(result.config ?? defaultVinputConfig) };

    // Load site-specific settings
    config.settings = { ...config.settings };
    for (const [setting, value, site] of config.siteSettings) {
        if (window.location.href.match(new RegExp(`^${site}$`))) {
            config.settings[setting] = value;
        }
    }

    // Set the default mode
    const m = config.settings.InitialMode;
    const mode = m === "insert" || m === "normal" || m === "visual" ? m : "insert";
    changeState({ mode }, true);
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

async function handleKeydown(event: KeyboardEvent): Promise<void> {
    if (["Control", "Shift", "Alt", "Meta", "CapsLock"].includes(event.key)) return;

    let key = event.key;
    if (event.shiftKey) key = "S-" + key;
    if (event.ctrlKey) key = "C-" + key;
    if (event.altKey) key = "A-" + key;

    // If pressing the key took longer than a second, it probably failed.
    if (pressingKey && new Date().getTime() - pressingKey[1].getTime() >= 1000) {
        pressingKey = undefined;
    }

    if (pressingKey) {
        if (pressingKey[0] === key) {
            // This is an event triggered by the extension simulating a
            // key (well probably, it technically could be a coincidence)
            verboseLog(`Extension Pressed: '${key}'`);
        } else {
            // The user pressed a key while the extension was in the
            // process of performing a keybind. In this case, block the
            // user's key press.
            preventEvent(event);
            verboseLog(`Blocked Overlapping Event: '${key}' (${pressingKey})`);
        }
        return;
    }
    let repeat = state.repeat ?? 1;
    const maxRepeat = +config.settings.MaxRepeat;
    if (isFinite(maxRepeat) && maxRepeat >= 1 && repeat > maxRepeat) repeat = maxRepeat;

    // Check if it is a numeric argument
    if (state.mode !== "insert" && key.match(/^[0123456789]$/)) {
        verboseLog(`Numeric Key: '${key}'`);

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
        verboseLog(`Unbound Key: '${key}'`);

        // Exit motion mode if an invalid motion key was pressed
        if (state.mode === "motion") {
            changeState({ mode: state.previous });
            preventEvent(event);
        } else if (
            config.settings[`${upcaseMode()}BlockInsertions`] === "true" &&
            key.match(/^(S-)?.$/)
        ) {
            preventEvent(event);
        }
        // Check for selection change after the key event has been performed
        setTimeout(() => {
            handlingKeydown = false;
            onSelectionChange();
        }, 0);
        return;
    }
    verboseLog(`Executing Key: '${key}'`);

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

let handlingKeydown = false;
async function onKeydown(event: KeyboardEvent): Promise<void> {
    handlingKeydown = true;
    try {
        await handleKeydown(event);
    } finally {
        // By waiting before setting to false the keydown, the
        // selection change listener runs before it is set to false,
        // meaning that if a command makes the visual selection have
        // length 0, visual mode will not be immediately disabled
        setTimeout(() => (handlingKeydown = false), 5);
    }
}

// ==================== Listening to Key Presses ====================

function watchDocument(doc: Document) {
    doc.removeEventListener("keydown", onKeydown);
    doc.addEventListener("keydown", onKeydown);

    doc.removeEventListener("selectionchange", onSelectionChange);
    doc.addEventListener("selectionchange", onSelectionChange);
    doc.removeEventListener("pointerdown", onSelectionChange);
    doc.addEventListener("pointerdown", onSelectionChange);

    // Third argument=true means watch every node in the dom for focus changes
    doc.removeEventListener("focus", onFocusChange);
    doc.addEventListener("focus", onFocusChange, true);
    doc.removeEventListener("blur", onFocusChange);
    doc.addEventListener("blur", onFocusChange, true);
}

function watchFrame(frame: HTMLIFrameElement) {
    const cb = () => frame.contentDocument && watchDocument(frame.contentDocument);
    // Add the listener on load or after a short pause, whichever happens first
    setTimeout(cb, 0);
    setTimeout(cb, 1000);
    frame.addEventListener("load", cb);
}

// Watch the root document
watchDocument(document);

// Watch all current frame elements
document.querySelectorAll("frame, iframe").forEach((el) => watchFrame(el as HTMLIFrameElement));

// Detect new child frames
const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
        for (const frame of Array.from(m.addedNodes)) {
            if ("tagName" in frame && ["FRAME", "IFRAME"].includes(frame.tagName as string)) {
                watchFrame(frame as HTMLIFrameElement);
            }
        }
    }
});
observer.observe(document, {
    childList: true,
    subtree: true,
});

// ==================== Updating Mode from Events ====================

function onFocusChange() {
    if (handlingKeydown) return;
    const onFocus = config.settings.OnFocus;
    verboseLog("Focus changed", onFocus);

    if (onFocus === "auto") {
        const activeDoc = activeWindow(window).document;
        const el = activeDoc.activeElement;
        // Use tag-names (not instanceof) to make this frame-agnostic
        const isEditable =
            ["TEXTAREA", "INPUT"].includes(el?.tagName!) ||
            (el && "contentEditable" in el && el.contentEditable === "true") ||
            el?.parentElement?.contentEditable === "true";

        // Update after the focus has changed, so that the background color is detected correctly
        setTimeout(() => changeState({ mode: isEditable ? "insert" : "normal" }, true), 0);
    } else if (onFocus === "insert" || onFocus === "normal" || onFocus === "visual") {
        setTimeout(() => changeState({ mode: onFocus }, true), 0);
    }
}

// Enable visual mode when selecting in normal mode
function onSelectionChange() {
    if (handlingKeydown) return;

    if (state.mode === "motion") {
        changeState({ mode: state.previous });
        return;
    }

    const active = document.activeElement as HTMLInputElement | undefined;
    const start = active?.selectionStart;
    const end = active?.selectionEnd;
    const selecting = start !== undefined && end !== undefined && start !== end;

    if (selecting && state.mode === "normal") {
        verboseLog("Switched to visual mode because of selection");
        changeState({ mode: "visual" });
    } else if (!selecting && state.mode === "visual") {
        verboseLog("Exited visual mode because of no selection");
        changeState({ mode: "normal" });
    }
}
