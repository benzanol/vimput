import { commandTypes } from "./utils/commands";
import { defaultVinputConfigText, defaultVinputConfig, VinputConfig } from "./utils/config";
import { parseConfiguration } from "./utils/parseConfig";

// ==================== Generate the command list ====================

const container = document.getElementById("commands");
if (!(container instanceof HTMLElement)) throw new Error("Invalid command container");
container.replaceChildren();

for (const [type, cmds] of Object.entries(commandTypes)) {
    const typeDiv = document.createElement("div");
    typeDiv.className = "command-type";
    typeDiv.textContent = type;
    container.appendChild(typeDiv);

    for (const [name, def] of Object.entries(cmds)) {
        const nameSpan = document.createElement("span");
        nameSpan.textContent = name;

        const keySpan = document.createElement("span");
        keySpan.classList.add("command-key");
        keySpan.textContent = "(" + (def.keys ?? def.mode) + ")";

        const cmdDiv = document.createElement("div");
        cmdDiv.append(nameSpan, keySpan);
        container.appendChild(cmdDiv);
    }
}

// ==================== Save config ====================

function setUserMessage(message: string, error: boolean = false) {
    document.getElementById("success")!.textContent = error ? "" : message;
    document.getElementById("error")!.textContent = error ? message : "";
}

// Add save button listener
document.getElementById("save")!.addEventListener("click", async () => {
    try {
        const textarea = document.getElementById("config") as HTMLTextAreaElement;
        const output = parseConfiguration(textarea.value, defaultVinputConfig);

        // Show feedback to user
        if (typeof output === "string") {
            setUserMessage(output, true);
            return;
        }

        // Save config
        await chrome.storage.sync.set<ExtensionStorage>({
            configText: textarea.value,
            config: typeof output === "string" ? undefined : output,
        });
        setUserMessage("Your configuration has been saved!");
    } catch (e) {
        setUserMessage(`Error saving config: ${e}`);
    }
});

// ==================== Load config ====================

const defText = defaultVinputConfigText.trim();
const defConfigElem = document.getElementById("default-config") as HTMLTextAreaElement;
defConfigElem.value = defText;
defConfigElem.rows = defText.split("\n").length;

type ExtensionStorage = {
    configText?: string;
    config?: VinputConfig;
};

// Get data
chrome.storage.sync.get<ExtensionStorage>("configText", (result) => {
    const textarea = document.getElementById("config") as HTMLTextAreaElement;
    textarea.value = result.configText ?? "";
});
