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

const internalPopupClass = "enterprise-popup";

function isInternalPopup(node) {
    while (node) {
        if (node.className === internalPopupClass) {
            return true;
        }
        node = node.parentElement;
    }
    return false;
}


/**
 * Annotates each node with their current positions
 * in the node- & element hierarchy.
 */
let Ready = (function annotateDOM() {
    let ready;
    let readyFunction;

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

        ready = true;
        readyFunction && readyFunction();
    }

    //annotate first time, when page is ready
    if (document.readyState !== "complete") {
        window.addEventListener("load", annotate);
    } else {
        annotate();
    }

    let timeoutId;

    function invalidate(doAnnotation = true) {
        ready = false;

        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        if (doAnnotation) {
            //if dom was changed wait for 500ms to make sure no further change is made
            timeoutId = setTimeout(annotate, 500);
        } else if (readyFunction) {
            timeoutId = setTimeout(readyFunction, 500);
        }
    }

    const domObserver = new MutationObserver(records => {
        //find a record where the nodes where added, but not by this extension itself
        let record = records.find(value => value.addedNodes.length && !findLikeArray(value.addedNodes, isInternalPopup));

        //if dom is still the same, return
        if (!record) {
            return;
        }
        invalidate(true);
    });

    domObserver.observe(document.body, {subtree: true, childList: true});

    let oldTitle = document.title;
    //sometimes the title (which is important for metadata extraction)
    //changes by network response, so run queue function again, but no annotation
    setInterval(() => {
        if (oldTitle !== document.title) {
            oldTitle = document.title;
            invalidate();
        }
    }, 200);

    return {

        /**
         * Callback which will be called after 500ms timeOut,
         * which will be refreshed every time the dom changed after 500ms.
         *
         * @param callback
         */
        set onReady(callback) {
            readyFunction = callback;
            ready && callback && callback();
        }
    };
})();

function trimSpace(s) {
    return s.replace(/\s+/g, " ").trim();
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

function findLikeArray(arrayLike, findCallback) {
    for (let item of arrayLike) {
        if (findCallback(item)) {
            return item;
        }
    }
}

function isAncestor(node, ancestor) {
    const nodePositions = node.nodePosition;
    return ancestor.nodePosition.every((value, index) => nodePositions[index] === value);
}

function singleMultiAction(value, action) {
    if (Array.isArray(value)) {
        for (let item of value) {
            action(item);
        }
    } else {
        action(value);
    }
}

/**
 *
 * Returns the a generator, which generates
 * a sequence of numbers.
 *
 * @return {IterableIterator<number>}
 */
function* idGenerator() {
    let id = 1;
    while (true) {
        yield id++;
    }
}