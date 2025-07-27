// ==================== Debugger Logistics ====================

// A list of tabs that the debugger is attached to
const attachedTabs = new Set<number>();

// Attach the debugger in order to send key press events
async function ensureDebuggerAttached(tabId: number): Promise<void> {
    if (attachedTabs.has(tabId)) return;

    return new Promise((resolve, reject) => {
        chrome.debugger.attach({ tabId }, "1.3", () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            attachedTabs.add(tabId);
            resolve();
        });
    });
}

// Detect when the debugger detaches
if (chrome.debugger) {
    chrome.debugger.onDetach.addListener(({ tabId }) => {
        if (tabId && attachedTabs.has(tabId)) {
            attachedTabs.delete(tabId);
            console.error(`Debugger detached from tab ${tabId}`);
        }
    });

    // Detect when the tab is closed
    chrome.tabs.onRemoved.addListener((tabId) => {
        if (attachedTabs.has(tabId)) {
            chrome.debugger.detach({ tabId });
            attachedTabs.delete(tabId);
        }
    });
}

// ==================== Sending Keys ====================

const KEYS = {
    End: 35,
    Home: 36,
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,

    Enter: 13,
    Tab: 9,
    " ": 32,
    Delete: 46,
    Backspace: 8,

    // Copy, paste, cut, and undo are the only supported
    c: 67,
    v: 86,
    x: 88,
    z: 90,
} as const;

const KEY_CODES: Partial<Record<Key, string>> = {
    " ": "Space",
};

type Key = keyof typeof KEYS;
type SKeyCombo = Key | `S-${Key}`;
type CSKeyCombo = SKeyCombo | `C-${SKeyCombo}`;
type MCSKeyCombo = CSKeyCombo | `M-${CSKeyCombo}`;
type KeyCombo = MCSKeyCombo | `A-${MCSKeyCombo}`;

type EventType = "keyDown" | "keyUp" | "rawKeyDown";

// Parse a key combo to get the modifiers and the base key
function calculateModifiers(key: KeyCombo): [number, Key] {
    let modifiers = 0;
    if (key.startsWith("A-")) {
        key = key.substring(2) as KeyCombo;
        modifiers += 1;
    }
    if (key.startsWith("C-")) {
        key = key.substring(2) as KeyCombo;
        modifiers += 2;
    }
    if (key.startsWith("M-")) {
        key = key.substring(2) as KeyCombo;
        modifiers += 4;
    }
    if (key.startsWith("S-")) {
        key = key.substring(2) as KeyCombo;
        modifiers += 8;
    }
    return [modifiers, key as Key];
}

async function performKeyEvent(tabId: number, type: EventType, combo: KeyCombo): Promise<void> {
    const [modifiers, key] = calculateModifiers(combo);
    const code = KEY_CODES[key] ?? key; // None of the keys used require a different key code
    const windowsVirtualKeyCode = KEYS[key as Key];
    const event = { type, code, key, windowsVirtualKeyCode, modifiers };

    return new Promise((resolve) => {
        chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", event, () => {
            resolve();
        });
    });
}

// Send a key press down and up
async function performKeyPress(tabId: number, combo: KeyCombo): Promise<void> {
    await performKeyEvent(tabId, "keyDown", combo);
    await performKeyEvent(tabId, "keyUp", combo);
}

// ==================== Message Listener ====================

// Send keys sent from content.ts
chrome.runtime.onMessage.addListener((message, sender, respond) => {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    if (message.type === "pressKey") {
        ensureDebuggerAttached(tabId);
        performKeyPress(tabId, message.key as KeyCombo).finally(() => respond());
        return true;
    } else if (message.type === "changeMode") {
        chrome.action.setIcon({
            tabId,
            path: { "128": `/resources/icons/${message.mode}.png` },
        });
    }
});

// ==================== On Click ====================

chrome.action.onClicked.addListener(async (_tab) => {
    // if (!tab.id) return;
    // chrome.tabs.sendMessage(tab.id, { type: "clicked" });
    chrome.runtime.openOptionsPage();
});
