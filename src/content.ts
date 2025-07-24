// ==================== Setup ====================

import { defaultVinputConfig } from "./utils/config";
import { ModeManager } from "./utils/modeManager";

// Get the stored config
console.log("Get config");
chrome.storage.local.get("config", (result) => {
    console.log("Got config");
    async function setMode(mode: string): Promise<void> {
        await chrome.runtime.sendMessage(null, { type: "changeMode", mode: mode });
    }

    async function pressKey(key: KeyCombo): Promise<void> {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(null, { type: "pressKey", key }, () => {
                resolve();
            });
            setTimeout(resolve, 1000);
        });
    }

    const manager = new ModeManager(
        { pressKey, setMode, window },
        result?.config ?? defaultVinputConfig,
    );

    // Listen for when the stored config changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes?.config) {
            manager.updateConfig(changes.config.newValue);
        }
    });
});
