import { flattenedCommands, type CommandName } from "./commands";
import { type VinputConfig } from "./config";

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
    if (node && typeof node === "object" && node.constructor.name === "Element") {
        return node as Element;
    } else if (node) {
        return node.parentElement;
    } else {
        return null;
    }
}

function isBgDark(root: Window): boolean {
    const doc = activeWindow(root).document;
    const focusNode = doc.getSelection()?.focusNode;
    const activeElem = nearestElement(focusNode) ?? doc.activeElement ?? doc.body;

    const bg = getComputedStyle(activeElem).backgroundColor;
    const [r, g, b] = bg.match(/\d+/g)?.map(Number) || [255, 255, 255];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    return luminance < 128;
}

function preventEvent(event: KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
}

// ==================== State Manager ====================

// For the motion mode, we need to know which operator to run once the
// user provides a motion, and also which mode to return to after the
// operator is performed.
type State =
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
};

export class ModeManager {
    constructor(private ctx: ExtensionContext, private config: VinputConfig) {
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
    }

    // ==================== Config ====================

    public updateConfig(config: VinputConfig) {
        this.config = config;

        // Load site-specific settings
        config.settings = { ...config.settings };
        for (const { site, setting, value } of config.siteSettings) {
            if (this.ctx.window.location.href.match(new RegExp(`^${site}$`))) {
                config.settings[setting] = value;
            }
        }

        // Set the default mode
        const m = config.settings.InitialMode;
        const mode = m === "insert" || m === "normal" || m === "visual" ? m : "insert";

        this.changeState({ mode }, true);
    }

    private verboseLog(...data: any[]) {
        if (this.config.settings.Verbose === "true") {
            console.log("vinput:", ...data);
        }
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
    private state: State = { mode: "normal" };
    private upcaseMode = () => this.state.mode[0].toUpperCase() + this.state.mode.slice(1);

    // Elements which the plugin has set the caret color on
    private caretColorElems: HTMLElement[] = [];

    private changeState(newState: State, forceRefresh: boolean = false) {
        const modeChanged = newState.mode !== this.state.mode;
        this.state = newState;
        if (modeChanged || forceRefresh) {
            this.verboseLog("Changed mode:", this.state.mode);

            // Remove the old caret color
            for (const elem of this.caretColorElems) {
                elem.style.caretColor = "unset";
            }
            this.caretColorElems = [];

            // Set the new caret color
            let newColor = this.config.settings[this.upcaseMode() + "CaretColor"];
            if (isBgDark(this.ctx.window)) {
                newColor = this.config.settings[this.upcaseMode() + "DarkCaretColor"] ?? newColor;
            }

            if (newColor) {
                this.caretColorElems = allDocuments(this.ctx.window.document).map((doc) => {
                    doc.body.style.caretColor = newColor;
                    return doc.body;
                });
            }

            // Change the mode icon
            this.ctx.setMode(this.state.mode);
        }
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

            // Press the keys associated with the command
            for (const keyCombo of commandDef.keys ?? []) {
                await this.pressKey(keyCombo);
            }

            // Switch the mode associated with the command
            if (commandDef.mode) this.changeState({ mode: commandDef.mode });

            // Perform custom commands
            if (command === "ExitSelection") {
                const direction = activeWindow(this.ctx.window).getSelection()?.direction;
                if (direction === "forward") {
                    await this.pressKey("ArrowRight");
                } else if (direction === "backward") {
                    await this.pressKey("ArrowLeft");
                }
            } else if (command === "SwapSelectionDirection") {
                const sel = activeWindow(this.ctx.window).getSelection();
                if (!sel || !sel.anchorNode || !sel.focusNode) return;
                sel.setBaseAndExtent(
                    sel.focusNode,
                    sel.focusOffset,
                    sel.anchorNode,
                    sel.anchorOffset,
                );
            }
        }
    }

    // ==================== Key Press Logic ====================

