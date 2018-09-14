/**
 * Highlights an Element and scroll it into view or removes previous highlight.
 *
 * Copied from: https://stackoverflow.com/a/1390259/9492864
 *
 * @param {HTMLElement} element
 */
function highlight(element) {
    let div = highlight.div; // only highlight one element per page

    if (element === null) { // remove highlight via `highlight(null)`
        div.parentNode && div.parentNode.removeChild(div);
        return;
    }

    let width = element.offsetWidth,
        height = element.offsetHeight;

    div.style.width = width + 'px';
    div.style.height = height + 'px';

    element.offsetParent.appendChild(div);

    div.style.left = element.offsetLeft + (width - div.offsetWidth) / 2 + 'px';
    div.style.top = element.offsetTop + (height - div.offsetHeight) / 2 + 'px';
    // element.scrollIntoView();
}

highlight.div = document.createElement('div');
highlight.div.style.position = "absolute";
highlight.div.style.border = '5px solid red';


browser.runtime.onMessage.addListener(msg => {
    if (msg.flasher) {
        console.log(msg.flasher);
        if (msg.flasher.selector) {
            let element = document.querySelector(msg.flasher.selector);
            highlight(element);
        } else {
            highlight(null);
        }
    }
});