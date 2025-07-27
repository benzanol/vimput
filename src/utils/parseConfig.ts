import { CommandName, flattenedCommands } from "./commands";
import z from "zod";

// ==================== Setting Schemas ====================

// Reusable schemas
const booleanString = z
    .string()
    .refine((v) => v === "true" || v === "false", {
        message: "Must be true or false",
    })
    .transform((v) => v === "true");

const positiveIntString = z
    .string()
    .refine(
        (v) => {
            const n = Number(v);
            return Number.isInteger(n) && n >= 1;
        },
        { message: "Must be a positive integer" },
    )
    .transform((v) => Number(v));

const caretColor = z.string().refine(
    (color) => {
        const s = new Option().style;
        s.color = color;
        return s.color !== "";
    },
    {
        message: "Invalid color",
    },
);

const modeString = z.enum(["insert", "normal", "visual", "off"]);

// Object mapping setting names (patterns) to schemas
export const settingSchemas = {
    DefaultMode: modeString,
    DefaultInputMode: modeString,
    VisualModeOnSelect: booleanString,
    AutoSwitchMode: z.enum(["never", "focus", "always"]),

    NormalBlockInsertions: booleanString,
    VisualBlockInsertions: booleanString,

    MaxRepeat: positiveIntString,

    NormalCaretColor: caretColor,
    VisualCaretColor: caretColor,
    InsertCaretColor: caretColor,
    MotionCaretColor: caretColor,
    NormalDarkCaretColor: caretColor,
    VisualDarkCaretColor: caretColor,
    InsertDarkCaretColor: caretColor,
    MotionDarkCaretColor: caretColor,

    Verbose: booleanString,
} as const;

type SettingsSchemas = typeof settingSchemas;
type SettingsType = Partial<{ [S in keyof SettingsSchemas]: z.output<SettingsSchemas[S]> }>;

// ==================== Parsing ====================

// An action can either be a 'command', which executes normally, or an
// 'operator', which first waits for a motion, and then executes.
type VinputAction = { type: "command" | "operator"; commands: CommandName[] };

// A mapping from keybindings to lists of commands
type VinputConfigKeymap = Record<string, VinputAction>;
export type VinputConfig = {
    insert: VinputConfigKeymap;
    normal: VinputConfigKeymap;
    visual: VinputConfigKeymap;
    motion: VinputConfigKeymap;
    settings: SettingsType;
    siteSettings: { site: string; setting: string; value: any }[];
};

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
export function parseConfiguration(text: string): VinputConfig | string {
    // Create a deep (enough) copy of the default config
    const config: VinputConfig = {
        insert: {},
        normal: {},
        visual: {},
        motion: {},
        settings: {},
        siteSettings: [],
    };

    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const segs = lines[i].split(/[ \t]+/).filter((s) => s);
        if (segs.length === 0 || segs[0].startsWith("#")) continue;

        if (segs[0] === "unmapAll") {
            if (segs.length !== 1) return `Line ${i + 1}: unmapAll does not take any arguments`;

            config.insert = {};
            config.normal = {};
            config.visual = {};
            config.motion = {};
            continue;
        }

        // Check if this is a set statement
        if (segs[0] === "set" || segs[0] === "seton") {
            if (segs[0] === "set") {
                if (segs.length < 3) return `Line ${i + 1}: Not enough arguments for set`;
                if (segs.length > 3) return `Line ${i + 1}: Too many arguments for set`;
            } else {
                if (segs.length % 2 === 1) return `Line ${i + 1}: Each setting must have a value`;
            }

            // Loop through settings for setOn
            for (let j = segs[0] === "set" ? 1 : 2; j < segs.length; j += 2) {
                const setting = segs[j];
                const value = segs[j + 1];
                const schema = (settingSchemas as Record<string, z.Schema>)[setting];
                if (!schema) return `Line ${i + 1}: Invalid setting '${setting}'`;

                const parsed = schema.safeParse(value);
                if (!parsed.success) {
                    return `Line ${i + 1}: ${parsed.error}`;
                } else if (segs[0] === "set") {
                    (config.settings as any)[setting] = parsed.data;
                } else {
                    config.siteSettings.push({ setting, value: parsed.data, site: segs[1] });
                }
            }
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
