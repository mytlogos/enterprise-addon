/**
 * This Analyzer is a modified version of Mozilla's Readability:
 * https://github.com/mozilla/readability/blob/master/Readability.js
 *
 * It identifies the main text/s, videos, audios and images/image strips
 * on the current document.
 */
const Analyzer = {
    /**
     * @access private
     * @memberOf Analyzer
     */
    running: false,

    /**
     *
     * @return {void|boolean|AnalyzeResult|Array<AnalyzeResult>}
     */
    analyze() {
        this.id = idGenerator();
        //analyze can only run once
        if (this.running) {
            return
        }
        this.running = true;
        this.elementCount = 0;
        this.bodyCount = 0;

        //run the scoring algorithm
        let candidates = this.initialize(document);
        console.log(`elements: ${this.elementCount}, bodies: ${this.bodyCount}`);

        //select the content from candidates
        let main = ContentSelector.getContent(candidates);
        this.cleanDom();
        this.running = false;
        return main;
    },

    cleanDom() {
        //todo remove all enterprise objects from dom
        //todo OR don't couple them in first place
    },

    /**
     * Get an elements class/id weight. Uses regular expressions to tell if this
     * element looks good or bad.
     *
     * @param {HTMLElement} element
     * @return number (Integer)
     **/
    getClassWeight: function (element) {
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
        if (!element.parentElement) {
            return;
        }

        const content = element.enterprise = this.createContent(element);
        let innerText = this.getOwnText(element);

        content.classWeight = this.getClassWeight(element);

        //add score for every contentChar (,.:) i want
        content.contentCharCount = this._getCharCount(innerText);
        content.lengthBonus = Math.min(Math.floor(innerText.length / 100), 3);

        //???????
        if (!content.scoreAble) {
            if (content.tag in this.SCORE.textContentTags) {
                content.tagBonus = 2;
                content.contentTags = true;
            } else if (content.tag in this.SCORE.mediaTags) {
                content.tagBonus = 2;
                content.media = true;

                if (this.isVideo(element)) {
                    content.video = true;
                } else if (this.isAudio(element)) {
                    content.audio = true;
                } else if (this.isImage(element)) {
                    content.img = true;
                }

            } else if (content.tag in this.SCORE.formatTags) {
                content.tagBonus = 2;
                content.format = true;
            } else if (content.tag === "a") {
                content.tagBonus = 2;
                content.link = true;
            }

        }
        this.elementCount++;
        //add the score to ancestors of element
        this.scoreParents(element.parentElement, content, candidates);
        return content;
    },

    /**
     *
     * @param {string} text
     * @return {number}
     * @private
     */
    _getCharCount(text) {
        return (text.match(this.REGEXPS.contentChars) || []).length;
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
        let parentContent;

        if (element === document.body) {
            this.bodyCount++;
        }

        if (!element || !(parentContent = element.enterprise)) {
            return;
        }

        if (parentContent.scoreAble) {
            //add element as candidate
            candidates.add(element);
        } else if (parentContent.tag in this.SCORE.scoreParentTag) {
            //go up the lineage, don't score elements which are items of other elements like li of ol/ul
            return this.scoreParents(element.parentElement, content, candidates, ++level);
        }

        //if content has media bonus
        if (content.media) {
            let bonus;

            if (content.video) {
                //people and i love videos
                bonus = 20;
                parentContent.videos.push(content.element);
            } else if (content.audio) {
                //todo not sure if i want to give bonus for audio,
                // because they do not need to be contextually placed
                bonus = 12;
                parentContent.audios.push(content.element);
            } else if (content.img) {
                //images are mostly not alone, so set bonus not too high
                bonus = 10;
                parentContent.images.push(content.element);
            }
            parentContent.contentScore += bonus;

        } else if (content.format) {
            //most of the time only content text has formatTags, so give them a little boost
            parentContent.contentScore += 1;
        } else if (content.contentTags) {
            //most of the time only content text has textContentTags, so give them a little boost
            parentContent.contentScore += 1;
            parentContent.contents.push(content.element);
        } else if (content.link) {
            parentContent.links.push(content.element);
        }

        //do not divide at level zero, half at level one, divide by level multiplied with 3 above one
        let scoreDivider = level === 0 ? 1 : level === 1 ? 2 : level * 3;

        //add contentScore to ancestor
        parentContent.contentScore += Math.round(content.contentScore / scoreDivider);

        parentContent.totalChars += content.totalChars;

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
                if (this.skipElement(node) || this.noContent(node)) {
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
            element => {
                let content = this.score(element, candidates);

                if (this.debug) {
                    content.fire();
                }
            }
        );
        return candidates;
    },

    /**
     * Creates a treeWalker, which starts walking from the given node
     * or the body of the documents and only accepts textNodes.
     *
     * @param {Node?} root
     * @return {TreeWalker}
     */
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
     * Executes the callback for each node under the current node.
     * Evaluates the nearest node with the right type
     *
     * @param {TreeWalker} walker
     * @param {function} callback
     * @param {boolean?} evalCurrent
     */
    forEachNode(walker, callback, evalCurrent = true) {
        if (evalCurrent) {
            let currentNode = walker.currentNode;

            if (TypeFilterMatcher.matchFilter(walker.whatToShow, currentNode.nodeType)) {
                callback(currentNode);
            } else {
                let otherNode;

                if (currentNode !== (otherNode = walker.nextNode()) && otherNode) {
                    walker.previousNode();
                } else if (currentNode !== (otherNode = walker.previousNode()) && otherNode) {
                    walker.nextNode();
                } else {
                    callback(currentNode);
                }
            }
        }

        let node;
        while (node = walker.nextNode()) {
            callback(node);
        }
    },

    /**
     * TreeWalker which traverses the ElementTree of element.
     * Accepts only elements which are not to be skipped
     * and do not have negative classNames or id´s.
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

    /**
     * Returns the text which does not stem from negative
     * elements.
     *
     * @param {HTMLElement} element
     * @return {string}
     */
    getNonNegativeText(element) {
        let text = "";

        this.forEachNode(
            this.nonNegativeWalker(element),
            node => text += this.getOwnText(node)
        );

        return text;
    },

    /**
     * Traverses the element ancestry of element
     * and checks if element has a parent with a
     * negative classWeight.
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
     * @param {string} tag
     * @return {boolean}
     */
    isScoreAble(element, tag) {
        return tag in this.SCORE.scoreTags
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
        let tag = element.tagName.toLowerCase();
        return tag in this.SCORE.skipTags
            || element.classList.contains("enterprise-popup")
            || tag in this.SCORE.invisibleTags;
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
        if (!element.scrollHeight || !element.scrollWidth) {
            return false;
        }
        let opacity = window.getComputedStyle(element).opacity;
        return parseFloat(opacity) !== 0;
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
        contentChars: /[,.?!](?=\D)/g,
    },

    SCORE: {
        scoreTags: {"div": 1, "main": 1, "article": 1, "section": 1},
        skipTags: {
            "header": 1, "aside": 1, "footer": 1, "nav": 1, "form": 1,
            "input": 1, "textarea": 1, "button": 1, "select": 1,
            "optgroup": 1, "option": 1, "label": 1, "fieldset": 1,
            "legend": 1, "datalist": 1, "output": 1,
            "dialog": 1, "script": 1, "style": 1, "svg": 1
        },
        scoreParentTag: {"li": 1, "dl": 1, "dt": 1, "dd": 1, "tr": 1, "td": 1, "thead": 1, "tbody": 1, "th": 1},
        mediaTags: {"video": 1, "audio": 1, "img": 1},
        textContentTags: {"p": 1, "span": 1, "h1": 1, "h2": 1, "h3": 1, "h4": 1, "h5": 1, "h6": 1, "pre": 1},
        formatTags: {
            "abbr": 1, "address": 1, "b": 1, "bdi": 1, "bdo": 1, "big": 1, "blockquote": 1, "center": 1,
            "cite": 1, "code": 1, "del": 1, "dfn": 1, "em": 1, "font": 1, "i": 1, "ins": 1, "kbd": 1,
            "mark": 1, "meter": 1, "progress": 1, "q": 1, "rp": 1, "rt": 1, "ruby": 1,
            "s": 1, "samp": 1, "small": 1, "strike": 1, "strong": 1, "sub": 1, "sup": 1, "template": 1, "time": 1,
            "tt": 1, "u": 1, "var": 1, "wbr": 1
        },

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

    /**
     * Creates a content Object, which is intended for the
     * Developer Tool.
     *
     * @param {HTMLElement} element
     * @return {*}
     */
    createContent(element) {
        let tag = element.tagName.toLowerCase();
        let id = tag === "body" ? 0 : this.id.next().value;
        return {
            tag: tag,
            element: element,
            contentScore: 0,
            id: id,
            scoreAble: this.isScoreAble(element, tag),
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

            css: (element.id && `#${element.id}`) + (element.className && `.${element.className.trim().replace(/\s/g, ".")}`),

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

const ContentSelector = {

    /**
     *
     * @param {Set} candidates
     * @return {boolean|AnalyzeResult|Array<AnalyzeResult>}
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
                || !Analyzer.isVisible(value)) {
                return false;
            }

            //if there is an ancestor which is a better candidate (higher rank) than value, filter value out
            for (let i = index - 1; i >= 0; i--) {
                let item = array[i];

                //if item is ancestor of value and 'better'
                if (isAncestor(value, item) &&
                    enterprise.audioLength < item.enterprise.audioLength &&
                    enterprise.videoLength < item.enterprise.videoLength &&
                    enterprise.imageLength < item.enterprise.imageLength) {
                    return false;
                }
            }

            return true;
        });

        //fixme only for debug purposes
        let filteredOut = new Set(candidates);
        filteredCandidates.forEach(value => filteredOut.delete(value));

        const bodyContent = document.body.enterprise;

        if (!bodyContent) {
            return false;
        }

        const textContent = bodyContent.totalChars && this.isTextContent(filteredCandidates);
        const videoContent = bodyContent.videoLength && this.isVideoContent(filteredCandidates);
        const audioContent = bodyContent.audioLength && this.isAudioContent(filteredCandidates);
        const imageContent = bodyContent.imageLength && this.isImageContent(filteredCandidates);
        const tocContent = bodyContent.linkLength && this.isToCContent(sortedCandidates);

        return textContent || videoContent || audioContent || imageContent || tocContent;
    },

    /**
     *
     * @param {Array<HTMLElement>} candidates
     * @return {boolean|AnalyzeResult}
     */
    isToCContent(candidates) {
        //todo implement ToC selector
        // noinspection JSUnresolvedVariable
        candidates = candidates.filter(element =>
            element.enterprise.links.some(link => {
                    if (link.textContent.match(/\d/)) {
                        return true;
                    }

                    return false;
                }
            )
        );

        candidates.forEach(value => {

        });
        return this.createResult(null, null, null, "toc");
    },

    /**
     *
     * @param {Array<*>} candidates
     * @return {void|boolean|AnalyzeResult|Array<AnalyzeResult>}
     */
    isTextContent(candidates) {
        //fixme does not seem to give stable results, because page is loaded differently??
        //fixme or content are too different?
        let outFiltered = [];

        //filter candidates who have real text content
        candidates = candidates.filter(element => {
            if (!element.enterprise.contents.length) {
                return;
            }
            const positiveText = Analyzer.getNonNegativeText(element);
            const positiveContent = Analyzer._getCharCount(positiveText);

            element.enterprise.positiveChars = positiveContent;
            return positiveContent >= 50;
        });

        //prepare a list of candidates to remove
        let result = candidates.filter(value => {
            let removeProbably = [];

            for (let candidate of candidates) {
                //continue if candidate is no child of value or value itself
                if (value === candidate || !isAncestor(candidate, value)) {
                    continue;
                }

                let candidatePosChars = candidate.enterprise.positiveChars;
                let valuePosChars = value.enterprise.positiveChars;

                if ((valuePosChars - candidatePosChars) > 5) {
                    //if the difference between positiveChars is too big,
                    //the child is surely missing things, so remove it
                    removeProbably.push(candidate);
                } else {
                    //if value (parent) has same posChars as candidate(child) remove value
                    outFiltered.push(value);
                }
            }
            let totalPosCharsRemove = 0;

            for (let element of removeProbably) {
                totalPosCharsRemove += element.enterprise.positiveChars;
            }
            //check if value is only a container for multiple contents
            if ((value.enterprise.positiveChars - totalPosCharsRemove) < 5) {
                outFiltered.push(value);
            } else {
                outFiltered.push(...removeProbably);
            }
            return true;
        });

        //remove candidates which have a better
        //candidate in the direct lineage of their element
        result = result.filter(value => !outFiltered.includes(value));

        //map the candidates to processable results
        result = result.map(candidate => {
            let contents = candidate.enterprise.contents;

            let first = contents[0];
            let last = contents[contents.length - 1];

            return this.createResult(first, last, candidate, "text", true);
        });

        if (result.length === 1) {
            //return only the only item if there is one
            return result[0];
        } else if (result.length > 1) {
            //return all remaining results if there are more than one
            return result;
        }
    },

    /**
     *
     * @param {Array} candidates sorted candidates for possible content
     * @return {boolean|void|AnalyzeResult}
     */
    isImageContent(candidates) {
        candidates = candidates.filter(value => {
            if (!value.enterprise.imageLength) {
                return false;
            }
            return value.enterprise.images = value.enterprise.images
                .filter(img =>
                    Analyzer.hasNoNegativeParent(img) &&
                    img.height > 200 &&
                    img.width > 200);
        });

        const max = arrayMax(candidates, (a, b) => {
            const aImg = a.enterprise.imageLength;
            const bImg = b.enterprise.imageLength;

            if (aImg > bImg) {
                return a;
            } else if (aImg === bImg) {
                if (isAncestor(a, b)) {
                    return a;
                } else if (isAncestor(b, a)) {
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

        return this.createResult(start, end, max, "image", true);
    },

    /**
     *
     * @param {Array} candidates
     * @return {boolean|void|AnalyzeResult}
     */
    isVideoContent(candidates) {
        candidates = candidates.filter(value => value.enterprise.videoLength);
        //todo implement video content
        let topCandidate = candidates[0];

        if (!topCandidate) {
            return
        }

        const video = topCandidate.enterprise.videos[0];
        return topCandidate && this.createResult(video, video, video, "video", true, true);
    },

    /**
     *
     * @param {Array} candidates
     * @return {boolean|AnalyzeResult|void}
     */
    isAudioContent(candidates) {
        candidates = candidates.filter(value => value.enterprise.audioLength);

        //todo implement audio content
        let topCandidate = candidates[0];
        if (!topCandidate) {
            return
        }
        const audio = topCandidate.enterprise.audios[0];
        return topCandidate && this.createResult(audio, audio, audio, "audio", false, true);
    },


    /**
     * Creates a Result object.
     *
     * @param {HTMLElement} start
     * @param {HTMLElement} end
     * @param {HTMLElement} ancestor
     * @param {string} type
     * @param {boolean?} seeAble
     * @param {boolean?} durationAble
     * @return {boolean|AnalyzeResult}
     */
    createResult(start, end, ancestor, type, seeAble, durationAble) {
        return start && end && ancestor && {start, end, ancestor, type, seeAble, durationAble}
    },

};

const TypeFilterMatcher = (function generateTypeFilterMap() {
    let typeEnd = "_NODE";
    let typeEndLength = typeEnd.length;

    let typesKeys = Object
        .keys(Node)
        .map(key => {
            if (!key.endsWith(typeEnd)) {
                return;
            }
            return {
                key: key.substring(0, key.length - typeEndLength).toUpperCase(),
                value: Node[key]
            }
        })
        .filter(value => value);

    let filterStart = "SHOW_";
    let filterStartLength = filterStart.length;

    let filterKeys = Object
        .keys(NodeFilter)
        .map(key => {
            if (!key.startsWith(filterStart)) {
                return;
            }
            return {
                key: key.substring(filterStartLength).toUpperCase(),
                value: NodeFilter[key]
            }
        }).filter(value => value);

    const typeFilterMap = new Map();
    const filterTypeMap = new Map();

    typesKeys.forEach(value => {
        let filterKeyValue = filterKeys.find(key => key.key === value.key);

        //should not happen, but who knows
        if (!filterKeyValue) {
            console.log(`${value.key} has no corresponding filter`);
            return;
        }

        typeFilterMap.set(value.value, filterKeyValue.value);
        filterTypeMap.set(filterKeyValue.value, value.value);
    });

    return {
        matchNode(nodeType, filterType) {
            return typeFilterMap.get(nodeType) === filterType;
        },

        matchFilter(filterType, nodeType) {
            return filterTypeMap.get(filterType) === nodeType;
        }
    };
})();

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

const OtherSelector = {

    /**
     * Generate a Selector for a given element.
     *
     * @param {HTMLElement} element
     * @return {string|boolean}
     */
    getQuerySelector(element) {
        // False on non-elements
        if (!(element instanceof HTMLElement)) {
            return false;
        }
        let path = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let selector = element.nodeName;
            if (element.id) {
                selector += ('#' + element.id);
            }
            else {
                // Walk backwards until there is no previous sibling
                let sibling = element;
                // Will hold nodeName to join for adjacent selection
                let siblingSelectors = [];
                while (sibling !== null && sibling.nodeType === Node.ELEMENT_NODE) {
                    siblingSelectors.unshift(sibling.nodeName);
                    sibling = sibling.previousElementSibling;
                }
                // :first-child does not apply to HTML
                if (siblingSelectors[0] !== 'HTML') {
                    siblingSelectors[0] = siblingSelectors[0] + ':first-child';
                }
                selector = siblingSelectors.join(' + ');
            }
            path.unshift(selector);
            element = element.parentElement;
        }
        return path.join(' > ');
    }
};

/**
 * Returns the 'biggest' element of the given array.
 * If no comparator is given, it returns the biggest number.
 *
 * @param {Array} array
 * @param {function?} comparator
 * @return {number | *}
 */
function arrayMax(array, comparator = (a, b) => Math.max(a, b)) {
    return array.length && array.reduce(comparator);
}

window.addEventListener("unload", () => sendMessage({analyzer: false}, true));

/**
 * @typedef {Object} AnalyzeResult
 *
 * @property {HTMLElement} start
 * @property {HTMLElement} end
 * @property {HTMLElement} ancestor
 * @property {string} type
 * @property {boolean} seeAble
 * @property {boolean} durationAble
 */
