import commands from "./commands.js";

const container = document.getElementById("commands");
if (!(container instanceof HTMLElement)) throw new Error("Invalid command container");
container.replaceChildren();

for (const [type, cmds] of Object.entries(commands)) {
    const typeDiv = document.createElement("div");
    typeDiv.className = "command-type";
    typeDiv.textContent = type;
    container.appendChild(typeDiv);

    for (const [name, def] of Object.entries(cmds)) {
        const nameSpan = document.createElement("span");
        nameSpan.textContent = name;

        const keySpan = document.createElement("span");
        keySpan.classList.add("command-key");
        keySpan.textContent = "(" + (def.keys ?? def.mode) + ")";

        const cmdDiv = document.createElement("div");
        cmdDiv.append(nameSpan, keySpan);
        container.appendChild(cmdDiv);
    }
}
