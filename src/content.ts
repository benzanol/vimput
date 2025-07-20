console.log("HI!!!!");
document.addEventListener("keydown", (event) => {
    // console.log("Keydown!!", event.key);
    // Send key press data to the background script
    console.error("Hi!");
    chrome.runtime.sendMessage({
        type: "keyPress",
        key: event.key,
    });
});
