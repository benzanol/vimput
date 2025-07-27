import { defaultVinputConfig } from "./utils/config";
import { ModeManager } from "./utils/modeManager";

// Get the stored config
chrome.storage.sync.get("config", (result) => {
    // Set the mode icon
    async function setMode(mode: string): Promise<void> {
        await chrome.runtime.sendMessage(null, { type: "changeMode", mode: mode });
    }

    // Send a message to the backend to press a key
    async function pressKey(key: KeyCombo): Promise<void> {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(null, { type: "pressKey", key }, () => {
                resolve();
            });
            setTimeout(resolve, 1000);
        });
    }

    // Create the state manager
    const manager = new ModeManager(
        { pressKey, setMode, window },
        result?.config ?? defaultVinputConfig,
    );

    // Listen for when the stored config changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "sync" && changes?.config) {
            manager.updateConfig(changes.config.newValue);
        }
    });
});
