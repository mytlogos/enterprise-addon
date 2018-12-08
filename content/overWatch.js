const OverWatch = (function () {
    function addInfo(name, parent, defaultValue = "N/A") {
        const container = document.createElement("div");
        container.style.boxSizing = "initial";

        const identifier = document.createElement("span");
        identifier.innerText = name;
        identifier.style.color = "#f7f7f7";
        identifier.style.display = "inline-block";
        identifier.style.boxSizing = "initial";

        const infoInput = document.createElement("input");
        infoInput.setAttribute("type", "text");
        infoInput.value = defaultValue;
        infoInput.spellcheck = false;

        infoInput.style.outlineWidth = "0";
        infoInput.style.border = "none";
        infoInput.style.borderWidth = "0";
        infoInput.style.borderRadius = "0";
        infoInput.style.boxShadow = "none";
        infoInput.style.textShadow = "none";
        infoInput.style.backgroundColor = "#656161";
        infoInput.style.color = "#e2e2e2";
        infoInput.style.paddingRight = "0";
        infoInput.style.display = "inline-block";
        infoInput.style.boxSizing = "initial";

        const button = document.createElement("button");
        button.innerText = "$";

        button.style.transitionDuration = "0.4s";
        button.style.border = "none";
        button.style.color = "white";
        button.style.textAlign = "center";
        button.style.textDecoration = "none";
        button.style.display = "inline-block";
        button.style.cursor = "pointer";
        button.style.backgroundColor = "#4d4949";
        button.style.textShadow = "none";
        button.style.boxShadow = "none";
        button.style.borderRadius = "0";
        button.style.boxSizing = "initial";
        button.style.lineHeight = "initial";
        button.style.color = "white";

        button.addEventListener("mouseenter", () => (button.style.backgroundColor = "white") && (button.style.color = "black"));
        button.addEventListener("mouseleave", () => (button.style.backgroundColor = "#4d4949") && (button.style.color = "white"));
        button.addEventListener("click", () => selectText = txt => {
            //if you selected an element with too much text, its not a viable title
            if (txt.length >= 300) {
                return;
            }
            accessor.set(txt)
        });

        container.appendChild(identifier);
        container.appendChild(button);
        container.appendChild(infoInput);

        parent.appendChild(container);

        let text;

        const accessor = {
            get value() {
                return text;
            },


            set value(txt) {
                text = infoInput.value = txt || "";
            },

            resize(factor) {
                container.style.height = `${23 / factor}px`;
                container.style.width = `${240 / factor}px`;
                container.style.padding = `${5 / factor}px`;
                container.style.fontSize = `${16 / factor}px`;

                identifier.style.width = `${52 / factor}px`;

                infoInput.style.fontSize = `${12 / factor}px`;
                infoInput.style.width = `${150 / factor}px`;
                infoInput.style.height = `${20 / factor}px`;
                infoInput.style.paddingLeft = `${2 / factor}px`;
                infoInput.style.paddingTop = `${1 / factor}px`;
                infoInput.style.paddingBottom = `${1 / factor}px`;

                button.style.margin = `${4 / factor}px ${5 / factor}px`;
                button.style.padding = `0 ${5 / factor}px`;
                button.style.fontSize = `${10 / factor}px`;
                button.style.border = `${2 / factor}px solid rgb(186, 186, 186)`;
                button.style.height = `${15 / factor}px`;
            },

            remove() {
                container.parentElement && container.parentElement.removeChild(container);
            }
        };
        return accessor;
    }

    function createItem(container = popup.node) {
        let intermediateContainer = document.createElement("div");
        container.appendChild(intermediateContainer);

        intermediateContainer.style.boxSizing = "initial";

        let name = addInfo("Name", intermediateContainer);
        let volume = addInfo("Volume", intermediateContainer);
        let chapter = addInfo("Episode", intermediateContainer);

        return {
            name: name,
            volume: volume,
            chapter: chapter,

            resize(factor = 1) {
                this.name.resize(factor);
                this.chapter.resize(factor);
                this.volume.resize(factor);

                intermediateContainer.style.height = `${100 / factor}px`;
                intermediateContainer.style.width = `${250 / factor}px`;
            },

            even() {
                intermediateContainer.style.backgroundColor = "#8c8c8c";
            },

            odd() {
                intermediateContainer.style.backgroundColor = "#777777";
            },

            remove() {
                popup.removeChild(intermediateContainer)
            },
        };
    }

    function displayResult(newResult) {
        let newIsArray = Array.isArray(newResult);

        function setDisplayValues(displayItem, item) {
            displayItem.volume.value = item.volume;
            displayItem.chapter.value = item.chapter;
            displayItem.name.value = item.novel;
        }

        function adjustItemSize() {
            let sizeDifference = popup.node.childNodes.length - newResult.length;

            if (sizeDifference > 0) {
                //we need to remove items
                for (let i = 0; i < sizeDifference; i++) {
                    display.shift().remove();
                }
            } else if (sizeDifference = Math.abs(sizeDifference)) {
                //we need to append items
                for (let i = 0; i < sizeDifference; i++) {
                    let item = createItem();
                    item.resize(oldRatio || 1);
                    display.push(item);
                }
            }

            for (let i = 0; i < display.length; i++) {
                console.log(i);
                if (i % 2 === 0) {
                    display[i].even();
                } else {
                    display[i].odd();
                }
            }
        }

        if (Array.isArray(result)) {
            if (newIsArray) {
                adjustItemSize();

                //set values of items
                for (let i = 0; i < newResult.length; i++) {
                    setDisplayValues(display[i], newResult[i]);
                }
            } else {
                //old Value was an array, now its a single
                //change from multi to single mode
                let deleteLength = display.length - 1;
                for (let i = 0; i < deleteLength; i++) {
                    display.shift().remove();
                }
                display = display[0];
                display.even();
                setDisplayValues(display, newResult);
            }
        } else if (newIsArray) {
            display = [display];
            adjustItemSize();

            //set values of items
            for (let i = 0; i < newResult.length; i++) {
                setDisplayValues(display[i], newResult[i]);
            }
        } else {
            //if neither of both are arrays, just set new values
            setDisplayValues(display, newResult);
        }
        result = newResult;
    }

    const popup = (function () {
        const popupNode = document.createElement("div");
        let showing;
        //fadeOut of popup, resets then mouse enters and leaves
        let fadeOutInterval;

        popupNode.className = "enterprise-popup";

        popupNode.style.position = "fixed";
        popupNode.style.overflowY = "auto";
        popupNode.style.color = "white";
        popupNode.style.backgroundColor = "gray";
        popupNode.style.zIndex = "9999";
        popupNode.style.lineHeight = "normal";
        popupNode.style.fontFamily = "initial";
        popupNode.style.boxSizing = "initial";

        popupNode.addEventListener("mouseenter", () => (popupNode.style.opacity = "1") && clearInterval(fadeOutInterval));
        //fadeOut only on mouseLeave if no selectText is active
        popupNode.addEventListener("mouseleave", () => !selectText && popup.fadeOut());

        //clean up
        window.addEventListener("unload blur", () => popupNode.parentElement && popupNode.parentElement.removeChild(popupNode));
        window.addEventListener("show", () => showing && popup.showPopup());

        return {
            node: popupNode,

            removeChild(child) {
                popupNode.removeChild(child);
            },

            showPopup() {
                document.body.appendChild(popupNode);
                showing = true;
                popup.fadeOut();
            },

            hidePopup() {
                showing = false;
                popupNode.parentElement && popupNode.parentElement.removeChild(popupNode);
                clearInterval(fadeOutInterval);

                sendMessage({
                    overWatch: {
                        result: packageResult(result),
                        url: document.location.href,
                    }
                }).catch(error => console.log(error))
                    .then(() => console.log("message send"));
            },

            fadeOut() {
                fadeOutInterval && clearInterval(fadeOutInterval);
                let opacity = 1;

                fadeOutInterval = setInterval(
                    () => opacity > 0 ? popupNode.style.opacity = `${opacity -= 0.01}` : popup.hidePopup(),
                    50
                );
            },

            resize(factor) {
                popupNode.style.right = `${20 / factor}px`;
                popupNode.style.bottom = `${20 / factor}px`;
                popupNode.style.padding = `${5 / factor}px`;
                popupNode.style.width = `${250 / factor}px`;
                popupNode.style.height = `${100 / factor}px`;
            },
        }
    })();

    //if there is a textProcessor('selectText'), get the clicked text and inject it in textProcessor
    window.addEventListener("click", evt => {
        let node = evt.target;
        let ignore = node === popup.node;

        if (!ignore) {
            while (node = node.parentElement) {
                if (ignore = node === popup.node) {
                    break;
                }
            }
        }

        if (!ignore) {
            selectText && node.innerText && selectText(node.innerText);
            selectText = undefined;
            popup.fadeOut();
        }
    });

    let oldRatio;
    let selectText;
    let result;
    let display = createItem();

    /**
     * Removes properties which may not be
     * messageAble through the browser.runtime.sendMessage
     * API.
     *
     * @param {Result|Array<Result>} result
     * @return {void|Result|Array<Result>}
     */
    function packageResult(result) {
        if (!result) {
            return;
        } else if (Array.isArray(result)) {
            return result.map(value => packageResult(value));
        }

        let copy = Object.assign({}, result);

        //remove properties with node interface
        delete copy.start;
        delete copy.end;
        delete copy.ancestor;

        return copy;
    }

    setInterval(() => {
        let ratio = window.devicePixelRatio;

        if (ratio === oldRatio) {
            return;
        }

        oldRatio = ratio;

        popup.resize(ratio);

        if (Array.isArray(display)) {
            for (let item of display) {
                item.resize(ratio);
            }
        } else {
            display.resize(ratio);
        }
    }, 100);

    /**
     *
     * @param {Array<{trackAble: Result, progress: number}>} progressed
     */
    ProgressChecker.onProgress = progressed => {
        let progress = progressed.map(value => {
            let {trackAble, progress} = value;

            //remove properties with node interface
            let trackAbleCopy = packageResult(trackAble);

            trackAbleCopy.progress = progress;
            console.log(trackAbleCopy);
            return trackAbleCopy;
        });

        sendMessage({overWatch: {progress}}).catch(error => console.log(error));
    };

    return {
        start() {
            const analyzeResult = Analyzer.analyze();

            if (!analyzeResult) {
                console.log("no analyze results");
                return "no analyze";
            }
            console.log(analyzeResult);

            let metaResults = MetaExtractor.extractMeta(analyzeResult);

            if (!metaResults) {
                console.log("no meta results");
                return "no meta";
            }

            ProgressChecker.track(metaResults);

            displayResult(metaResults);

            popup.showPopup();
            return result;
        }
    }
})();

listenMessage(msg => {
    if (msg.start) {
        //if document is not fully loaded yet, listen to the load event, else start immediately
        Ready.onReady = () => OverWatch.start();
        return;
    }

    //any messages beyond this point are dev messages
    if (msg.animator !== null) {
        if (msg.animator) {
            sendMessage({analyzer: true}, true);
        }
    }
});

//todo if user replaced analyzed text, save it as old-new pair and replace it
//todo immediately if a certain replace-times-threshold exceeded,
//todo do it only if 'new' word is available in a candidate/innerText/lineNodes
//todo send pairs to server, get previous pairs in start signal