# vimput

Add real vim keybindings to chrome for editing text.

Unlike existing extensions which enable vim keys for page navigation,
"vimput" allows you to navigate within and edit browser text fields.

By default, the extension starts in "off" mode, and switches to
"insert" mode whenever a text field is selected (but this behavior can
be customized). Since "Escape" is already used by the browser, "Alt+q"
is the default keybinding to enter normal mode. Once in normal mode,
you will be able to use many of vim's default keybindings.

The full list of keybindings, as well as settings controlling the
extension's behavior, can be viewed and customized by clicking on the
extension icon.


## Implementation

The extension is implemented by intercepting all keyboard events and
replacing them with new ones. For example, if you press the l key
while in normal mode, the extension will intercept it, and then send
the page an ArrowRight event in its place. Similarly, if you were in
visual mode, it would send a Shift+ArrowRight event in order to expand
the selection to the right.

This should give a general idea of what the extension is and is not
capable of. For example, it is possible to simulate "0" by pressing
"Home", but there is no way to simulate the "^" key, since the browser
does not have a key to jump to the beginning of a line's text. The
extension then implements repeated keys by simply performing the
associated key presses a bunch of times.

The motion/operator system is a special case. When you press an
operator, the extension will wait for the user to input a valid
motion. The motion will then be run first, and select a region of
text. The operator will then act on the selected text. For example, if
you press "dd", the extension will send "Home" to go to the beginning
of the line, "Shift+End" to select to the end of the line, and finally
"Control+x" to cut that region.




