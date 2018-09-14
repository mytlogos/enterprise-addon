const ProgressChecker = (function () {
    function isElementInViewport(el) {
        let rect = el.getBoundingClientRect();

        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    function onVisibilityChange(el, callback) {
        let old_visible;

        return () => {
            let visible = isElementInViewport(el);

            if (visible !== old_visible) {
                old_visible = visible;
                if (typeof callback === 'function' && visible) {
                    callback();
                }
            }
        }
    }

    const seenElements = new Map();
    let newProgress = false;

    //add an visibility listener to each descendant of body
    //remove listener if it was seen once
    const visibilityObserver = (el, trigger) => {
        if (el.nodeType !== Node.ELEMENT_NODE) {
            return
        }
        const handler = onVisibilityChange(el, () => {
            seenElements.set(el, true);
            //mark as new progress
            newProgress = true;

            // mark as seen only once, what is seen cannot be unseen!
            removeEventListener('load', handler, false);
            removeEventListener('scroll', handler, false);
            removeEventListener('resize', handler, false);
        });

        addEventListener('load', handler, false);
        addEventListener('scroll', handler, false);
        addEventListener('resize', handler, false);

        if (trigger) {
            handler();
        }
    };
    //add handler only if page is shown, (in firefox loading the extension injects this script
    //in all open and loaded tabs, which overtaxes the cpu if there are too many tabs open
    //so just check every 100ms if this document is currently active and then add handler
    //trigger handler once because the document may be fully loaded and a page can be small
    //enough that it does not need scrolling
    (function initDoc() {
        if (document.hidden) {
            setTimeout(() => initDoc(), 100);
        } else {
            //add visibilityObserver to all current elements in the body
            document.querySelectorAll("body *").forEach(element => visibilityObserver(element, true));
        }
    })();

    //add visibilityObserver to every new Element which is added to the body tree
    const domVisibleObserver = new MutationObserver(records =>
        records.forEach(record =>
            record.addedNodes.length
            && record.addedNodes.forEach(newNode => newNode.nodeType === Node.ELEMENT_NODE && visibilityObserver(newNode))));

    domVisibleObserver.observe(document.body, {
        childList: true,
        subtree: true,
    });

    //todo observe play/pause etc. changes to eventual get the momentarily playing title (audio or video)?
    /*const domPlayObserver = new MutationObserver(records => {

});

domPlayObserver.observe(document.body, {
subtree: true,
attributes: true,
attributeOldValue: true,
attributeFilter: ["class"]
});*/

    const nodeGetter = start => {
        let element = null;
        let next = start ?
            el => el ? el.nextElementSibling : document.body.firstElementChild :
            el => el ? el.previousElementSibling : document.body.lastElementChild;

        while (element = next(element)) {
            let name = element.tagName.toLowerCase();

            if (name !== "script" && name !== "style") {
                break;
            }
        }
        return element;
    };

    /**
     * Returns the first common parent element in the body html tree.
     *
     * @param {HTMLElement} first
     * @param {HTMLElement} second
     */
    function firstCommonParent(first, second) {
        function parents(el) {
            let parents = [];

            while ((el = el.parentElement) && el.tagName.toLowerCase() !== "html") {
                parents.push(el);
            }
            return parents;
        }

        const firstParents = parents(first);
        const secondParents = parents(second);

        for (let parent of firstParents) {
            //the first matching parent is the first common parent of first and second
            if (secondParents.includes(parent)) {
                return parent;
            }
        }

        throw Error("elements are not of the same tree")
    }

    function seenProgress() {
        //need a definite start and end point to calculate progress
        if (!start || !end) {
            return 0;
        }
        let parent = firstCommonParent(start, end);
        const walker = document.createTreeWalker(parent, NodeFilter.SHOW_ELEMENT);

        let startSeen = false;

        let element;
        let seen = 0;
        let total = 0;

        while (element = walker.nextNode()) {
            if (element === start) {
                startSeen = true;
            }

            if (!startSeen || !Analyzer.isVisible(element) || Analyzer.noContent(element)) {
                continue;
            }

            seenElements.get(element) && seen++;
            total++;

            if (element === end) {
                break;
            }
        }
        //total should never be zero, at least one (in case start and end is the same)
        return seen / total;
    }

    function mediaProgress(mediaElement) {
        if (mediaElement.ended) {
            return 1;
        }

        //if it is no media element or if not played yet, return zero
        if (!mediaElement.currentTime) {
            return 0;
        }

        let current = mediaElement.currentTime;
        let total = mediaElement.duration;

        if (!total) {
            return 0;
        }
        return current / total;
    }

    /**
     * In case neither video or audio is set:
     * Calculates the percentage of seen elements between and including
     * the start and end element.
     * Returns zero if either of them is missing, else a number between zero and one.
     *
     * @return {number}
     */
    function progress() {
        if (durationAble) {
            if (start && end) {
                return seenProgress() === 1 ? mediaProgress(durationAble) : 0;
            }
            //you shall watch your videos!
            return mediaProgress(audio);
        } else {
            return seenProgress();
        }
    }

    //todo set them as first child and last child of body or wait for input?
    let start = nodeGetter(true);
    let end = nodeGetter(false);
    let video;
    let audio;
    let durationAble;

    let progressCallback;

    setInterval(() => {
        try {
            let currentProgress = progress();
            currentProgress = +currentProgress.toFixed(3);
            progressCallback && progressCallback(currentProgress);
        } catch (e) {
            console.log(e, start, end);
        }
    }, 300);

    return {
        /**
         *  Checks whether the given HtmlElement
         *  (or the element selected by the selector),
         *  has been seen once.
         *
         * @param {string | HTMLElement} selector
         * @return {boolean}
         */
        seen(selector) {
            return false;
        },

        /**
         * Sets the start point for the progress calculation.
         *
         * @param {HTMLElement} startElement
         */
        setStart(startElement) {
            if (!startElement) {
                throw Error("start element is invalid")
            }
            start = startElement;
        },

        /**
         * Sets the end point for the progress calculation.
         *
         * @param {HTMLElement} endElement
         */
        setEnd(endElement) {
            if (!endElement) {
                throw Error("start element is invalid")
            }
            end = endElement;
        },

        setDurationAble(element) {
            if ("currentTime" in element && "ended" in element && "duration" in element) {
                durationAble = element;
            } else {
                throw Error(`${element.tagName} is not a valid durationAble element`);
            }
        },

        set onProgress(callback) {
            if (callback && typeof callback === "function") {
                progressCallback = callback;
            } else {
                throw Error("callback is not a function")
            }
        }
    }
})();