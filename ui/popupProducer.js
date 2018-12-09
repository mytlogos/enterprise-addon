//set height of popup after frame has loaded
let frame = document.querySelector("iframe");

let listener;

frame.addEventListener("load", () => {
    listener && listener.dispose();
    listener = new SizeListener(frame.contentWindow);
    listener.listen(() => {
        frame.style.height = frame.contentDocument.body.scrollHeight + "px";
        frame.style.width = frame.contentDocument.body.scrollWidth + "px";
    });
});

browser.runtime
    .sendMessage({popup: {loggedIn: true}})
    .then(response => frame.setAttribute("src", response ? "loggedInPopup.html" : "loginPopup.html"));

/**
 *
 * @param {Window} window
 * @constructor
 */
function SizeListener(window) {
    let callbacks = [];
    let disposed = false;
    let oldHeight = 0;
    let oldWidth = 0;

    (function observe() {
        if (disposed) {
            return;
        }
        let newHeight = window.document.body.scrollHeight;
        let newWidth = window.document.body.scrollWidth;

        if (newHeight !== oldHeight) {
            callbacks.forEach(value => value());
            oldHeight = newHeight;
        } else if (newWidth !== oldWidth) {
            callbacks.forEach(value => value());
            oldWidth = newWidth;
        }
        requestAnimationFrame(observe);
    })();

    this.listen = callback => callbacks.push(callback);
    this.dispose = () => (disposed = true) && (callbacks.length = 0);
}

