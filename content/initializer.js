window.browser = (function () {
    return window.msBrowser ||
        window.browser ||
        window.chrome;
})();

//fixme: remove this flag and everything else depending on this variable, if not needed
/**
 *
 * @type {boolean}
 */
const extensionActive = false;

function listenMessage(listener) {
    if (extensionActive) {
        browser.runtime.onMessage.addListener(listener);
    } else {
        listener({start: true});
    }
}

/**
 *
 * @param {Object} message
 * @param {boolean?} dev
 * @return {Promise<*>}
 */
function sendMessage(message, dev) {
    if (dev) {
        message.url = window.location.href;

        message = {
            dev: message
        };
    }

    if (extensionActive) {
        return browser.runtime.sendMessage(message);
    } else {
        console.log("message for background: ", message);
        return Promise.resolve();
    }
}

//fixme: if dom ever changes, this is not valid anymore
/**
 * Annotates each node with their current positions
 * in the node- & element hierarchy.
 */
(function annotateDOM() {
    function annotate() {
        let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let node;

        while (node = walker.nextNode()) {
            let parent = node.parentElement;

            if (parent.nodePosition) {
                node.nodePosition = parent.nodePosition.slice(0);
            } else {
                node.nodePosition = [];
            }

            let nodeIndex = Array.prototype.indexOf.call(parent.childNodes, node);
            node.nodePosition.push(nodeIndex);

            if (node.nodeType === node.ELEMENT_NODE) {
                if (parent.elementPosition) {
                    node.elementPosition = parent.elementPosition.slice(0);
                } else {
                    node.elementPosition = [];
                }
                let elementIndex = Array.prototype.indexOf.call(parent.children, node);
                node.elementPosition.push(elementIndex);
            }
        }
    }

    //annotate first time
    annotate();
})();

function trimSpace(s, trimmed) {
    let replaced = s.replace(/\s+/g, " ");
    return trimmed ? replaced : replaced.trim();
}

function closestCommonAncestor(first, second) {
    if (first === second) {
        return first.parentNode;
    }

    let position = [];
    const max = Math.max(first.elementPosition.length, second.elementPosition.length);

    for (let i = 0; i < max; i++) {
        let firstPosition = first.elementPosition[i];
        let secondPosition = second.elementPosition[i];

        if (firstPosition !== secondPosition) {
            break
        }
        position.push(firstPosition);
    }

    return getNode(position, Node.ELEMENT_NODE);
}

/**
 *
 * @param {Array<number>} position
 * @param {number} type
 * @return {HTMLElement}
 */
function getNode(position, type) {
    const childrenGetter = type === Node.ELEMENT_NODE
        ? node => node.children
        : node => node.childNodes;

    let node = document.body;

    for (let pos of position) {
        let children = childrenGetter(node);
        node = children[pos];
    }
    return node;
}

function isAbove(above, main) {
    if (above === main) {
        return false;
    }

    if (!main) {
        return;
    }

    let abovePosition = above.nodePosition;
    let mainPosition = main.nodePosition;

    for (let i = 0; i < abovePosition.length; i++) {
        let aboveParentPos = abovePosition[i];
        let mainParentPos = mainPosition[i];

        if (aboveParentPos !== mainParentPos) {
            if (aboveParentPos === undefined || mainParentPos === undefined) {
                return false;
            }
            return aboveParentPos < mainParentPos;
        }
    }
}

/**
 * Checks whether the first argument is below the
 * second argument in the dom tree.
 *
 * @param {MetaNode} below
 * @param {MetaNode} main
 * @return {boolean}
 */
function isBelow(below, main) {
    if (below === main) {
        return false;
    }
    let belowPosition = below.nodePosition;
    let mainPosition = main.nodePosition;

    for (let i = 0; i < belowPosition.length; i++) {
        let belowParentPos = belowPosition[i];
        let mainParentPos = mainPosition[i];

        if (belowParentPos !== mainParentPos) {
            if (belowParentPos === undefined || mainParentPos === undefined) {
                return false;
            }
            return belowParentPos > mainParentPos;
        }
    }
}

function isAncestor(node, ancestor) {
    const nodePositions = node.nodePosition;
    return ancestor.nodePosition.every((value, index) => nodePositions[index] === value);
}