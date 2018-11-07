const MetaExtractor = (function () {
    function title(element) {
        let candidates = [];

        let lineNodesList = lineNodes();
        lineNodesList.forEach((value, index, array) => {
            let [line, node] = value;

            let result = createResult(node, line, {regs: true});
            candidates.push(result);

            headings(result, node);
            breadcrumb(result, node);
            links(result, node);

            hRule(result, element, index, array);

            matchPath(result, line);
            matchTitle(result, line);
            matchText(result, line);
        });

        candidates = filterIrrelevant(candidates);
        // candidates = filterNotBelow(candidates, element, 0.5);

        scoreCandidates(candidates);

        // console.table(lineNodesList);
        // console.table(candidates);

        return meta(candidates);
    }

    function headings(result, node) {
        if (node.nodeType === Node.ELEMENT_NODE && node.matches("h1,h2,h3,h4,h5,h6,[class*=title],[class*=cat]")) {
            result.heading = true;
        } else {
            for (let parent of parents(node)) {
                if (parent.matches("h1,h2,h3,h4,h5,h6,[class*=title],[class*=cat]")) {
                    result.heading = true;
                    break;
                }
            }
        }
    }

    function breadcrumb(result, node) {
        if (node.nodeType === Node.ELEMENT_NODE && node.matches("[class*=bread],[class*=crumb]")) {
            result.breadcrumb = true;
        } else {
            for (let parent of parents(node)) {
                if (parent.matches("[class*=bread],[class*=crumb]")) {
                    result.breadcrumb = true;
                    break;
                }
            }
        }
    }

    function links(result, node) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "A") {
            result.link = node.href;
        } else {
            for (let parent of parents(node)) {
                if (parent.tagName === "a") {
                    result.link = parent.href;
                    break;
                }
            }
        }
    }

    function hRule(result, element, index, lineNodes) {
        let horizontalRule = element.querySelector("hr");

        if (!horizontalRule) {
            return;
        }

        for (let i = 0; i < lineNodes.length; i++) {
            let node = lineNodes[i][1];

            if (isAbove(node, horizontalRule) &&
                (i === lineNodes.length - 1 || isAbove(horizontalRule, lineNodes[i][1]))) {

                if (index > i && (index - i) < 2) {
                    result.hRule = true;
                }
                break;
            }
        }
    }