    public async handleKey(key: string, cancel: () => void) {
        let repeat = this.state.repeat ?? 1;
        const maxRepeat = +this.config.settings.MaxRepeat;
        if (isFinite(maxRepeat) && maxRepeat >= 1 && repeat > maxRepeat) repeat = maxRepeat;

        // Check if it is a numeric argument
        if (this.state.mode !== "insert" && key.match(/^[0123456789]$/)) {
            this.verboseLog(`Numeric key '${key}'`);

            const newRepeat = +((this.state.repeat ?? "") + key);
            this.changeState({ ...this.state, repeat: newRepeat });
            cancel();
            return;
        } else {
            // If not actively updating the repeat number, reset it
            this.changeState({ ...this.state, repeat: undefined });
        }

        const modeBindings = this.config[this.state.mode];
        const keyBinding = modeBindings[key];
        if (!keyBinding) {
            this.verboseLog(`Unbound key '${key}'`);

            // Exit motion mode if an invalid motion key was pressed
            if (this.state.mode === "motion") {
                cancel();
                this.changeState({ mode: this.state.previous });
            } else if (
                this.config.settings[`${this.upcaseMode()}BlockInsertions`] === "true" &&
                key.match(/^(S-)?.$/)
            ) {
                cancel();
            }
            // Check for selection change after the key event has been performed
            setTimeout(() => this.onSelectionChange(), 0);
            return;
        }
        this.verboseLog(`Bound key '${key}' '${keyBinding.commands}'`);

        // Prevent whatever the key would have originally done
        cancel();

        // If its an operator, switch to motion mode
        if (keyBinding.type === "operator") {
            if (this.state.mode === "motion") {
                console.error("Cannot perform an operator as a motion");
                return;
            }
            this.changeState({
                mode: "motion",
                operator: keyBinding.commands,
                previous: this.state.mode,
            });
            return;
        }

        // Perform the actual command
        for (let i = 0; i < repeat; i++) {
            await this.performCommands(keyBinding.commands);
        }

        // If the last mode was motion, then perform the operator
        if (this.state.mode === "motion") {
            // Add a tiny bit of delay to make the behavior more consistent
            await new Promise((resolve) => setTimeout(resolve, 20));
            await this.performCommands(this.state.operator);

            // If still in motion mode, restore the old mode
            if (this.state.mode === "motion") {
                this.changeState({ mode: this.state.previous });
            }
        }
    }

    // ==================== Handle Events ====================

    private handlingKeydown = false;
    private lastEventType: "bound" | "unbound" | "other" = "other";

    public onKeydown = async (event: KeyboardEvent) => {
        try {
            if (["Control", "Shift", "Alt", "Meta", "CapsLock"].includes(event.key)) return;

            let key = event.key;
            if (event.shiftKey) key = "S-" + key;
            if (event.ctrlKey) key = "C-" + key;
            if (event.altKey) key = "A-" + key;

            // Check if currently in the process of pressing a key
            if (this.pressingKey && this.pressingKey === key) {
                this.verboseLog(`Extension key '${key}'`);
                return;
            } else if (this.handlingKeydown) {
                this.verboseLog(`Blocked overlapping key '${key}'`);
                preventEvent(event);
                return;
            }

            this.handlingKeydown = true;

            // Start off by assuming the key is unbound, and if the
            // handler cancels the event, that means the key was bound.
            this.lastEventType = "unbound";
            const cancel = () => {
                preventEvent(event);
                this.lastEventType = "bound";
            };

            await this.handleKey(key, cancel);
        } finally {
            // By waiting before setting to false the keydown, the
            // selection change listener runs before it is set to false,
            // meaning that if a command makes the visual selection have
            // length 0, visual mode will not be immediately disabled
            this.handlingKeydown = false;
        }
    };

    public onFocusChange = () => {
        if (!this.handlingKeydown && this.lastEventType === "bound") return;
        this.verboseLog("Focus changed", this.lastEventType);

        const onFocus = this.config.settings.OnFocus;

        if (onFocus === "auto") {
            const activeDoc = activeWindow(this.ctx.window).document;
            const el = activeDoc.activeElement;
            // Use tag-names (not instanceof) to make this frame-agnostic
            const isEditable =
                ["TEXTAREA", "INPUT"].includes(el?.tagName!) ||
                (el && "contentEditable" in el && el.contentEditable === "true") ||
                el?.parentElement?.contentEditable === "true";

            // Update after the focus has changed, so that the background color is detected correctly
            setTimeout(() => this.changeState({ mode: isEditable ? "insert" : "normal" }, true), 0);
        } else if (onFocus === "insert" || onFocus === "normal" || onFocus === "visual") {
            setTimeout(() => this.changeState({ mode: onFocus }, true), 0);
        }
    };

    // Enable visual mode when selecting in normal mode
    public onSelectionChange = () => {
        if (!this.handlingKeydown && this.lastEventType === "bound") return;

        if (this.state.mode === "motion") {
            this.changeState({ mode: this.state.previous });
            return;
        }

        const active = this.ctx.window.document.activeElement as HTMLInputElement | undefined;
        const start = active?.selectionStart;
        const end = active?.selectionEnd;
        const selecting = start !== undefined && end !== undefined && start !== end;

        if (selecting && this.state.mode === "normal") {
            this.verboseLog("Switched to visual mode because of selection");
            this.changeState({ mode: "visual" });
        } else if (!selecting && this.state.mode === "visual") {
            this.verboseLog("Exited visual mode because of no selection");
            this.changeState({ mode: "normal" });
        }
    };

    public onPointerEvent = () => {
        this.lastEventType = "other";
    };
}
