let root;
let url;
let current;

/**
 *
 * @param {{current: any, parents: any}} content
 */
function updateTree(content) {
    let parents = content.parents;
    let parent = parents[0];

    let item = new TreeItem(content.current, parent);
    current = item;

    //does not accept first generation items (no parents)
    if (!parents.length) {
        return
    }

    root.appendChild(item, parent.id);

    let itemAncestor = root;

    //update the items from top down to direct parent
    parents.reverse().forEach((value, index, array) => {
        if (itemAncestor.id !== value.id) {
            throw Error("mismatching tree structure");
        }

        itemAncestor.update(value);

        //don't search for next matching TreeItem if this item is the last one
        let nextIndex = index + 1;
        if (nextIndex >= parents.length) {
            return
        }

        let notFound = true;
        let nextParent = array[nextIndex];

        for (let child of itemAncestor.children) {
            if (child.id === nextParent.id) {
                notFound = false;
                itemAncestor = child;
            }
        }
        if (notFound) {
            throw Error("mismatching tree structure");
        }
    });
}

function setRoot() {
    root = new TreeItem({id: 0, scoreAble: false, tagName: "body"});
    Animator.render(root);
}

class TreeItem {

    constructor(content) {
        this.children = [];
        this.history = [];
        this.parent = undefined;
        this.rendered = false;

        const zeroState = Object.assign({}, content);
        zeroState.contentScore = 0;
        this.history.push(zeroState);
        this.history.push(content);
        this.historyPoint = 0;
    }

    appendChild(item, id) {
        let descendant = this.getDescendant(id);
        item.parent = descendant;
        descendant.children.push(item);
        history.doHistory(item);
        return true;
    }

    update(content) {
        if (this.id === 0) {
            return;
        }
        this.history.push(content);
    }

    getDescendant(id) {
        if (this.id === id) {
            return this;
        }

        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];

            //if there is at least one more child
            if (i < this.children.length - 1) {
                let nextChild = this.children[i + 1];

                //if id is smaller than the next child, the descendant is (/in) current child
                if (id < nextChild.id) {
                    return child.getDescendant(id);
                }
            } else {
                return child.getDescendant(id);
            }
        }
        throw Error(`no item with such id: ${id} in this tree`);
    }

    getParents() {
        let parents = [];
        let current = this;

        while (current = current.parent) {
            parents.push(current);
        }
        return parents;
    }

    get siblingIndex() {
        return this.parent && this.parent.children.indexOf(this);
    }

    sibling(index) {
        return this.parent.children[index];
    }

    get siblingLength() {
        return this.parent && this.parent.children.length || 0;
    }

    get id() {
        return this.info.id;
    }

    get info() {
        return this.history[this.historyPoint];
    }

    get ownInfo() {
        return this.history[1];
    }

    nextPoint() {
        this.historyPoint += 1;
    }

    previousPoint() {
        this.historyPoint -= 1;
    }

    presentPoint() {
        this.historyPoint(this.history.length);
    }

    zeroPoint() {
        this.historyPoint(0);
    }

    set historyPoint(point) {
        if (point >= this.history.length) {
            point = this.history.length - 1;
        } else if (point < 0) {
            point = 0;
        }
        this._historyPoint = point;
    }

    get historyPoint() {
        return this._historyPoint;
    }

    get latestInfo() {
        return this.history[this.history.length - 1];
    }

    forEach(value_fn) {
        this.children.forEach(value => {
            value_fn(value);
            value.forEach(value_fn);
        });
    }
}

/**
 *
 */
