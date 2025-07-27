import { parseConfiguration, VimputConfig } from "./parseConfig";

export const defaultConfigText: string = `
# Keep the extension off by default, but enter insert mode when selecting an input field
set DefaultMode off
set DefaultInputMode insert
set AutoSwitchMode always

# Switch to visual mode when selecting text
set VisualModeOnSelect false

# Block unbound keys in normal/visual mode
set NormalBlockInsertions true
set VisualBlockInsertions true

# Repeat at most 50 times
set MaxRepeat 50

# Caret color for light backgrounds
set NormalCaretColor #094
set MotionCaretColor #b92
set VisualCaretColor #b06

# Caret color for dark backgrounds
set NormalDarkCaretColor #3fa
set MotionDarkCaretColor #fd3
set VisualDarkCaretColor #f0f

# Entering normal mode
imap A-q Normal
xmap q ExitSelection Normal
xmap A-q ExitSelection Normal

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
nmap p LineEnd Enter Paste
nmap P Paste
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
xmap o SwapSelectionDirection
xmap i Left Insert
xmap a Right Insert

xmap c Cut Insert
xmap d Cut Normal
xmap y Copy ExitSelection Normal

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
`.trimStart();

const parsed = parseConfiguration(defaultConfigText);
if (typeof parsed === "string") throw new Error("Invalid default config: " + parsed);

export const defaultConfig: VimputConfig = parsed;
