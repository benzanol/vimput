<style>
    .doc-heading {
        font-weight: 600;
        font-size: 1.2em;
        margin: 0.8em 0 0.4em 0;
    }
    .doc-statement {
        font-family: monospace;
        font-weight: 500;
        font-size: 1.2em;
        margin: 0.8em 0 0.3em 0;
    }
    #commands {
        column-count: 3;
        column-gap: 1em;
    }
</style>

<div class="doc-heading">Commands</div>
<div id="commands"></div>

<div class="doc-heading">Mapping keys</div>

<div class="doc-statement">nmap/xmap/omap/imap/oxmap/map/map! KEY COMMAND1 COMMAND2 ...</div>
<p>Map KEY to execute one or more commands (see next section for valid commands.)</p>
<p>
    nmap, xmap, omap, and imap bind the key in normal, visual, operator-pending, and insert mode
    respectively. oxmap binds the key in operator and visual mode, map binds the key in all but
    insert mode, and map! binds the key in every mode.
</p>
<p>
    KEY must have the form [A-][C-][S-]KEYNAME, where KEYNAME follows the KeyboardEvent.key
    specification. For examples of keys, see the default configuration. To find out the name for a
    particular key, enable verbose mode, open the browser console, and press the key you want to
    bind.
</p>

<div class="doc-statement">nmap/xmap/imap KEY operator CMD1 CMD2 ...</div>
<p>
    Map KEY to execute a new operator. Before executing the operator, the user must perform a
    motion. This motion will select a region of text, which the operator must then operate on using
    the commands specified.
</p>

<div class="doc-heading">Controlling the default mode</div>

<div class="doc-statement">set Default[Input]Mode insert/normal/visual/off</div>
<p>DefaultMode is the initial mode when opening a new tab.</p>
<p>
    If DefaultInputMode is set, then this will be the default mode for inputting text (when a
    textarea or input element is selected).
</p>

<div class="doc-statement">set AutoSwitchMode never/focus/always</div>
<p>When to automatically switch modes.</p>
<p>The mode that will be switched to is detemined by DefaultMode and DefaultInputMode.</p>
<p>If "focus", then switch modes when entering/exiting an input field.</p>
<p>
    If "always", then switch modes whenever the user makes an action external to the plugin (ie,
    clicking around inside of the current text field.)
</p>

<div class="doc-statement">set VisualModeOnSelect true/false</div>
<p>Enable visual mode when the user selects text.</p>

<div class="doc-heading">Blocking extraneous events</div>

<div class="doc-statement">set [Normal/Visual]BlockInsertions true/false</div>
<p>When true, block all unmapped non-modifier keys in the specified mode.</p>

<div class="doc-heading">Appearance</div>

<div class="doc-statement">set [Insert/Normal/Visual/Motion]CaretColor COLOR/unset</div>
<p>Set the color of the caret when in a particular mode.</p>

<div class="doc-statement">set [Insert/Normal/Visual/Motion]DarkCaretColor COLOR/unset</div>
<p>Specify an alternate caret color for dark backgrounds.</p>

<div class="doc-heading">Miscellaneous</div>

<div class="doc-statement">set MaxRepeat NUMBER</div>
<p>Set the maximum number of times for a key to repeat.</p>

<div class="doc-statement">set Verbose true/false</div>
<p>Enable/disable verbose logging.</p>

<div class="doc-heading">Site-specific configuration</div>

<div class="doc-statement">seton SITE SETTING1 VALUE1 SETTING2 VALUE2 ...</div>
<p>Customize one or more settings for a particular site.</p>
<p>
    SITE is a javascript regexp that must fully match the url of the site in question (not including
    the http[s]:// prefix).
</p>
<p>
    For example, "seton youtube.com/.* DefaultMode off DefaultInputMode off" would entirely disable
    the plugin on all youtube sites.
</p>
<p>If multiple setOn statements match the same url, the LAST statement will take priority.</p>
