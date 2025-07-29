import { flattenedCommands, platformKeys, type CommandName } from "./commands";
import { VimputAction, VimputConfig } from "./parseConfig";

// ==================== Utils ====================

function allDocuments(root: Document): Document[] {
    const all = [root];
    root.querySelectorAll("frame, iframe").forEach((frame) => {
        const doc = (frame as HTMLIFrameElement).contentDocument;
        if (doc) all.push(...allDocuments(doc));
    });
    return all;
}

function activeWindow(root: Window): Window {
    const a = root.document.activeElement;
    if (["FRAME", "IFRAME"].includes(a?.tagName!)) {
        const subWin = (a as HTMLIFrameElement).contentWindow;
        if (subWin) return activeWindow(subWin);
    }
    return root;
}

// Frame-agnostic way to get the nearest parent element of node
function nearestElement(node: Node | null | undefined): Element | null {
    if (node && node.nodeType === Node.ELEMENT_NODE) {
        return node as Element;
    } else if (node) {
        return node.parentElement;
    } else {
        return null;
    }
}

// Return a stack of elements, each in a different frame, all containing the caret
function activeElementStack(doc: Document): Element[] {
    const focusNode = doc.getSelection()?.focusNode;
    const active = nearestElement(focusNode) ?? doc.activeElement ?? doc.body;

    if (["FRAME", "IFRAME"].includes(active.tagName!)) {
        const subDoc = (active as HTMLIFrameElement).contentDocument;
        if (subDoc) return [active, ...activeElementStack(subDoc)];
    }
    return [active];
}

function getBackgroundColor(elem: Element): string | null {
    const bg = getComputedStyle(elem).backgroundColor;
    if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        return bg;
    }
    return elem.parentElement ? getBackgroundColor(elem.parentElement) : null;
}

// Check if the cursor background is dark
function isBgDark(root: Window): boolean {
    // If the first element is in a frame which has a transparent
    // background, then check if its parent frame has a background,
    // and so on.
    const elements = activeElementStack(root.document);
    const [r, g, b] = elements
        .reverse()
        .map((el) => {
            const color = getBackgroundColor(el);
            return color === null ? null : color.match(/\d+/g)?.map(Number);
        })
        // If opacity is undefined, then it was not included, so it is actually 255
        .find((color) => color) ?? [255, 255, 255];

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 128;
}

function isSelecting(root: Window): boolean {
    const win = activeWindow(root);

    const elem = win.document.activeElement;
    const start = (elem as any)?.selectionStart;
    const end = (elem as any)?.selectionEnd;
    return (
        !win.getSelection()?.isCollapsed ||
        (typeof start === "number" && typeof end === "number" && start !== end)
    );
}

function preventEvent(event: KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
}

function capitalize<T extends string>(str: T): Capitalize<T> {
    return (str[0].toUpperCase() + str.slice(1)) as Capitalize<T>;
}

type Selection = {
    window: Window;
    area: HTMLTextAreaElement | HTMLInputElement | null;
    anchorNode: Node;
    anchorOffset: number;
    focusNode: Node;
    focusOffset: number;
};

function getSelection(root: Window): Selection | null {
    const win = activeWindow(root);
    const active = win.document.activeElement;
    if (active && ["TEXTAREA", "INPUT"].includes(active.tagName)) {
        const area = active as HTMLTextAreaElement | HTMLInputElement;
        if (area.selectionStart) {
            const forwards = area.selectionDirection === "forward";
            const end = area.selectionEnd ?? area.selectionStart;
            return {
                window: win,
                area: area,
                anchorNode: area,
                anchorOffset: forwards ? area.selectionStart : end,
                focusNode: area,
                focusOffset: forwards ? end : area.selectionStart,
            };
        }
    }

    const sel = win.getSelection();
    if (!sel || !sel.focusNode) return null;

    return {
        window: win,
        area: null,
        anchorNode: sel.anchorNode ?? sel.focusNode,
        anchorOffset: sel.anchorOffset,
        focusNode: sel.focusNode,
        focusOffset: sel.focusOffset,
    };
}

