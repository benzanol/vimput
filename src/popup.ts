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

// ==================== Save data ====================

const mapKeywords: Record<string, VinputState["mode"][]> = {
    nmap: ["normal"],
    imap: ["insert"],
    xmap: ["visual"],
    omap: ["motion"],
    map: ["normal", "visual", "motion"],
    "map!": ["normal", "visual", "motion", "insert"],
};

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
        const segs = lines[i].trim().split(/ \t+/);
        if (segs.length === 0 || segs[0].startsWith("#")) continue;

        // Check if this is a unmapAll statement
        if (segs[0] === "unmapAll") {
            config.insert = {};
            config.normal = {};
            config.visual = {};
            config.motion = {};
            continue;
        }

        // Check if this is a valid map statement
        const modes = mapKeywords[segs[0]];
        if (!modes) return `Line ${i + 1}: Unknown statement type '${segs[0]}'`;
        if (segs.length === 1) return `Line ${i + 1}: Not enough arguments for '${segs[0]}'`;

        const key = segs[1];
        const isOperator = segs[2] === "operator";
        const commands = isOperator ? segs.slice(3) : segs.slice(2);

        // No empty operator
        if (isOperator && commands.length === 0) {
            return `Line ${i + 1}: Empty operator`;
        }

        // Ensure that the commands are valid
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

function onSave() {
    // Save data
    chrome.storage.sync.set({ theme: "dark" }, () => {
        console.log("Theme saved.");
    });
}

// Get data
chrome.storage.sync.get("theme", (result) => {
    console.log("Theme is", result.theme);
});
