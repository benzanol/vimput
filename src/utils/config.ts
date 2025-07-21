import type { CommandName } from "./commands";
import { parseConfiguration } from "./parseConfig";

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
};

export const defaultVinputConfigText = `
imap C-q Normal

nmap i Insert
nmap a Right Insert
nmap S-I BackwardWord Insert
nmap S-A ForwardWord Insert
nmap v Visual

nmap h Left
nmap j Down
nmap k Up
nmap l Right
nmap b BackwardWord
nmap w ForwardWord
nmap e ForwardWord
nmap S-^ LineStart
nmap S-$ LineEnd

nmap x Delete
nmap S-X DeleteWord
nmap z Backspace
nmap S-Z BackspaceWord

nmap u Undo
nmap S-U Redo

nmap p Paste

nmap d operator Cut
nmap c operator Cut Insert
nmap y operator Copy Right

xmap q Normal Right

oxmap h VisualLeft
oxmap j VisualDown
oxmap k VisualUp
oxmap l VisualRight
oxmap b VisualBackwardWord
oxmap w VisualForwardWord
oxmap e VisualForwardWord
oxmap S-^ VisualLineStart
oxmap S-$ VisualLineEnd

xmap i Left Insert
xmap a Right Insert

xmap c Cut Insert
xmap d Cut Normal
xmap y Copy

omap d LineStart VisualLineEnd
omap c LineStart VisualLineEnd
omap y LineStart VisualLineEnd

omap S-W BackwardWord VisualForwardWord
`;

const parsed = parseConfiguration(defaultVinputConfigText);
if (typeof parsed === "string") throw new Error("Invalid default config: " + parsed);

export const defaultVinputConfig: VinputConfig = parsed;
