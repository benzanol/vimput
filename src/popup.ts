import { CommandName, commandTypes, flattenedCommands } from "./commands.js";
import defaultVinputConfig from "./config.js";
import type { VinputConfig, VinputState } from "./content.js";

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

const mapKeywords: Record<string, VinputState["mode"][]> = {
    nmap: ["normal"],
    imap: ["insert"],
    xmap: ["visual"],
    omap: ["motion"],
    map: ["normal", "visual", "motion"],
    "map!": ["normal", "visual", "motion", "insert"],
};

function setUserMessage(message: string, error: boolean = false) {
    document.getElementById("success")!.textContent = error ? "" : message;
    document.getElementById("error")!.textContent = error ? message : "";
}

// Parse the vinput config, and return an error message if parsing failed
function parseConfiguration(text: string): VinputConfig | string {
    // Create a deep (enough) copy of the default config
    const config: VinputConfig = {
        insert: { ...defaultVinputConfig.insert },
        normal: { ...defaultVinputConfig.normal },
        visual: { ...defaultVinputConfig.visual },
        motion: { ...defaultVinputConfig.motion },
    };

    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const segs = lines[i].split(/[ \t]+/).filter((s) => s);
        console.log(segs);
        if (segs.length === 0 || segs[0].startsWith("#")) continue;
        console.log(2);

        // Check if this is a unmapAll statement
        if (segs[0] === "unmapAll") {
            config.insert = {};
            config.normal = {};
            config.visual = {};
            config.motion = {};
            continue;
        }

        console.log(3);
        // Check if this is a valid map statement
        const modes = mapKeywords[segs[0]];
        if (!modes) return `Line ${i + 1}: Unknown statement type '${segs[0]}'`;
        if (segs.length === 1) return `Line ${i + 1}: Not enough arguments for '${segs[0]}'`;
        console.log(4);

        const key = segs[1];
        const isOperator = segs[2] === "operator";
        const commands = isOperator ? segs.slice(3) : segs.slice(2);
        console.log(5);

        // No empty operator
        if (isOperator && commands.length === 0) {
            return `Line ${i + 1}: Empty operator`;
        }

        // Ensure that the commands are valid
        console.log(commands);
        for (const cmd of commands) {
            if (!(cmd in flattenedCommands)) {
                return `Line ${i + 1}: Unknown command ${cmd}`;
            }
        }

        // Update the modes
        for (const mode of modes) {
            if (commands.length === 0) {
                delete config[mode][key];
            } else {
                config[mode][key] = {
                    type: isOperator ? "operator" : "command",
                    commands: commands as CommandName[],
                };
            }
        }
    }

    return config;
}

// Add save button listener
document.getElementById("save")!.addEventListener("click", async () => {
    try {
        const textarea = document.getElementById("config") as HTMLTextAreaElement;
        const output = parseConfiguration(textarea.value);

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

type ExtensionStorage = {
    configText?: string;
    config?: VinputConfig;
};

// Get data
chrome.storage.sync.get<ExtensionStorage>("configText", (result) => {
    const textarea = document.getElementById("config") as HTMLTextAreaElement;
    textarea.value = result.configText ?? "";
});
