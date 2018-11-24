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

    const seeAbleElements = ["video", " audio", " img", " a", " p", " span", " h1", " h2", " h3", " h4", " h5", " h6", " pre"];

    //add handler only if page is shown, (in firefox loading the extension injects this script
    //in all open and loaded tabs, which could result in overtaxing the cpu if there are too many tabs open
    //so just check every 100ms if this document is currently active and then add handler
    //trigger handler once because the document may be fully loaded and a page can be small
    //enough that it does not need scrolling
    (function initDoc() {
        if (document.hidden) {
            setTimeout(() => initDoc(), 100);
        } else {
            //add visibilityObserver only to current elements in the body which may have 'content'
            document
                .querySelectorAll(seeAbleElements.join(","))
                .forEach(element => visibilityObserver(element, true));
        }
    })();

    //add visibilityObserver to every new content Element which is added to the body tree
    const domVisibleObserver = new MutationObserver(records =>
        records.forEach(record =>
            record.addedNodes.length
            && record.addedNodes.forEach(newNode => {
                newNode.nodeType === Node.ELEMENT_NODE
                && seeAbleElements.includes(newNode.tagName.toLowerCase())
                && visibilityObserver(newNode)
            })
        ));

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

    /**
     *
     * @param {Array} seeAbles
     */
    function seenProgress(seeAbles) {
        seeAbles = seeAbles
            .map(value => {
                let progress = trackProgress.get(value);
                if (!progress) {
                    trackProgress.set(value, progress = {progress: 0, total: 0, seen: 0})
                }
                return [value, progress];
            })
            .filter(value => value[1].progress < 1);

        //need a definite start and end point to calculate progress
        if (!seeAbles.length) {
            return;
        }

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
            acceptNode: node =>
                seeAbleElements.includes(node.tagName.toLowerCase()) ?
                    NodeFilter.FILTER_ACCEPT :
                    NodeFilter.FILTER_SKIP
        });

        //todo count the steps/elements between start and end?

        let element;
        while (element = walker.nextNode()) {

            //if element is not visible, skip it
            if (!Analyzer.isVisible(element)) {
                continue;
            }
            let elementSeen = seenElements.get(element);

            seeAbles.forEach(value => {
                let [seeAble, progressObj] = value;

                if (element === seeAble.start) {
                    progressObj.startSeen = true;
                }

                if (!progressObj.startSeen || progressObj.endSeen) {
                    return;
                }

                if (elementSeen) {
                    progressObj.seen++;
                }

                progressObj.total++;

                if (element === seeAble.end) {
                    if (elementSeen) {
                        progressObj.progress = 1;
                        progressObj.progressed = true;
                    } else {
                        progressObj.endSeen = true;
                    }
                }
            });
        }
        //calculate progress and reset properties for iteration
        seeAbles.forEach(value => {
            let progressObj = value[1];

            if (progressObj.progress !== 1) {
                //total should never be zero, at least one (in case start and end is the same)
                let progress = progressObj.seen / progressObj.total;
                progress = +progress.toFixed(3);

                if (progress > 1) {
                    throw Error("progress cannot be greater than 1");
                }

                if (progressObj.progress < progress) {
                    progressObj.progress = progress;
                    progressObj.progressed = true;
                }
            }

            progressObj.startSeen = false;
            progressObj.endSeen = false;
            progressObj.seen = 0;
            progressObj.total = 0;
        })
    }

    function mediaProgress(trackAble) {
        let mediaElement = trackAble.start;

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
        let progressObj = trackProgress.get(trackAble);

        if (!progressObj) {
            trackProgress.set(trackAble, progressObj = {progress: 0})
        }

        let progress = current / total;
        progress = +progress.toFixed(3);

        if (progressObj.progress < progress) {
            progressObj.progress = progress;
            progressObj.progressed = true;
        }
    }

    //todo set them as first child and last child of body or wait for input?
    let trackAbles = [];
    let trackProgress = new Map();

    let progressCallback;

    setInterval(() => {
        try {
            let seeAbles = trackAbles.filter(value => value.seeAble);
            let durationAbles = trackAbles.filter(value => value.durationAble);

            seenProgress(seeAbles);
            durationAbles.forEach(value => mediaProgress(value));

            let progressed = trackAbles
                .map(value => {
                    return {trackAble: value, progress: trackProgress.get(value)}
                })
                .filter(value => value.progress && value.progress.progressed && (value.progress = value.progress.progress));

            if (!progressed.length) {
                return;
            }
            progressCallback && progressCallback(progressed);

            //reset progressed flag
            progressed.forEach(value => trackProgress.get(value.trackAble).progressed = false);
        } catch (e) {
            console.log(e);
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
         * @param {Result|Array<Result>} toTrack
         */
        track(toTrack) {
            if (Array.isArray(toTrack)) {
                trackAbles.push(...toTrack);
            } else {
                trackAbles.push(toTrack);
            }
        },

        unTrack(unTrack) {
            if (Array.isArray(unTrack)) {
                trackAbles = trackAbles.filter(value => {
                    if (unTrack.includes(value)) {
                        trackProgress.delete(value);
                        return false;
                    } else {
                        return true;
                    }
                });
            } else {
                trackAbles = trackAbles.filter(value => {
                    if (value === unTrack) {
                        trackProgress.delete(value);
                        return false;
                    } else {
                        return true;
                    }
                });
            }
        },

        /**
         *
         * @param {progressCall} callback
         */
        set onProgress(callback) {
            if (callback && typeof callback === "function") {
                progressCallback = callback;
            } else {
                throw Error("callback is not a function")
            }
        }
    }
})();

/**
 * @typedef {callback} progressCall
 * @param {Array<{trackAble: Result, progress: number}>} progressed
 */
