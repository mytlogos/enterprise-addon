//set height of popup after frame has loaded
let frame = document.querySelector("iframe");


let observer;
frame.addEventListener("load", () => {
    observer && observer.disconnect();
    observer = new MutationObserver(() => console.log(frame.contentDocument.body.offsetHeight));

    let config = {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true
    };
    observer.observe(frame.contentDocument.body, config);
});


let loginListener = (oldValue, newValue) => {
    frame.setAttribute("src", newValue ? "popup.html" : "loginPopup.html");
};
let value = false;
// browser.extension.getBackgroundPage().addLoginListener(listener);

window.addEventListener("click", () => {
    loginListener(value, !value);
    value = !value;
});
/*
setInterval(() => {
    listener(value, !value);
    value = !value;
}, 2000);
*/
