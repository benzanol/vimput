function pressKeys(keys: Key[]) {
    chrome.runtime.sendMessage(null, { type: "pressKeys", keys });
}

window.addEventListener("keypress", function (event) {
    console.log("Key:", event.key);
    pressKeys(["Control", "ArrowLeft"]);
});
