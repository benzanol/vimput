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

// ==================== Sending Keys ====================

const KEYS = {
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,

    Enter: 13,
    Tab: 9,
    Space: 32,
    Delete: 46,
    Backspace: 8,

    c: 99,
    v: 118,
    x: 120,
    z: 122,
} as const;

type Key = keyof typeof KEYS;
type KeyCombo = Key | `C-${Key}` | `S-${Key}` | `C-S-${Key}`;

type EventType = "keyDown" | "keyUp";

async function performKeyEvent(tabId: number, type: EventType, key: KeyCombo): Promise<void> {
    let modifiers = 0;
    if (key.startsWith("C-")) {
        key = key.substring(2) as KeyCombo;
        modifiers += 2;
    }
    if (key.startsWith("S-")) {
        key = key.substring(2) as KeyCombo;
        modifiers += 8;
    }
    console.error("KEY", key, modifiers);

    const windowsVirtualKeyCode = KEYS[key as Key];
    const event = { type, windowsVirtualKeyCode, code: key, key, modifiers };

    return new Promise((resolve) => {
        chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", event, () => {
            resolve();
        });
    });
}

// Send a key press down and up
async function performKeyPress(tabId: number, key: KeyCombo): Promise<void> {
    await performKeyEvent(tabId, "keyDown", key);
    await performKeyEvent(tabId, "keyUp", key);
}

// Send keys sent from content.ts
chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.tab?.id && message.type === "pressKey") {
        try {
            ensureDebuggerAttached(sender.tab.id);
            performKeyPress(sender.tab.id, message.key as KeyCombo);
        } finally {
            respond();
        }
    }
});
