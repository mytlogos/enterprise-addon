/**
 * This Analyzer is a modified version of Mozilla's Readability:
 * https://github.com/mozilla/readability/blob/master/Readability.js
 *
 */
const Analyzer = {

    analyze() {
        this.id = idGenerator();
        //analyze can only run once
        console.log("starting");
        return this.getMain();
    },

    /**
     * Get an elements class/id weight. Uses regular expressions to tell if this
     * element looks good or bad.
     *
     * @param {HTMLElement} element
     * @return number (Integer)
     **/
    _getClassWeight: function (element) {
        let weight = 0;

        // Look for a special className
        if (typeof(element.className) === "string" && element.className !== "") {
            if (this.REGEXPS.negative.test(element.className))
                weight -= 25;

            if (this.REGEXPS.positive.test(element.className))
                weight += 25;
        }

        // Look for a special ID
        if (typeof(element.id) === "string" && element.id !== "") {
            if (this.REGEXPS.negative.test(element.id))
                weight -= 25;

            if (this.REGEXPS.positive.test(element.id))
                weight += 25;
        }

        return weight;
    },

    /**
     * Return the own Text of the given element.
     *
     * @param {HTMLElement} element
     */
    getOwnText(element) {
        let text = [];
        //push the text of all own textNode in an array
        element.childNodes.forEach(value => this.isText(value) && text.push(value.data));
        //join the text and return it
        return text.join("")
    },

    isVideo(element) {
        return element.enterprise.tag === "video";
    },

    isAudio(element) {
        return element.enterprise.tag === "audio";
    },

    isImage(element) {
        return element.enterprise.tag === "img";
    },

    /**
     *
     * @param {HTMLElement} element
     * @param {Set} candidates
     */
    score(element, candidates) {
        //do not score an element without ancestors
        if (!element.parentElement)
            return;

        let content = this.createContent(element);
        element.enterprise = content;

        let innerText = this.getOwnText(element);

        content.classWeight = this._getClassWeight(element);

        //add score for every contentChar (,.:) i want
        content.contentCharCount = this._getCharCount(innerText);
        content.lengthBonus = Math.min(Math.floor(innerText.length / 100), 3);

        if (!this.isScoreAble(element)) {
            if (this.SCORE.textContentTags.includes(content.tag)) {
                content.tagBonus = 2;
                content.contentTags = true;
            } else if (this.SCORE.mediaTags.includes(content.tag)) {
                content.tagBonus = 2;
                content.media = true;

                if (this.isVideo(element)) {
                    content.video = true;
                } else if (this.isAudio(element)) {
                    content.audio = true;
                } else if (this.isImage(element)) {
                    content.img = true;
                }

            } else if (this.SCORE.formatTags.includes(content.tag)) {
                content.tagBonus = 2;
                content.format = true;
            } else if (content.tag === "a") {
                content.tagBonus = 2;
                content.link = true;
            }

            //add the score to ancestors of element
            this.scoreParents(element.parentElement, content, candidates);
        }

        return content;
    },

    /**
     *
     * @param {string} text
     * @return {number}
     * @private
     */
    _getCharCount(text) {
        return text.split(this.REGEXPS.contentChars).length - 1;
    },

    /**
     * Add the scores to the elements and their parents
     * as longs as they are initialized.
     *
     * @param {HTMLElement} element
     * @param content
     * @param {Set} candidates
     * @param {number} level
     */
    scoreParents(element, content, candidates, level = 0) {
        //stop if there is no element to score or element is not initialized (e.g. the html element)
        let enterprise = element.enterprise;

        if (!element || !enterprise) {
            return
        }

        if (this.isScoreAble(element)) {
            //add element as candidate
            candidates.add(element);
        } else if (this.SCORE.scoreParentTag.includes(enterprise.tag)) {
            //go up the lineage, don't score elements which are items of other elements like li of ol/ul
            return this.scoreParents(element.parentElement, content, candidates, ++level);
        }

        //if content has media bonus
        if (content.media) {
            let bonus;

            if (content.video) {
                //people and i love videos
                bonus = 20;
                enterprise.videos.push(content.element);
            } else if (content.audio) {
                //todo not sure if i want to give bonus for audio,
                // because they do not need to be contextually placed
                bonus = 12;
                enterprise.audios.push(content.element);
            } else if (content.img) {
                //images are mostly not alone, so set bonus not too high
                bonus = 10;
                enterprise.images.push(content.element);
            }
            enterprise.contentScore += bonus;

        } else if (content.format) {
            //most of the time only content text has formatTags, so give them a little boost
            enterprise.contentScore += 1;
        } else if (content.contentTags) {
            //most of the time only content text has textContentTags, so give them a little boost
            enterprise.contentScore += 1;
            enterprise.contents.push(content.element);
        } else if (content.link) {
            enterprise.links.push(content.element);
        }

        //do not divide at level zero, half at level one, divide by level multiplied with 3 above one
        let scoreDivider = level === 0 ? 1 : level === 1 ? 2 : level * 3;

        //add contentScore to ancestor
        enterprise.contentScore += Math.round(content.contentScore / scoreDivider);

        enterprise.totalChars += content.totalChars;

        //go up the lineage
        return this.scoreParents(element.parentElement, content, candidates, ++level);
    },

    /**
     *
     * @param {Document} doc
     * @return {Set}
     */
    initialize(doc) {
        let walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, {
            acceptNode: node => {
                if (this.skipElement(node) || this.noContent(node) || !this.isVisible(node)) {
                    //reject if node should be skipped or has no content
                    return NodeFilter.FILTER_REJECT;
                } else {
                    //accept node if it has content
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        });

        let candidates = new Set();

        this.forEachNode(
            walker,
            //use .fire() if i want to debug with tree diagram
            element => this.score(element, candidates)
        );
        return candidates;
    },

    /**
     *
     * @param {Set} candidates
     * @return {Object|boolean}
     */
    getContent(candidates) {
        //remove any duplicate candidates
        let sortedCandidates = Array.from(candidates);
        //sort candidates with greatest candidates first
        sortedCandidates.sort((a, b) => a.enterprise.contentScore - b.enterprise.contentScore).reverse();

        //todo do more?

        let filteredCandidates = sortedCandidates.filter((value, index, array) => {
            //filter out unsuitable candidates, we need 'content'
            let enterprise = value.enterprise;
            if (!enterprise.audioLength
                && !enterprise.videoLength
                && !enterprise.imageLength
                && enterprise.totalChars < 50
                || !this.isVisible(value)) {
                return false;
            }

            //if there is an ancestor which is a better candidate (higher rank) than value, filter value out
            for (let i = index - 1; i >= 0; i--) {
                let item = array[i];

                //if item is ancestor of value
                if (this.isAncestor(value, item) &&
                    enterprise.audioLength < item.enterprise.audioLength &&
                    enterprise.videoLength < item.enterprise.videoLength &&
                    enterprise.imageLength < item.enterprise.imageLength) {
                    return false;
                }
            }

            return true;
        });

        let filteredOut = new Set(candidates);
        filteredCandidates.forEach(value => filteredOut.delete(value));

        const bodyContent = document.body.enterprise;

        if (!bodyContent) {
            return false;
        }

        const videoContent = bodyContent.videoLength && this.isVideoContent(filteredCandidates);
        const audioContent = bodyContent.audioLength && this.isAudioContent(filteredCandidates);
        const imageContent = bodyContent.imageLength && this.isImageContent(filteredCandidates);
        const textContent = bodyContent.totalChars && this.isTextContent(filteredCandidates);
        const tocContent = bodyContent.linkLength && this.isToCContent(sortedCandidates);

        return textContent || videoContent || audioContent || imageContent || tocContent || {};
    },

    queryText(...args) {
        /*if (Array.isArray(args[0])) {
            let result = [];

            for (let arg of args) {
                result.push(this.queryText(arg));
            }

            return result;
        }*/

        if (!args.length) {
            return new Map();
        }
        const regs = args.map(value => {
                if (value instanceof RegExp) {
                    return value;
                }
                if (value instanceof String || typeof value === "string") {
                    return new RegExp(value);
                }
                throw Error("invalid argument");
            }
        );


        const testResult = new Map(regs.map(value => [value, []]));

        this.forEachNode(
            this.createTextWalker(),
            node => {
                for (let reg of regs) {
                    if (reg.test(node.data)) {
                        testResult.get(reg).push(node);
                    }
                }
            }
        );

        const result = new Map();

        testResult.forEach((valueNodes, key) => {
                for (let text of valueNodes) {
                    let val = result.get(text);
                    if (!val) {
                        val = [];
                        result.set(text, val);
                    }
                    val.push(key);
                }
            }
        );
        return result;
    },

    createTextWalker(root = document.body) {
        return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: node => {
                let tag = node.parentElement.tagName.toLowerCase();
                return tag !== "script" && tag !== "style" && tag !== "noscript" ?
                    NodeFilter.FILTER_ACCEPT :
                    NodeFilter.FILTER_REJECT;
            }
        })
    },

    /**
     *
     * @param {TreeWalker} walker
     * @param {function} callback
     * @param {boolean?} evalCurrent
     */
    forEachNode(walker, callback, evalCurrent = true) {
        if (evalCurrent) {
            if (walker.whatToShow === walker.currentNode.nodeType) {
                callback(walker.currentNode);
            } else {
                let currentNode = walker.currentNode;
                let otherNode;

                if (currentNode !== (otherNode = walker.nextNode()) && otherNode) {
                    walker.previousNode();
                } else if (currentNode !== (otherNode = walker.previousNode()) && otherNode) {
                    walker.nextNode();
                } else {
                    callback(walker.currentNode);
                }
            }
        }

        let node;
        while (node = walker.nextNode()) {
            callback(node);
        }
    },

    /**
     *
     * @param {HTMLElement} element
     * @return {TreeWalker}
     */
    nonNegativeWalker(element) {
        return document.createTreeWalker(
            element,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: node =>
                    (this.skipElement(node)
                        || this.REGEXPS.negative.test(node.className)
                        || this.REGEXPS.negative.test(node.id))
                        ? NodeFilter.FILTER_REJECT
                        : NodeFilter.FILTER_ACCEPT
            }
        );
    },

    getNonNegativeText(element) {
        let text = "";

        this.forEachNode(
            this.nonNegativeWalker(element),
            node => text += this.getOwnText(node)
        );

        return text;
    },

    /**
     *
     * @param {HTMLElement} element
     * @param {HTMLElement} maxParent
     */
    hasNoNegativeParent(element, maxParent = document.body) {
        if (element === maxParent) {
            return element.enterprise ? element.enterprise.classWeight >= 0 : false;
        }
        while (element = element.parentElement) {

            if (element.enterprise && element.enterprise.classWeight < 0) {
                return false;
            }

            if (element === maxParent) {
                return true;
            }
        }

        throw Error("element and maxParent are not of the same tree");
    },

    isAncestor(element, possibleAncestor) {
        while (element = element.parentElement) {
            if (element === possibleAncestor) {
                return true;
            }
        }
        return false;
    },

    /**
     *
     * @param {HTMLElement} start
     * @param {HTMLElement} end
     * @param {string} type
     * @param {boolean?} seeAble
     * @param {boolean?} durationAble
     * @return {boolean|{start: HTMLElement, end: HTMLElement, seeAble: boolean, durationAble?: boolean}}
     */
    createResult(start, end, type, seeAble, durationAble) {
        return start && end && {start, end, type, seeAble, durationAble}
    },

    /**
     *
     * @param {Array} candidates
     * @return {*|boolean|{start: HTMLElement, end: HTMLElement, seeAble: boolean, durationAble?: boolean}}
     */
    isToCContent(candidates) {
        // noinspection JSCheckFunctionSignatures
        candidates = candidates.filter(element => element.enterprise
            .links.some(link => {
                if (link.textContent.match(/\d/)) {
                    return true;
                }

                return false;
            }));


        candidates.forEach(value => {

        });
        return this.createResult(null, null, "toc");
    },

    /**
     *
     * @param {Array} candidates
     */
    isTextContent(candidates) {
        //todo what if multiple chapters/textContents are available? (e.g. infinity scroll)
        candidates = candidates.filter(element => {
            const positiveText = this.getNonNegativeText(element);
            const positiveContent = this._getCharCount(positiveText);

            element.enterprise.positiveChars = positiveContent;
            return positiveContent > 50;
        });
        let topCandidate = candidates[0];

        while (topCandidate = candidates.shift()) {
            let nextCandidate = candidates[0];

            if (!nextCandidate || !this.isAncestor(nextCandidate, topCandidate)) {
                break
            }

            let diffPosChars = topCandidate.enterprise.positiveChars - nextCandidate.enterprise.positiveChars;

            if (diffPosChars < 0 || diffPosChars > 5) {
                break
            }
        }

        if (!topCandidate) {
            return;
        }

        let contents = topCandidate.enterprise.contents;

        let first = contents[0];
        let last = contents[contents.length - 1];

        let result = this.createResult(first, last, "text", true);

        if (!result) {
            return result;
        }

        return result;
    },

    /**
     *
     * @param {Array} candidates sorted candidates for possible content
     */
    isImageContent(candidates) {
        candidates = candidates.filter(value => {
            if (!value.enterprise.imageLength) {
                return false;
            }
            return value.enterprise.images = value.enterprise.images
                .filter(img =>
                    this.hasNoNegativeParent(img) &&
                    img.height > 200 &&
                    img.width > 200);
        });

        const max = arrayMax(candidates, (a, b) => {
            const aImg = a.enterprise.imageLength;
            const bImg = b.enterprise.imageLength;

            if (aImg > bImg) {
                return a;
            } else if (aImg === bImg) {
                if (this.isAncestor(a, b)) {
                    return a;
                } else if (this.isAncestor(b, a)) {
                    return b;
                } else {
                    return a.enterprise.contentScore >= b.enterprise.contentScore ? a : b;
                }
            } else {
                return b;
            }
        });

        if (!max) {
            return;
        }

        let start = max.enterprise.images[0];
        let end = max.enterprise.images[max.enterprise.images.length - 1];

        return this.createResult(start, end, "image", true);
    },

    /**
     *
     * @param {Array} candidates
     */
    isVideoContent(candidates) {
        candidates = candidates.filter(value => value.enterprise.videoLength);
        //todo implement video content
        let topCandidate = candidates[0];

        if (!topCandidate) {
            return
        }

        const video = topCandidate.enterprise.videos[0];
        return topCandidate && this.createResult(video, video, "video", true, true);
    },

    /**
     *
     * @param {Array} candidates
     */
    isAudioContent(candidates) {
        candidates = candidates.filter(value => value.enterprise.audioLength);

        //todo implement audio content
        let topCandidate = candidates[0];
        if (!topCandidate) {
            return
        }
        const audio = topCandidate.enterprise.audios[0];
        return topCandidate && this.createResult(audio, audio, "audio", false, true);
    },

    getMain() {
        let doc = document;
        this.normalize(doc.body);
        let candidates = this.initialize(doc);

        return this.getContent(candidates);
    },

    /**
     * Trims all whitespace in any TextNode.
     * Removes TextNodes with whitespace (including /r/n) only.
     * Combines adjacent TextNodes.
     *
     * @param {Element} element
     */
    normalize(element) {
        //trim every textNode
        //this empties all nodes that contain whitespace chars only
        this.forEachNode(
            this.createTextWalker(element),
            node => node.data = node.data.trim()
        );
        //remove empty textNodes
        element.normalize();
    },

    /**
     * Checks if the node is a text node.
     *
     * @param {Node} node
     * @return {boolean} true if the node is a text node
     */
    isText(node) {
        return node.nodeType === Node.TEXT_NODE;
    },

    /**
     * Checks if the element should be scored.
     *
     * An Element to be scored should have a valid scoreAble tag,
     * be visible (not necessarily in viewport) and have content.
     *
     * @param {HTMLElement} element
     * @return {boolean}
     */
    isScoreAble(element) {
        return this.SCORE.scoreTags.includes(element.tagName.toLowerCase())
            && this.anyVisible(element)
            && !this.noContent(element);
    },

    /**
     * Checks whether the element itself or its descendants
     * to the second degree are visible.
     *
     * @param {HTMLElement} element
     * @param {number} lvl
     * @return {boolean}
     */
    anyVisible(element, lvl = 0) {
        if (this.isVisible(element)) {
            return true;
        } else if (lvl === 2) {
            return false;
        }

        for (let child of element.children) {
            if (this.anyVisible(child, lvl + 1)) {
                return true;
            }
        }

        return false;
    },

    /**
     * Checks if this element should be skipped.
     *
     * @param {HTMLElement} element
     * @return {boolean}
     */
    skipElement(element) {
        return this.SCORE.skipTags.includes(element.tagName.toLowerCase()) || element.classList.contains("enterprise-popup");
    },
    /**
     * Checks whether the element has no content.
     *
     * Checks whether the element has text consisting only of
     * whitespace characters / no text, no images, no videos and no audios.
     *
     * @param {HTMLElement} element to test
     * @return {boolean} true if element has no 'content text'
     */
    noContent(element) {
        return this.REGEXPS.whitespace.test(element.textContent)
            && !element.matches("video, img, audio")
            && !element.querySelector("video, img, audio");
    },

    /**
     * Checks whether the element is currently able to be visible for the user.
     *
     * Does not take the z-index in account.
     *
     * An element counts as not visible when display is "none",
     * opacity is zero, does not have a scrollHeight/-Width
     * or is completely positioned outside the window.
     *
     * You can only position an element outside the window if you set the left or top offset
     * negative.
     * Setting the bottom or right offset negative results only in the document space
     * expanding showing either a horizontal or vertical scrollbar.
     *
     * @param {HTMLElement} element to test for visibility
     * @return {boolean} true if visible
     */
    isVisible(element) {
        //every element within that list is invisible by default
        if (element.tagName.toLowerCase() in this.SCORE.invisibleTags) {
            return false;
        }

        if (element.hidden) {
            return false;
        }

        // (!element.offsetHeight || !element.offsetWidth) &&
        if ((!element.scrollHeight || !element.scrollWidth)) {
            return false;
        }

        //get computed style for window
        let style = window.getComputedStyle(element);

        //what use is it if you have something but can't 'see' it
        if (parseFloat(style.opacity) === 0) {
            return false;
        }

        /*//if e.g. style.left is "auto" parse return NaN, so just set it to 0
        let left = parseFloat(style.left) || 0;
        let top = parseFloat(style.top) || 0;

        let position = style.position;
*/
        return true;
        //fixme for now i am gonna just ignore the out of window position thing
        /*//left or top properties are not applicable
        // if position is neither absolute, fixed or relative, so return true if not applicable,
        //else check left and top
        && (position !== "absolute" && position !== "fixed" && position !== "relative")
        //if left is less than zero, check if the the width
        //is big enough so that at least a part is still shown
        || (left >= 0 || (left < 0 && (left + width) > 0))
        //top offset needs to be zero or more to show content
        && top >= 0;*/
    },


    // All of the regular expressions in use within readability.
    // Defined up here so we don't instantiate them repeatedly in loops.
    REGEXPS: {
        unlikelyCandidates: /-ad-|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|foot|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,
        okMaybeItsACandidate: /and|article|body|column|main|shadow/i,
        positive: /article|body|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story/i,
        negative: /hidden|^hid$| hid$| hid |^hid |banner|combx|comment|com-|contact|disqus|foot|footer|footnote|masthead|media|meta|outbrain|popup|promo|related|replies|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|social|tags|tool|widget/i,
        extraneous: /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single|utility/i,
        byline: /byline|author|dateline|writtenby|p-author/i,
        normalize: /\s{2,}/g,
        videos: /\/\/(www\.)?((dailymotion|youtube|youtube-nocookie|player\.vimeo|v\.qq)\.com|(archive|upload\.wikimedia)\.org|player\.twitch\.tv)/i,
        nextLink: /(next|weiter|continue|>([^|]|$)|»([^|]|$))/i,
        prevLink: /(prev|earl|old|new|<|«)/i,
        whitespace: /^\s*$/,
        hasContent: /\S$/,
        contentChars: /[,.]/,
    },

    SCORE: {
        scoreTags: ["div", "main", "article", "section"],
        skipTags: [
            "header", "aside", "footer", "nav", "form",
            "input", "textarea", "button", "select", "optgroup",
            "option", "label", "fieldset", "legend",
            "datalist", "output", "style", "dialog", "script", "style"
        ],
        scoreParentTag: ["li", "dl", "dt", "dd", "tr", "td", "thead", "tbody", "th"],
        mediaTags: ["video", "audio", "img"],
        textContentTags: ["p", "span", "h1", "h2", "h3", "h4", "h5", "h6"],
        formatTags: [
            "abbr", "address", "b", "bdi", "bdo", "big", "blockquote", "center",
            "cite", "code", "del", "dfn", "em", "font", "i", "ins", "kbd",
            "mark", "meter", "pre", "progress", "q", "rp", "rt", "ruby",
            "s", "samp", "small", "strike", "strong", "sub", "sup", "template", "time",
            "tt", "u", "var", "wbr"
        ],

        invisibleTags: {
            "html": 1,
            "head": 1,
            "title": 1,
            "meta": 1,
            "link": 1,
            "style": 1,
            "script": 1,
            "noscript": 1,
            "br": 1,
            "param": 1,
            "col": 1,
        }
    },

    createContent(element) {
        let tag = element.tagName.toLowerCase();
        let id = tag === "body" ? 0 : this.id.next().value;
        return {
            tag: tag,
            element: element,
            contentScore: 0,
            id: id,
            scoreAble: this.isScoreAble(element),
            selector: Selector.getQuerySelector(element),
            media: 0,
            videos: [],
            audios: [],
            images: [],
            contents: [],
            links: [],
            seriesHints: [],
            totalChars: 0,

            get imageLength() {
                return this.images.length;
            },
            get videoLength() {
                return this.videos.length;
            },
            get audioLength() {
                return this.audios.length;
            },

            get linkLength() {
                return this.audios.length;
            },

            set classWeight(classWeight) {
                this._classWeight = classWeight;
                this.contentScore += classWeight;
            },

            get classWeight() {
                return this._classWeight;
            },

            set contentCharCount(contentCharCount) {
                this._contentCharCount = contentCharCount;
                this.totalChars += contentCharCount;
                this.contentScore += contentCharCount;
            },

            get contentCharCount() {
                return this._contentCharCount;
            },

            set lengthBonus(lengthBonus) {
                this._lengthBonus = lengthBonus;
                this.contentScore += lengthBonus;
            },

            get lengthBonus() {
                return this._lengthBonus;
            },

            set tagBonus(content) {
                this.contentScore += content;
            },

            css: (element.id && `#${element.id}`) + (element.className && `.${element.className.replace(/\s/g, ".")}`),

            fire() {
                let message = {
                    parents: [],
                    current: this._pack()
                };

                let parent = element;

                while (parent = parent.parentElement) {
                    let content;

                    if (parent.enterprise) {
                        content = parent.enterprise;
                    } else {
                        break
                    }
                    message.parents.push(this._pack(content));
                }

                sendMessage({tree: message}, true);
            },

            /**
             * Return a JSON-able form of content.
             *
             * @param {{scoreAble: boolean,contentScore: number, classWeight: number, contentCharCount: number, lengthBonus: number, tag: string, css: string, selector: string, id: number}} content
             * @return {{scoreAble: boolean,contentScore: number, classWeight: number, contentCharCount: number, lengthBonus: number, tagName: string, css: string, selector: string, id: number}}
             * @private
             */
            _pack(content = this) {
                return {
                    scoreAble: content.scoreAble,
                    contentScore: content.contentScore,
                    classWeight: content.classWeight,
                    contentCharCount: content.contentCharCount,
                    lengthBonus: content.lengthBonus,
                    tagName: content.tag,
                    css: content.css,
                    selector: content.selector,
                    id: content.id
                }
            },
        };
    },
};

/**
 *
 * @return {IterableIterator<number>}
 */
function* idGenerator() {
    let id = 1;
    while (true) {
        yield id++;
    }
}

/**
 * Css Selector Factory copied (and modified to Elements instead of node)
 * from https://github.com/thomaspeklak/get-query-selector/blob/master/index.js;
 *
 * @type {{siblingPosition(Element): number, getQuerySelector(Element): string}}
 */
const Selector = {
    /**
     *
     * @param {Element} node
     * @return {number}
     */
    siblingPosition(node) {
        let i = 1;
        while (node = node.previousElementSibling) {
            if (node.nodeType === 1) i += 1;
        }

        return i;
    },

    /**
     *
     * @param {Element} node
     * @return {string}
     */
    getQuerySelector(node) {
        if (node.id) return "#" + node.id;
        if (node.nodeName === "BODY") return "body";

        let position = this.siblingPosition(node);

        return this.getQuerySelector(node.parentElement) + ">:nth-child(" + position + ")";
    }
};


function arrayMax(array, predicate = (a, b) => Math.max(a, b)) {
    return array.length && array.reduce(predicate);
}

window.addEventListener("unload", () => sendMessage({analyzer: false}, true));
