// ==================== Debugger Logistics ====================

// A list of tabs that the debugger is attached to
const attachedTabs = new Set<number>();

// Attach the debugger in order to send key press events
function attachDebugger(tabId: number): Promise<void> {
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

// When the extension is activated
chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id && !attachedTabs.has(tab.id)) {
        await attachDebugger(tab.id);
    }
});

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
    Control: 17,
    Shift: 16,
} as const;

type Key = keyof typeof KEYS;
type KeyCombo = Key[];

const KEY_CODES: Partial<Record<Key, string>> = {
    Control: "ControlLeft",
    Shift: "ShiftLeft",
};

function sendKeyEvent(tabId: number, type: "keyDown" | "keyUp", key: Key) {
    const windowsVirtualKeyCode = KEYS[key];
    const code = KEY_CODES[key] ?? key;
    const event = { type, windowsVirtualKeyCode, code, key };
    chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", event);
}

// Send a key press down and up
function sendKeyPress(tabId: number, key: Key) {
    sendKeyEvent(tabId, "keyDown", key);
    sendKeyEvent(tabId, "keyUp", key);
}

// Send a combination of keys all pressed at once
function sendKeyCombo(tabId: number, combo: KeyCombo, start: number = 0) {
    if (start >= combo.length) return;
    sendKeyEvent(tabId, "keyDown", combo[start]);
    sendKeyCombo(tabId, combo, start + 1);
    sendKeyEvent(tabId, "keyUp", combo[start]);
}

// ==================== Program Logic ====================
