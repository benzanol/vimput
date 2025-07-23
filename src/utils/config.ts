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
    siteSettings: {
        site: string;
        setting: string;
        value: string;
    }[];
};

export const defaultVinputConfigText = `
# Settings
set InitialMode insert
set OnFocus auto
set MaxRepeat 50
set NormalBlockInsertions true
set VisualBlockInsertions true

# Light background caret colors
set NormalCaretColor #009944
set MotionCaretColor #bb9922
set VisualCaretColor #bb0066
# Dark background caret colors
set NormalDarkCaretColor #33ffaa
set MotionDarkCaretColor #ffdd33
set VisualDarkCaretColor #ff00ff

# Entering normal mode
imap C-q Normal

# Entering insert mode
nmap i Insert
nmap a Right Insert
nmap I LineStart Insert
nmap A LineEnd Insert
nmap o LineEnd Enter Insert
nmap O LineStart Enter Up Insert
nmap s Delete Insert
nmap S LineStart SelectLineEnd Backspace Insert

# Navigation
nmap h Left
nmap j Down
nmap k Up
nmap l Right
nmap b BackwardWord
nmap w ForwardWord
nmap e ForwardWord
nmap ^ LineStart
nmap $ LineEnd
nmap g Top
nmap G Bottom

# Deleting
nmap x Delete
nmap X Backspace
nmap z DeleteWord
nmap Z BackspaceWord

# Miscellaneous
nmap v Visual
nmap V LineStart SelectLineEnd Visual
nmap p Paste
nmap u Undo
nmap U Redo
nmap J LineEnd Delete

# Operators
nmap d operator Cut
nmap c operator Cut Insert
nmap y operator Copy Right
nmap D SelectLineEnd Cut
nmap C SelectLineEnd Cut Insert
nmap Y SelectLineEnd Copy Left

# Visual mode
xmap q ExitSelection Normal
xmap o SwapSelectionDirection Normal
xmap i Left Insert
xmap a Right Insert

xmap c Cut Insert
xmap d Cut Normal
xmap y Copy

# Visual/motion navigation
oxmap h SelectLeft
oxmap j SelectDown
oxmap k SelectUp
oxmap l SelectRight
oxmap b SelectBackwardWord
oxmap w SelectForwardWord
oxmap e SelectForwardWord
oxmap ^ SelectLineStart
oxmap $ SelectLineEnd
oxmap g SelectTop
oxmap G SelectBottom

# Operate on the whole line
omap d LineStart SelectLineEnd
omap c LineStart SelectLineEnd
omap y LineStart SelectLineEnd

# Select the current word
oxmap W BackwardWord SelectForwardWord
# Select everything
oxmap A Top SelectBottom
`;

const parsed = parseConfiguration(defaultVinputConfigText);
if (typeof parsed === "string") throw new Error("Invalid default config: " + parsed);

export const defaultVinputConfig: VinputConfig = parsed;