//remove any number only path sections, are mostly only things like id´s or dates
    let path = document.location.pathname.replace(/\/\d+\//g, "/");
    let pathSnippets = generateRegex(path, "/", "-");

    function matchPath(result, line) {
        if (!pathSnippets.length) {
            return [];
        }

        let pathMatchSnippets = pathSnippets.map(snippets => {
            return snippets.map(snippet => {
                let match = line.match(snippet) || [];
                return {
                    snippet,
                    match
                };
            });
        });
        //if there is at least one match for any snippet
        const match = pathMatchSnippets.some(matchSnippets => matchSnippets.some(matchSnippet => Boolean(matchSnippet.match.length)));

        //push it as an viable result
        if (match) {
            result.path = pathMatchSnippets;
        }
    }

    function titleAbbrRegex() {
        let abbr = document.title.match(/[A-Z]\w*[A-Z]\w*/);
        if (!abbr) {
            return [];
        }
        let pattern = "";

        for (let char of abbr[0]) {
            pattern = pattern + char + ".*";
        }

        let titleReg = new RegExp(pattern, "i");

        if (titleReg.test(document.location.hostname)) {
            return [];
        }
        return [titleReg, abbr];
    }

    const titleSnippets = generateRegex(document.title, /[|\-–\\\/>»]/, /\s/);
    const [abbr] = titleAbbrRegex();

    function matchTitle(result, line) {
        if (!titleSnippets.length) {
            return [];
        }

        let titleMatchSnippets = titleSnippets.map(snippets => {
            return snippets.map(snippet => {
                let match = line.match(snippet) || [];
                return {
                    snippet,
                    match
                };
            });
        });
        //if there is at least one match for any snippet
        const match = titleMatchSnippets.some(matchSnippets => matchSnippets.some(matchSnippet => Boolean(matchSnippet.match.length)));

        //push it as an viable result
        if (match) {
            result.title = titleMatchSnippets;
        }

        if (abbr) {
            const abbrMatch = line.match(abbr);

            if (abbrMatch) {
                result.novelAbbr = abbrMatch;
            }
        }
    }

    const titleReg = /(\W|^)((ch(apter|(\.?\s?\d+)))|c\d+|episode|Vol(ume|\.)|v\d+|Arc|book|extra|part)([^a-z]|$)/i;
    const titleRegSensitive = /SS/;
    const abbreviations = /[A-Z]\w*[A-Z]\w*/;

    function matchText(result, line) {
        if (titleRegSensitive.test(line) || titleReg.test(line)) {
            result.regs = true;
        }

        let match = abbreviations.exec(line);

        if (match && (line.toUpperCase() !== line || !line.includes(" "))) {
            result.abbr = match;
        }
    }

    /**
     *
     * @param {string} text
     * @param {RegExp|string} separator
     * @param {RegExp|string} secSep
     * @return {RegExp[][]}
     */
    function generateRegex(text, separator, secSep) {
        return text
            .split(separator)
            .map(s => s
                .split(secSep)
                .map(s => s.trim())
                .filter(s => s)
                .map(snippet => {
                    snippet = snippet.replace(/s$/, "['´`’]?s");
                    snippet = regExpEscape(snippet);
                    return new RegExp("(\\W|^)" + snippet + "([^a-z]|$)", "i");
                }))
            .filter(snippets => snippets.length);
    }

    function filterIrrelevant(candidates) {
        const navLink = /next|weiter|continue|>|»|prev|earl|old|<|«/i;
        const width = window.screen.width;
        return candidates.filter(candidate => {
            if (candidate.marked ||
                (candidate.link && navLink.test(candidate.text)) ||
                candidate.text.length > 200 ||
                candidate.text.includes(document.location)) {

                return false;
            }

            let sameText = candidates.filter(other => other.text === candidate.text);

            if (sameText.length > 4) {
                sameText.forEach(other => other.marked = true);
                return false;
            }

            let element = candidate.node;

            if (element.nodeType === Node.TEXT_NODE) {
                element = element.parentElement;
            }

            let left = window.getComputedStyle(element).left;

            let match = left.match(/\d/);

            if (match && (left = match[0]) < 0) {
                return (left + width) >= 0;
            }
            return true;
        });
    }

    function createResult(node, text, info) {
        const result = {node, text};
        return Object.assign(result, info);
    }

    function meta(candidates) {
        candidates = candidates.filter(value => value.score);
        let scoredCandidates = [...candidates].sort((a, b) => b.score - a.score);

        let chapters = scoredCandidates.filter(value => value.chapter);

        let chapter = chapters[0];

        let volumes = scoredCandidates.filter(value => value.volume);

        const result = {};

        if (chapter) {
            //if the chapter match is not at the beginning, sth else (novel title likely) is preceding it
            let chapStart = chapter.chapter.index;

            if (chapStart) {
                let novel = chapter.text.substring(0, chapStart).trim();

                if (chapter.volume) {
                    let volStart = chapter.volume.index;
                    result.volume = chapter.text.substring(volStart, chapStart);

                    let volIndex = result.volume.match(/\d+/);
                    result.volIndex = volIndex && volIndex[0];

                    if (volStart) {
                        novel = chapter.text.substring(0, volStart).trim();
                    } else {
                        novel = "";
                    }
                }
                result.novel = novel;
            }

            result.chapter = chapter.text.substring(chapStart);

            let chapIndex = result.chapter.match(/\d+([,.]\d+)?/);
            result.chapIndex = chapIndex && chapIndex[0];
        }
        volumes = result.chapter ? filterNotBelow(volumes, chapter.node) : volumes;
        let volume;

        if (!result.volume) {
            volume = volumes[0];

            if (volume && !volume.chapter) {
                let volStart = volume.volume.index;
                result.volume = volume.text.substring(volStart);

                let volIndex = result.volume.match(/\d+([,.]\d+)?/);
                result.volIndex = volIndex && volIndex[0];

                if (volStart) {
                    result.novel = chapter.text.substring(0, volStart).trim();
                }
            }
        }

        const [, abbrev] = titleAbbrRegex();

        if (!result.novel) {
            let novelCandidates;
            let above;

            novelCandidates = (
                (above = (chapter || volume)) ? filterNotBelow(candidates, above.node) : candidates
            ).reverse();

            let novelCandidate;

            for (let candidate of novelCandidates) {
                if (abbrev) {
                    if (candidate.novelAbbr) {
                        novelCandidate = candidate;
                        break;
                    }
                } else {
                    const otherMatch = candidate.volume || candidate.chapter;

                    if (otherMatch) {
                        if (otherMatch.index) {
                            novelCandidate = candidate;
                            break;
                        }
                    } else {
                        if (candidate.pathScore >= 1.5 || candidate.titleScore >= 1.5) {
                            if (result.chapter && candidate.text.includes(candidate.text)) {
                                continue;
                            }
                            novelCandidate = candidate;
                            break;
                        }
                    }
                }
            }
            if (novelCandidate) {
                const splitMatch = novelCandidate.volume || novelCandidate.chapter;

                result.novel = splitMatch ?
                    novelCandidate.text.substring(0, splitMatch.index) :
                    novelCandidate.text;
            } else if (abbrev) {
                result.novel = abbrev[0];
            }
        }

        function trimSeparators(s) {
            return s.trim().replace(/(^[|\-–\\\/>»])|([|\-–\\\/>»]$)/g, "").trim();
        }

        if (result.novel) {
            result.novel = trimSeparators(result.novel);
        }
        if (result.volume) {
            result.volume = trimSeparators(result.volume);
        }
        if (result.chapter) {
            result.chapter = trimSeparators(result.chapter);
        }
        return result;
    }

    /**
     *
     * @param {Array} candidates
     */
    function scoreCandidates(candidates) {
        const likelyChapReg = /(\W|^)((ch(apter|(\.?\s?\d+)))|c\d+|episode|((extra|intermission|side.story).+))([^a-z]|$)/i;
        const probableChapReg = /(\W|^)part([^a-z]|$)/i;
        const likelyChapRegSensitive = /(\W|^)SS([^a-z]|$)/;
        const likelyVolReg = /(\W|^)(Vol(ume|\.)|v\d+|Arc|book)([^a-z]|$)/i;
        const volChapReg = /(\d+)-(\d+)/;
        const number = /\d+/;

        candidates.forEach(value => {
            value.score = 0;
            value.titleScore = 0;
            value.pathScore = 0;

            if (value.chapter = (likelyChapReg.exec(value.text) || likelyChapRegSensitive.exec(value.text))) {
                value.score += 5;
            }

            if (value.volume = likelyVolReg.exec(value.text)) {
                value.score += 5;
            }

            let volChap;

            if (volChap = volChapReg.exec(value.text)) {
                let chap = Object.assign({}, volChap);
                chap[0] = chap[2];
                chap.index = chap.index + chap[1].length + 1;
                value.chapter = chap;

                volChap[0] = volChap[1];
                value.volume = volChap;
                value.score += 3;
            }

            let novelAbbrChap;

            if (value.novelAbbr && !value.volume && !value.chapter && (novelAbbrChap = number.exec(value.text.substring(value.novelAbbr.index)))) {
                value.chapter = novelAbbrChap;
                value.score += 3;
            }

            if (value.chapter && /\d+/.test(value.text)) {
                value.score += 2;
            }

            if (value.heading) {
                value.score += 2;
            }

            if (value.breadcrumb) {
                value.score++;
            }

            if (probableChapReg.test(value.text)) {
                value.score++;
            }

            if (value.novelAbbr) {
                value.score++;
            }

            if (value.chapter && value.link) {
                value.score--;
            }

            if (value.path) {
                for (let matchSnippet of value.path) {

                    let matches = 0;

                    for (let match of matchSnippet) {
                        if (match.match.length) {
                            matches++;
                        }
                    }

                    const perc = matchSnippet.length && matches / matchSnippet.length;
                    //a bonus value between 0 and 3
                    let pathScore = Number((3 * perc).toFixed(3));
                    value.score += pathScore;
                    value.pathScore += pathScore;
                }
            }

            if (value.title) {
                for (let matchSnippet of value.title) {

                    let matches = 0;

                    for (let match of matchSnippet) {
                        if (match.match.length) {
                            matches++;
                        }
                    }

                    const perc = matchSnippet.length && matches / matchSnippet.length;
                    //a bonus value between 0 and 3
                    let titleScore = Number((3 * perc).toFixed(3));

                    value.score += titleScore;
                    value.titleScore += titleScore;
                }
            }
        });
    }

    function filterNotBelow(array, element, threshold) {
        let result = [];

        for (let item of array) {
            if (isBelow(item.node, element) || (threshold && belowChildThreshold(item.node, element, threshold))) {
                break;
            } else {
                result.push(item);
            }
        }
        return result;
    }

    function belowChildThreshold(node, ancestor, threshold) {
        threshold = Math.floor(ancestor.nodePosition.length * threshold);
        return isAncestor(node, ancestor) && node.nodePosition[ancestor.nodePosition] <= threshold;
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
            let splitter = /\s/;
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
                    text = textNode.data.split(splitter).map(s => s[0].toUpperCase() + s.substring(1)).join(" ");
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

    function* parents(node) {
        if (!node) {
            return;
        }

        let parent = node;

        while (parent = parent.parentElement) {
            yield parent;
        }
    }

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

    function annotateDOM() {
        let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let node;

        while (node = walker.nextNode()) {
            node.nodePosition = [];
            let parent = node.parentElement;

            if (parent.nodePosition) {
                node.nodePosition.push(...parent.nodePosition);
            }

            let nodeIndex = Array.from(parent.childNodes).indexOf(node);
            node.nodePosition.push(nodeIndex);


            if (node.nodeType === Node.ELEMENT_NODE) {
                node.elementPosition = [];

                if (parent.elementPosition) {
                    node.elementPosition.push(...parent.elementPosition);
                }
                let elementIndex = Array.from(parent.children).indexOf(node);
                node.elementPosition.push(elementIndex);
            }
        }
    }

    function regExpEscape(literal_string) {
        return literal_string.replace(/[-[\]{}()*+!<=:?.\/\\^$|#\s,]/g, '\\$&');
    }

    //FIXME: @kissanime: does not find nodes corresponding to the lines

    return {
        extractMeta(result) {
            annotateDOM();
            const ancestor = closestCommonAncestor(result.start, result.end);
            return title(ancestor);
        },


        extractName(s) {
            //todo implement extraction
            return s;
        },

        extractVolume(s) {
            return s;
        },

        extractEpisode(s) {
            return s;
        },
    };

})();