function loadSelection(sel: Selection): void {
    if (sel.area) {
        sel.area.focus();
        const start = Math.min(sel.focusOffset, sel.anchorOffset);
        const end = Math.max(sel.focusOffset, sel.anchorOffset);
        const direction = sel.focusOffset === start ? "backward" : "forward";
        sel.area.setSelectionRange(start, end, direction);
    } else {
        sel.window
            .getSelection()!
            .setBaseAndExtent(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset);
    }
}

// ==================== Fast Keymap ====================

// Encapsulates more than just a VimputAction: anything that a key can do.
export type BroadAction =
    | VimputAction
    | { type: "zero"; initial: VimputAction | undefined }
    | { type: "number"; number: number };

// Define a faster way to check for keybindings. The array is 16
// elements long, with each element being the mapping associated with
// a particular control combo, where S=1, C=2, A/M=4. For example,
// index 9=8+1 would be Alt+Shift.
type FastKeymap = { [s: string]: BroadAction }[] & { length: 8 };

function createFastKeymap(
    map: { [s: string]: VimputAction },
    numerics: boolean = false,
): FastKeymap {
    const fastMap: FastKeymap = Array.from({ length: 8 }, () => ({})) as FastKeymap;
    const modifiers = { S: 1, C: 2, A: 4, M: 4 };

    for (const combo in map) {
        let modifier = 0;
        let rest = combo;
        let match: RegExpMatchArray | null;

        while ((match = rest.match(/^([ACMS])-(.*)$/))) {
            rest = match[2];
            modifier |= modifiers[match[1] as "A" | "C" | "M" | "S"];
        }

        fastMap[modifier][rest] = map[combo];
    }

    if (numerics) {
        fastMap[0]["0"] = { type: "zero", initial: map["0"] };
        for (let i = 1; i <= 9; i++) {
            fastMap[0][`${i}`] = { type: "number", number: i };
        }
    }

    return fastMap;
}

function accessFastKeymap(event: KeyboardEvent, map: FastKeymap): BroadAction | undefined {
    let modifier = 0;
    if (event.shiftKey) modifier |= 1;
    if (event.ctrlKey) modifier |= 2;
    if (event.altKey || event.metaKey) modifier |= 4;
    return map[modifier][event.key];
}

// ==================== State Manager ====================

// For the motion mode, we need to know which operator to run once the
// user provides a motion, and also which mode to return to after the
// operator is performed.
type State =
    | { mode: "off" }
    | { mode: "insert" | "normal" | "visual"; repeat?: number }
    | {
          mode: "motion";
          repeat?: number;
          operator: CommandName[];
          previous: "insert" | "normal" | "visual";
      };

export type ExtensionContext = {
    window: Window;
    setMode: (mode: State["mode"]) => void;
    pressKey: (key: KeyCombo) => Promise<void>;
    platform: string;
};

