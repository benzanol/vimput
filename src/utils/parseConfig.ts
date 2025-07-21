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

// Parse the vinput config, and return an error message if parsing failed
export function parseConfiguration(text: string, def?: VinputConfig): VinputConfig | string {
    // Create a deep (enough) copy of the default config
    const config: VinputConfig = {
        insert: { ...def?.insert },
        normal: { ...def?.normal },
        visual: { ...def?.visual },
        motion: { ...def?.motion },
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