const history = {
    //-1 is the starting point
    currentPoint: -1,
    pause: "pause",
    play: "play",
    reset: "reset",
    mode: "pause",
    past: [],
    direction: "forwarding",
    forwarding: "forwarding",
    backWarding: "backWarding",

    doHistory(item) {
        // Animator.render(item);
        this.past.push({id: item.id});
    },

    async playHistory() {
        if (!root) {
            return;
        }

        this.mode = this.play;
        while (this.mode === this.play) {
            this.forward();
            await delay();
        }
    },

    pauseHistory() {
        this.mode = this.pause;
    },

    stopHistory() {
        if (!root) {
            return;
        }

        this.pauseHistory();
        this.currentPoint = -1;
        root.forEach(item => {
            item.historyPoint = 0;
            Animator.update(item.info);
        });
        Animator.clearHighlight();
    },

    setItem(visible) {
        const itemId = this.past[this.currentPoint].id;

        const item = root.getDescendant(itemId);

        if (!item.rendered) {
            Animator.render(item);
        }

        if (visible) {
            Animator.highlightNode(itemId);
        }
    },

    forward(visible = true) {
        this.direction = this.forwarding;

        if (this.currentPoint + 1 >= this.past.length || this.mode === this.reset) {
            return;
        }
        this.currentPoint += 1;

        this.setItem(visible);

        const itemId = this.past[this.currentPoint].id;

        let parent = root.getDescendant(itemId);

        while (parent) {
            parent.nextPoint();
            Animator.update(parent.info);

            parent = parent.parent;
        }
    },

    forwardHistory() {
        if (!root) {
            return;
        }

        this.pauseHistory();
        this.forward();
    },

    backwardHistory(visible = true) {
        if (!root) {
            return;
        }

        this.pauseHistory();
        this.direction = this.backWarding;

        //you cant go beyond the past (starting point)
        if (this.currentPoint <= 0) {
            const firstChild = root.children[0];

            if (firstChild) {
                firstChild.previousPoint();
                Animator.update(firstChild.info);
            }

            this.currentPoint = -1;
            Animator.clearHighlight();
            return;
        }

        this.currentPoint -= 1;

        this.setItem(visible);

        const itemId = this.past[this.currentPoint + 1].id;

        let parent = root.getDescendant(itemId);

        while (parent) {
            parent.previousPoint();
            Animator.update(parent.info);

            parent = parent.parent;
        }
    },

    setCurrent(id) {
        //zero is reserved for body, so setting it
        // is equivalent to calling stopHistory
        if (id === 0) {
            this.stopHistory();
        }
        // const point = this.findPoint(id);
        const point = id - 1;

        if (point == null) {
            throw Error(`no history involving this id ${id}`);
        }
        this.currentPoint = point;

        let pointChanger;

        let predicate;
        let condition;
        let startFn;

        if (this.currentPoint < 0 || point > this.currentPoint) {
            predicate = siblingIndex => siblingIndex > 0;

            condition = (i, siblingIndex) => i < siblingIndex;

            pointChanger = item => item.presentPoint();
        } else if (point < this.currentPoint) {
            predicate = (siblingIndex, length) => siblingIndex < length;

            startFn = siblingIndex => siblingIndex + 1;
            condition = (i, _, length) => i < length;

            pointChanger = item => item.zeroPoint();
        } else {
            //point is the same as currentPoint, so just return
            return;
        }

        let item = root.getDescendant(id);

        Animator.startTransaction();

        while (item) {
            let siblingIndex = item.siblingIndex;
            let length = item.siblingLength;

            if (siblingIndex < 0) {
                throw Error("erroneous tree structure, child not in parent");
            }

            if (predicate(siblingIndex, length)) {
                let start = startFn || startFn(siblingIndex);

                for (let i = start; condition(i, siblingIndex, length); i++) {
                    let sibling = item.sibling(i);
                    pointChanger(sibling);
                    sibling.forEach(item => {
                        pointChanger(item);
                        Animator.update(item.info);
                    });
                    Animator.update(sibling.info);
                }
            }

            item = item.parent;
        }
        Animator.commitTransaction();
        Animator.highlightNode(id);
    },

    findPoint(id) {
        for (let index = 0; index < this.past.length; index++) {
            let part = this.past[index];

            if (part.append && part.id === id) {
                for (let pointIndex = 0; pointIndex < this.itemCreatedIndices.length; pointIndex++) {
                    let value = this.itemCreatedIndices[pointIndex];

                    if (value === index) {
                        return pointIndex;
                    }
                }
                break
            }
        }
    },


    clear() {
        this.stopHistory();
        Animator.clear();
        this.past = [];
        setRoot();
    },

    showAll() {
        const show = item => item.rendered || Animator.render(item);

        show(root);
        root.forEach(show)
    },
};

//generate test data
(function generate() {
    let currentItem = root;

    const maxChild = 2;
    const maxDepth = 5;

    let depth = 0;
    let id = 1;

    while (currentItem) {
        if (depth === maxDepth || currentItem.children.length === maxChild) {
            currentItem = currentItem.parent;
            depth--;
            continue;
        }

        let data = generateData(id, currentItem);
        updateTree(data);

        currentItem = current;
        depth++;
        id++;
    }

    url = "http://www.google.de";

    function generateData(i, parent, tag = "div", scoreAble = true) {
        let parents = parent.getParents();
        parents.unshift(parent);
        parents = parents.map((parent, index) => {
            let clone = Object.assign({}, parent.latestInfo);
            if (!clone.id) {
                return clone;
            }

            let divider = index === 0 && 1 || index === 1 && 2 || index * 3;
            clone.contentScore += Math.round(i / divider);

            if (clone.id === 1) {
                let x = "hi";
            }
            return clone;
        });
        return {
            parents: parents,
            current: {
                id: i,
                contentScore: i,
                tagName: tag,
                scoreAble: scoreAble,
                css: "#id.class"
            }

        }
    }

});

/**
 *
 * @param {number} number
 * @param {number} precision
 * @return {number}
 */
function round(number, precision = 3) {
    return parseFloat(number.toPrecision(precision));
}

//ready media control
//set onClick callback on animator
(function init() {
    let playPauseBtn = document.querySelector(".btn-container .control");

    playPauseBtn.addEventListener("click", () => {
        if (playPauseBtn.classList.contains(history.play)) {
            history.playHistory();
            playPauseBtn.classList.remove(history.play);
            playPauseBtn.classList.add(history.pause);
        } else {
            history.pauseHistory();
            setPlay();
        }
    });
    document.querySelector(".btn-container .stop").addEventListener("click", () => {
        history.stopHistory();
        setPlay();
    });
    document.querySelector(".btn-container .forward").addEventListener("click", () => {
        history.forwardHistory();
        setPlay();
    });
    document.querySelector(".btn-container .backward").addEventListener("click", () => {
        history.backwardHistory();
        setPlay();
    });

    function setPlay() {
        playPauseBtn.classList.remove(history.pause);
        playPauseBtn.classList.add(history.play);
    }

    Animator.onClick = (event, node) => history.setCurrent(node.data.key);
})();

function delay(milliseconds = 1000) {
    return new Promise(resolve => setTimeout(() => resolve(), milliseconds));
}