export class ModeManager {
    constructor(
        private ctx: ExtensionContext,
        config: VimputConfig,
    ) {
        this.updateConfig(config);

        // Watch the root document
        this.watchDocument(this.ctx.window.document);

        // Watch all current frame elements
        this.ctx.window.document
            .querySelectorAll("frame, iframe")
            .forEach((el) => this.watchFrame(el as HTMLIFrameElement));

        // Detect new child frames
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const frame of Array.from(m.addedNodes)) {
                    if (
                        "tagName" in frame &&
                        ["FRAME", "IFRAME"].includes(frame.tagName as string)
                    ) {
                        this.watchFrame(frame as HTMLIFrameElement);
                    }
                }
            }
        });
        observer.observe(this.ctx.window.document, {
            childList: true,
            subtree: true,
        });

        // Figure out which mode to start in
        this.changeState({ mode: this.defaultMode() }, "init", true);
    }

    // ==================== Config ====================

    // These will be initialize by updateConfig, which runs in the constructor
    private maps: Record<"insert" | "normal" | "visual" | "motion", FastKeymap> = undefined as any;
    private settings: VimputConfig["settings"] = undefined as any;

    public updateConfig(config: VimputConfig) {
        this.maps = {
            insert: createFastKeymap(config.insert),
            normal: createFastKeymap(config.normal, true),
            visual: createFastKeymap(config.visual, true),
            motion: createFastKeymap(config.motion, true),
        };

        // Load site-specific settings
        this.settings = { ...config.settings };
        for (const { site, setting, value } of config.siteSettings) {
            // Remove the extension prefix (https://)
            const href = this.ctx.window.location.href.replace(/^[^\/]+:\/\//, "");
            if (href.match(new RegExp(`^${site}$`))) {
                (this.settings as any)[setting] = value;
            }
        }
    }

    private verboseLog(...data: any[]) {
        if (this.settings.Verbose) console.log("vimput:", ...data);
    }

    private isInputFocused(): boolean {
        const activeDoc = activeWindow(this.ctx.window).document;
        const el = activeDoc.activeElement;
        // Use tag-names (not instanceof) to make this frame-agnostic
        return (
            ["TEXTAREA", "INPUT"].includes(el?.tagName!) ||
            (el && "contentEditable" in el && el.contentEditable === "true") ||
            el?.parentElement?.contentEditable === "true"
        );
    }

    private defaultMode(): "off" | "insert" | "normal" | "visual" {
        return (
            (this.isInputFocused() && this.settings.DefaultInputMode) ||
            this.settings.DefaultMode ||
            "insert"
        );
    }

    // ==================== Watching ====================
    private watchDocument(doc: Document) {
        doc.removeEventListener("keydown", this.onKeydown);
        doc.addEventListener("keydown", this.onKeydown, true);

        doc.removeEventListener("selectionchange", this.onSelectionChange);
        doc.addEventListener("selectionchange", this.onSelectionChange, true);
        doc.removeEventListener("pointerdown", this.onPointerEvent);
        doc.addEventListener("pointerdown", this.onPointerEvent, true);

        // Third argument=true means watch every node in the dom for focus changes
        doc.removeEventListener("focus", this.onFocusChange);
        doc.addEventListener("focus", this.onFocusChange, true);
        doc.removeEventListener("blur", this.onFocusChange);
        doc.addEventListener("blur", this.onFocusChange, true);
    }

    private watchFrame(frame: HTMLIFrameElement) {
        const cb = () => frame.contentDocument && this.watchDocument(frame.contentDocument);
        // Add the listener on load or after a short pause, whichever happens first
        setTimeout(cb, 0);
        setTimeout(cb, 1000);
        frame.addEventListener("load", cb);
    }

    // ==================== Modal State ====================

    // Don't show the mode icon until the config is loaded
    private state: State = { mode: "off" };

    // Toggle on click
    public toggleMode(): void {
        if (this.state.mode === "off") {
            const mode = this.defaultMode();
            this.changeState({ mode: mode === "off" ? "normal" : mode }, "click");
        } else {
            this.changeState({ mode: "off" }, "click");
        }
    }

    // Elements which the plugin has set the caret color on
    private caretColorElems: HTMLElement[] = [];

    private changeState(newState: State, reason: string, force: boolean = false) {
        if (!["off", "insert", "normal", "visual", "motion"].includes(newState.mode)) {
            throw new Error(`Invalid mode ${JSON.stringify(newState.mode)} ${reason}`);
        }

        const modeChanged = newState.mode !== this.state.mode;
        this.state = newState;
        if (!force && !modeChanged) return;

        this.verboseLog(`Changed mode '${this.state.mode}' (${reason})`);

        // Remove the old caret color
        for (const elem of this.caretColorElems) {
            elem.style.caretColor = "unset";
        }
        this.caretColorElems = [];

        // Set the new caret color
        const mode = this.state.mode;
        if (mode !== "off") {
            // Let the new color be either light or dark background
            let newColor = this.settings[`${capitalize(mode)}CaretColor`];
            if (isBgDark(this.ctx.window)) {
                newColor = this.settings[`${capitalize(mode)}DarkCaretColor`] ?? newColor;
            }

            if (newColor) {
                this.caretColorElems = allDocuments(this.ctx.window.document).map((doc) => {
                    doc.body.style.caretColor = newColor;
                    return doc.body;
                });
            }
        }

        // Change the mode icon
        this.ctx.setMode(this.state.mode);
    }

    // ==================== Do Command ====================

    private pressingKey: string | null = null;
    private async pressKey(key: KeyCombo): Promise<void> {
        this.pressingKey = key;
        await this.ctx.pressKey(key).catch((err) => {
            console.error("Error pressing key:", err);
        });
        // Add a tiny bit of delay to ensure that every key gets run.
        // If you disable this, sequences with a lot of keys will skip some.
        await new Promise((resolve) => setTimeout(resolve, 1));
        this.pressingKey = null;
        return;
    }

    private async performCommands(commands: CommandName[]): Promise<void> {
        for (const command of commands) {
            const commandDef = flattenedCommands[command];

            const keys = platformKeys(this.ctx.platform, commandDef);

            // Press the keys associated with the command
            for (const keyCombo of keys) {
                await this.pressKey(keyCombo);
            }

            // Switch the mode associated with the command
            if (commandDef.mode) this.changeState({ mode: commandDef.mode }, "command");

            // Perform custom commands
            if (command === "ExitSelection") {
                const direction = activeWindow(this.ctx.window).getSelection()?.direction;
                if (direction === "backward") {
                    await this.performCommands(["Left"]);
                } else {
                    await this.performCommands(["Right"]);
                }
            } else if (command === "SwapSelectionDirection") {
                const sel = getSelection(this.ctx.window);
                if (!sel) return;
                loadSelection({
                    ...sel,
                    focusNode: sel.anchorNode,
                    focusOffset: sel.anchorOffset,
                    anchorNode: sel.focusNode,
                    anchorOffset: sel.focusOffset,
                });
            }
        }
    }

    // ==================== Handle Events ====================

    private handlingKeydown = false;
    private lastEventType: "bound" | "unbound" | "other" = "other";

    private onKeydown = async (event: KeyboardEvent) => {
        if (this.state.mode === "off") return;

        // Check if currently in the process of pressing a key
        if (this.pressingKey) {
            let key = event.key;
            if (event.shiftKey) key = "S-" + key;
            if (event.ctrlKey) key = "C-" + key;
            if (event.altKey || event.metaKey) key = "A-" + key;

            if (this.pressingKey === key) {
                this.verboseLog(`Extension key '${key}'`);
                return;
            } else {
                this.verboseLog(`Blocked overlapping key '${key}'`);
                preventEvent(event);
                return;
            }
        }

        // Check if the key is unbound
        let action = accessFastKeymap(event, this.maps[this.state.mode]);
        if (!action) {
            this.verboseLog(`Unbound key '${event.key}'`);
            this.lastEventType = "unbound";

            if (this.state.mode === "insert") {
            } else if (this.state.mode === "motion") {
                this.changeState({ mode: this.state.previous }, "nomotion");
            } else if (
                // Check if insertions are blocked for normal/visual mode
                this.settings[`${capitalize(this.state.mode)}BlockInsertions`] &&
                !event.ctrlKey &&
                !event.altKey &&
                !event.metaKey
            ) {
                preventEvent(event);
            }
            return;
        }

        try {
            this.handlingKeydown = true;
            this.lastEventType = "bound";
            preventEvent(event);

            let repeat = this.state.repeat ?? 1;
            const maxRepeat = this.settings.MaxRepeat ?? Infinity;
            if (isFinite(maxRepeat) && maxRepeat >= 1 && repeat > maxRepeat) repeat = maxRepeat;

            // Handle if it is a zero
            if (action.type === "zero") {
                if (action.initial && !this.state.repeat) {
                    action = action.initial;
                } else {
                    action = { type: "number", number: 0 };
                }
            }

            // Check if it is a numeric argument
            if (action.type === "number") {
                this.verboseLog(`Numeric key '${action.number}'`);

                const newRepeat = +`${this.state.repeat ?? ""}${action.number}`;
                this.changeState({ ...this.state, repeat: newRepeat }, "repeat");
                return;
            } else {
                // If not actively updating the repeat number, reset it
                this.changeState({ ...this.state, repeat: undefined }, "norepeat");
            }

            // Perform the key action
            this.verboseLog(`Bound key '${event.key}' '${action.commands}'`);

            // Check for selection change after the key event has been performed
            setTimeout(() => this.onSelectionChange(), 0);

            // If its an operator, switch to motion mode
            if (action.type === "operator") {
                if (this.state.mode === "motion") {
                    console.error("Cannot perform an operator as a motion");
                    return;
                }
                this.changeState(
                    {
                        mode: "motion",
                        operator: action.commands,
                        previous: this.state.mode,
                    },
                    "operator",
                );
                return;
            }

            // Perform the actual command
            for (let i = 0; i < repeat; i++) {
                await this.performCommands(action.commands);
            }

            // If the last mode was motion, then perform the operator
            if (this.state.mode === "motion") {
                // Add a tiny bit of delay to make the behavior more consistent
                await new Promise((resolve) => setTimeout(resolve, 20));
                await this.performCommands(this.state.operator);

                // If still in motion mode, restore the old mode
                if (this.state.mode === "motion") {
                    this.changeState({ mode: this.state.previous }, "motion");
                }
            }
        } finally {
            // By waiting before setting to false, the selection
            // change listener runs before it is set to false, meaning
            // that if a command makes the visual selection have
            // length 0, visual mode will not be immediately disabled
            setTimeout(() => {
                this.handlingKeydown = false;
                this.onSelectionChange();
            }, 10);
        }
    };

    // Update after the focus has changed, so that the new element will be focused
    private onFocusChange = () => setTimeout(() => this.handleFocusChange(), 0);
    private handleFocusChange() {
        if (this.handlingKeydown) return;

        // Check whether an input is focused
        const inInput = this.isInputFocused();
        this.verboseLog("Focus changed", inInput);

        // Don't change mode when a keybinding moves to a new input element
        if (inInput && this.lastEventType === "bound") return;

        if ((this.settings.AutoSwitchMode ?? "never") !== "never") {
            this.changeState({ mode: this.defaultMode() }, "focus", true);
        }

        this.onSelectionChange();
    }

    // Enable visual mode when selecting in normal mode
    private wasSelecting = isSelecting(this.ctx.window);
    public onSelectionChange = () => {
        // Exit if the selection state didn't change
        const selecting = isSelecting(this.ctx.window);
        if (selecting === this.wasSelecting) return;
        this.wasSelecting = selecting;

        this.verboseLog("Selection changed", selecting);

        // Exit if this was the result of a key binding (this is supposed to be &&)
        if (this.handlingKeydown && this.lastEventType === "bound") return;

        if (this.state.mode === "motion") {
            this.changeState({ mode: this.state.previous }, "selection-motion");
            return;
        }

        if (
            selecting &&
            this.state.mode !== "visual" &&
            this.state.mode !== "off" &&
            this.settings.VisualModeOnSelect
        ) {
            this.changeState({ mode: "visual" }, "selection");
        } else if (!selecting && this.state.mode === "visual") {
            this.changeState({ mode: this.defaultMode() }, "noselection");
        }
    };

    public onPointerEvent = () => {
        this.verboseLog("Pointer");
        this.lastEventType = "other";
        if (this.settings.AutoSwitchMode === "always") this.onFocusChange();
        this.onSelectionChange();
    };
}
