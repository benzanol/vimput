import { CommandDef, commandTypes, platformKeys } from "./utils/commands";
import { defaultConfigText } from "./utils/config";
import { parseConfiguration, VimputConfig } from "./utils/parseConfig";

// const maxWidth = getComputedStyle(document.body.parentElement!).maxWidth;
// document.body.innerText = `Max width is set to ${maxWidth}`;

// ==================== Elements ====================

function checkElement<T extends Element>(id: string, cls: new (...args: any) => T): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`No element with id "${id}"`);
    if (!(el instanceof cls)) throw new Error(`Element is not a ${cls.name}`);
    return el;
}

const commandsElem = checkElement("commands", HTMLDivElement);
const saveElem = checkElement("save", HTMLButtonElement);
const configElem = checkElement("config", HTMLTextAreaElement);
const defaultConfigElem = checkElement("default-config", HTMLTextAreaElement);
const successElem = checkElement("success", HTMLDivElement);
const errorElem = checkElement("error", HTMLDivElement);

// ==================== Generate the command list ====================

commandsElem.replaceChildren();

for (const [type, cmds] of Object.entries(commandTypes)) {
    const typeDiv = document.createElement("div");
    typeDiv.className = "command-type";
    typeDiv.textContent = type;
    commandsElem.appendChild(typeDiv);

    for (const [name, def] of Object.entries(cmds) as [string, CommandDef][]) {
        const cmdDiv = commandsElem.appendChild(document.createElement("div"));
        if (def.description) cmdDiv.title = def.description;

        // Add the name
        const nameSpan = cmdDiv.appendChild(document.createElement("span"));
        nameSpan.textContent = name;

        // Add the key or mode
        if (def.keys || def.mode) {
            const keySpan = cmdDiv.appendChild(document.createElement("span"));
            keySpan.classList.add("command-key");
            const inner = def.keys ? platformKeys(navigator.platform, def) : def.mode;
            keySpan.textContent = "(" + inner + ")";
        }
    }
}

// ==================== Save config ====================

let configText: string | null = null;

function setUserMessage(message: string, error: boolean = false) {
    successElem.textContent = error ? "" : message;
    errorElem.textContent = error ? message : "";
}

// Add save button listener
saveElem.addEventListener("click", async () => {
    try {
        const output = parseConfiguration(configElem.value);

        // Show feedback to user
        if (typeof output === "string") {
            setUserMessage(output, true);
            return;
        }

        // Save config
        await chrome.storage.sync.set<ExtensionStorage>({
            configText: configElem.value,
            config: typeof output === "string" ? undefined : output,
        });
        configText = configElem.value;
        updateSaveButton();
        setUserMessage("Your configuration has been saved!");
    } catch (e) {
        setUserMessage(`Error saving config: ${e}`);
    }
});

// ==================== On input ====================

function updateSaveButton() {
    const textarea = configElem;
    const disabled = textarea.value === configText;
    saveElem.disabled = disabled;
}

configElem.addEventListener("input", updateSaveButton);

// ==================== Load config ====================

const defText = defaultConfigText.trim();
defaultConfigElem.value = defText;
defaultConfigElem.rows = defText.split("\n").length;

export type ExtensionStorage = {
    configText?: string;
    config?: VimputConfig;
};

// Get data
chrome.storage.sync.get<ExtensionStorage>("configText", (result) => {
    const textarea = configElem;
    configText = result?.configText ?? defaultConfigText;
    textarea.value = configText;
    updateSaveButton();
});
