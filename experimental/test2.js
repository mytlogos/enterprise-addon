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

function lineNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: node => {
            let tag = node.parentElement.tagName.toLowerCase();
            return tag !== "script" && tag !== "style" && tag !== "noscript" ?
                NodeFilter.FILTER_ACCEPT :
                NodeFilter.FILTER_REJECT;
        }
    });

    const lines = document.body.innerText
        .split("\n")
        .map(s => s.trim())
        .filter(s => s);

    (function normalizeLines() {
        let textNode;
        let wordSplitter = /\s/;
        let content = /\w/;

        while (textNode = walker.nextNode()) {
            let textTransform = window.getComputedStyle(textNode.parentElement).textTransform;
            let text;

            if (!content.test(textNode.data)) {
                continue;
            }

            if (textTransform === "uppercase") {
                text = textNode.data.toUpperCase();

            } else if (textTransform === "lowercase") {
                text = textNode.data.toLowerCase();

            } else if (textTransform === "capitalize") {
                text = textNode.data.split(wordSplitter).map(s => s[0].toUpperCase() + s.substring(1)).join(" ");
            }

            if (text) {
                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i];

                    if (line === text) {
                        lines[i] = textNode.data;
                    }
                }
            }
        }
    })();

    function findNode(line) {
        let node;

        while (node = walker.nextNode()) {
            if (node.data.includes(line)) {
                break;
            } else if (line.includes(node.data)) {
                let found;
                while ((node = node.parentElement) && node.tagName !== "BODY") {
                    if (node.innerText.includes(line)) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    break;
                }
            }
        }
        return node;
    }

    const lineNodes = [];
    walker.currentNode = document.body;

    for (let index = 0; index < lines.length; index++) {
        let line = lines[index];
        let node = findNode(line);

        if (node) {
            lineNodes.push([line, node, index]);
        } else {
            lines.splice(index, 1);
            index--;
        }
    }

    return lineNodes;
}

const annotated = new Set();

function annotateDOM() {
    let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let node;

    while (node = walker.nextNode()) {
        node.nodePosition = [];
        let parent = node.parentElement;

        if (parent.tagName !== "BODY") {
            node.nodePosition.push(...parent.nodePosition);
        }

        let nodeIndex = Array.from(parent.childNodes).indexOf(node);
        node.nodePosition.push(nodeIndex);


        if (node.nodeType === Node.ELEMENT_NODE) {
            node.elementPosition = [];

            if (parent.tagName !== "BODY") {
                node.elementPosition.push(...parent.elementPosition);
            }
            let elementIndex = Array.from(parent.children).indexOf(node);
            node.elementPosition.push(elementIndex);
        }

        annotated.add(node);
    }
}


try {
    browser.runtime.onMessage.addListener(msg => {
        try {
            if (msg) {
                annotateDOM();
                console.table(lineNodes());
            }
        } catch (e) {
            console.log(e);
        }
    });
} catch (e) {
    console.log(e);
}