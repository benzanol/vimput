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
    settings: Record<string, string>;
};

export const defaultVinputConfigText = `
# Start in insert mode
set DefaultMode insert

# Entering normal mode
imap C-q Normal

# Entering insert mode
nmap i Insert
nmap a Right Insert
nmap S-I LineStart Insert
nmap S-A LineEnd Insert
nmap o LineEnd Enter Insert
nmap S-O LineStart Enter Up Insert
nmap s Delete Insert
nmap S-S LineStart VisualLineEnd Backspace Insert

# Navigation
nmap h Left
nmap j Down
nmap k Up
nmap l Right
nmap b BackwardWord
nmap w ForwardWord
nmap e ForwardWord
nmap S-^ LineStart
nmap S-$ LineEnd

# Deleting
nmap x Delete
nmap S-X Backspace
nmap z DeleteWord
nmap S-Z BackspaceWord

# Miscellaneous
nmap v Visual
nmap v LineStart VisualLineEnd Visual
nmap p Paste
nmap u Undo
nmap S-U Redo
nmap S-J LineEnd Delete

# Operators
nmap d operator Cut
nmap c operator Cut Insert
nmap y operator Copy Right
nmap S-D VisualLineEnd Cut
nmap S-C VisualLineEnd Cut Insert
nmap S-Y VisualLineEnd Copy Left

# Exiting visual mode
xmap q Right Normal
xmap i Left Insert
xmap a Right Insert

xmap c Cut Insert
xmap d Cut Normal
xmap y Copy

# Visual/motion navigation
oxmap h VisualLeft
oxmap j VisualDown
oxmap k VisualUp
oxmap l VisualRight
oxmap b VisualBackwardWord
oxmap w VisualForwardWord
oxmap e VisualForwardWord
oxmap S-^ VisualLineStart
oxmap S-$ VisualLineEnd

# Operate on the whole line
omap d LineStart VisualLineEnd
omap c LineStart VisualLineEnd
omap y LineStart VisualLineEnd

# Operate on the current word
omap S-W BackwardWord VisualForwardWord
`;

const parsed = parseConfiguration(defaultVinputConfigText);
if (typeof parsed === "string") throw new Error("Invalid default config: " + parsed);

export const defaultVinputConfig: VinputConfig = parsed;
