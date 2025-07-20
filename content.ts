document.addEventListener("keydown", (event) => {
    console.log("Keydown!!", event.key);
    // Send key press data to the background script
    chrome.runtime.sendMessage({
        type: "keyPress",
        key: event.key,
    });
});
