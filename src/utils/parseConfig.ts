import { CommandName, flattenedCommands } from "./commands";
import { VinputConfig } from "./config";

const mapKeywords: Record<string, ("insert" | "normal" | "visual" | "motion")[]> = {
    nmap: ["normal"],
    imap: ["insert"],
    xmap: ["visual"],
    omap: ["motion"],
    oxmap: ["motion", "visual"],
    map: ["normal", "visual", "motion"],
    "map!": ["normal", "visual", "motion", "insert"],
};

function isValidColor(color: string): boolean {
    const s = new Option().style;
    s.color = color;
    return s.color !== "";
}

// Parse the vinput config, and return an error message if parsing failed
export function parseConfiguration(text: string, def?: VinputConfig): VinputConfig | string {
    // Create a deep (enough) copy of the default config
    const config: VinputConfig = {
        insert: { ...def?.insert },
        normal: { ...def?.normal },
        visual: { ...def?.visual },
        motion: { ...def?.motion },
        settings: { ...def?.settings },
    };

    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const segs = lines[i].split(/[ \t]+/).filter((s) => s);
        if (segs.length === 0 || segs[0].startsWith("#")) continue;

        // Check if this is a unmapAll statement
        if (segs[0] === "unmapAll") {
            config.insert = {};
            config.normal = {};
            config.visual = {};
            config.motion = {};
            continue;
        }

        // Check if this is a set statement
        if (segs[0] === "set") {
            if (segs.length < 3) return `Line ${i + 1}: Not enough arguments for set`;
            if (segs.length > 3) return `Line ${i + 1}: Too many arguments for set`;

            if (segs[1] === "DefaultMode") {
                if (!["insert", "normal", "visual"].includes(segs[2])) {
                    return `Line ${i + 1}: Default mode must be insert, normal, or visual.`;
                }
            } else if (segs[1].match(/^(Normal|Visual|Insert|Motion)CaretColor$/)) {
                if (!isValidColor(segs[2])) return `Line ${i + 1}: Invalid color '${segs[2]}'`;
            } else {
                return `Line ${i + 1}: Invalid setting '${segs[1]}'`;
            }

            config.settings[segs[1]] = segs[2];
            continue;
        }

        // Check if this is a valid map statement
        const modes = mapKeywords[segs[0]];
        if (!modes) return `Line ${i + 1}: Unknown statement type '${segs[0]}'`;
        if (segs.length === 1) return `Line ${i + 1}: Not enough arguments for '${segs[0]}'`;

        // Get the key into a standardized format
        const keySegs = segs[1].split("-");
        const keyBase = keySegs[keySegs.length - 1];
        const keyMods = keySegs.slice(0, keySegs.length - 1);
        const invalidMod = keyMods.find((mod) => !mod.match(/^[ACS]$/));
        if (invalidMod) return `Line ${i + 1}: Invalid key modifier '${invalidMod}'`;

        // Add a shift prefix to certain keys
        const missingShift = keyBase.match(/[A-Z~!@#$%^&*()_+{}|:"<>?]/) && !keyMods.includes("S");
        if (missingShift) keyMods.push("S");

        // Recombine the key segments
        const key = [...keyMods.sort(), keyBase].join("-");

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
