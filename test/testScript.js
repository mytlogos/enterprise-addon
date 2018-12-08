/**
 *
 * @param {HTMLElement} element
 */
function innerText(element) {
    let skipNodes = {
        "noscript": 1,
        "script": 1,
        "style": 1,
        "svg": 1,
    };
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, {
        acceptNode: node =>
            node.tagName.toLowerCase() in skipNodes
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT
    });

    let node;

    while (node = walker.nextNode()) {

    }
}
