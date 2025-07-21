import type { VinputConfig } from "./content";

const defaultVinputConfig: VinputConfig = {
    insert: {
        "C-q": { type: "command", commands: ["Normal"] },
    },
    normal: {
        i: { type: "command", commands: ["Insert"] },
        a: { type: "command", commands: ["Right", "Insert"] },
        "S-I": { type: "command", commands: ["BackwardWord", "Insert"] },
        "S-A": { type: "command", commands: ["ForwardWord", "Insert"] },
        v: { type: "command", commands: ["Visual"] },

        h: { type: "command", commands: ["Left"] },
        j: { type: "command", commands: ["Down"] },
        k: { type: "command", commands: ["Up"] },
        l: { type: "command", commands: ["Right"] },
        b: { type: "command", commands: ["BackwardWord"] },
        w: { type: "command", commands: ["ForwardWord"] },
        e: { type: "command", commands: ["ForwardWord"] },
        "S-^": { type: "command", commands: ["LineStart"] },
        "S-$": { type: "command", commands: ["LineEnd"] },

        x: { type: "command", commands: ["Delete"] },
        "S-X": { type: "command", commands: ["DeleteWord"] },
        z: { type: "command", commands: ["Backspace"] },
        "S-Z": { type: "command", commands: ["BackspaceWord"] },

        u: { type: "command", commands: ["Undo"] },
        "S-U": { type: "command", commands: ["Redo"] },

        p: { type: "command", commands: ["Paste"] },

        d: { type: "operator", commands: ["Cut"] },
        c: { type: "operator", commands: ["Cut", "Insert"] },
        y: { type: "operator", commands: ["Copy", "Right"] },
    },
    visual: {
        q: { type: "command", commands: ["Normal", "Right"] },

        h: { type: "command", commands: ["VisualLeft"] },
        j: { type: "command", commands: ["VisualDown"] },
        k: { type: "command", commands: ["VisualUp"] },
        l: { type: "command", commands: ["VisualRight"] },
        b: { type: "command", commands: ["VisualBackwardWord"] },
        w: { type: "command", commands: ["VisualForwardWord"] },
        e: { type: "command", commands: ["VisualForwardWord"] },
        "S-^": { type: "command", commands: ["VisualLineStart"] },
        "S-$": { type: "command", commands: ["VisualLineEnd"] },

        i: { type: "command", commands: ["Left", "Insert"] },
        a: { type: "command", commands: ["Right", "Insert"] },

        c: { type: "command", commands: ["Cut", "Insert"] },
        d: { type: "command", commands: ["Cut", "Normal"] },
        y: { type: "command", commands: ["Copy"] },
    },
    motion: {
        h: { type: "command", commands: ["VisualLeft"] },
        j: { type: "command", commands: ["VisualDown"] },
        k: { type: "command", commands: ["VisualUp"] },
        l: { type: "command", commands: ["VisualRight"] },
        b: { type: "command", commands: ["VisualBackwardWord"] },
        w: { type: "command", commands: ["VisualForwardWord"] },
        e: { type: "command", commands: ["VisualForwardWord"] },
        "S-^": { type: "command", commands: ["VisualLineStart"] },
        "S-$": { type: "command", commands: ["VisualLineEnd"] },

        d: { type: "command", commands: ["LineStart", "VisualLineEnd"] },
        c: { type: "command", commands: ["LineStart", "VisualLineEnd"] },
        y: { type: "command", commands: ["LineStart", "VisualLineEnd"] },

        "S-W": { type: "command", commands: ["BackwardWord", "VisualForwardWord"] },
    },
};

export default defaultVinputConfig;
