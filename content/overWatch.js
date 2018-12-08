const OverWatch = (function () {
    function addInfo(name, parent, defaultValue = "N/A") {
        const container = document.createElement("div");
        container.style.boxSizing = "initial";

        const identifier = document.createElement("span");
        identifier.innerText = name;
        identifier.style.color = "#f7f7f7";
        identifier.style.display = "inline-block";
        identifier.style.boxSizing = "initial";

        const valueInput = document.createElement("input");
        valueInput.setAttribute("type", "text");
        valueInput.value = defaultValue;
        valueInput.spellcheck = false;

        valueInput.style.outlineWidth = "0";
        valueInput.style.border = "none";
        valueInput.style.borderWidth = "0";
        valueInput.style.borderRadius = "0";
        valueInput.style.boxShadow = "none";
        valueInput.style.textShadow = "none";
        valueInput.style.backgroundColor = "#656161";
        valueInput.style.color = "#e2e2e2";
        valueInput.style.paddingRight = "0";
        valueInput.style.display = "inline-block";
        valueInput.style.boxSizing = "initial";

        let oldValues = [];
        valueInput.addEventListener("focus", () => oldValues.push(valueInput.value));
        valueInput.addEventListener("blur", () => {
            let value = accessor.value = valueInput.value;

            //if value didn't change, remove oldValue from 'history'
            if (oldValues[oldValues.length - 1] === value) {
                oldValues.pop();
            }
        });

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
        container.appendChild(valueInput);

        parent.appendChild(container);

        let text;

        const accessor = {
            get value() {
                return text;
            },


            set value(txt) {
                text = valueInput.value = txt || "";
            },

            resize(factor) {
                container.style.height = `${23 / factor}px`;
                container.style.width = `${240 / factor}px`;
                container.style.padding = `${5 / factor}px`;
                container.style.fontSize = `${16 / factor}px`;

                identifier.style.width = `${52 / factor}px`;

                valueInput.style.fontSize = `${12 / factor}px`;
                valueInput.style.width = `${150 / factor}px`;
                valueInput.style.height = `${20 / factor}px`;
                valueInput.style.paddingLeft = `${2 / factor}px`;
                valueInput.style.paddingTop = `${1 / factor}px`;
                valueInput.style.paddingBottom = `${1 / factor}px`;

                button.style.margin = `${4 / factor}px ${5 / factor}px`;
                button.style.padding = `0 ${5 / factor}px`;
                button.style.fontSize = `${10 / factor}px`;
                button.style.border = `${2 / factor}px solid rgb(186, 186, 186)`;
                button.style.height = `${15 / factor}px`;
            },

            remove() {
                container.parentElement && container.parentElement.removeChild(container);
            },

            reset() {
                oldValues.length = 0;
            },

            history() {
                return [...oldValues];
            }
        };
        return accessor;
    }

    function createItem(container = popup.node) {
        let itemContainer = document.createElement("div");
        container.appendChild(itemContainer);

        itemContainer.style.boxSizing = "initial";

        let name = addInfo("Name", itemContainer);
        let volume = addInfo("Volume", itemContainer);
        let chapter = addInfo("Episode", itemContainer);

        let value;
        let previousFilter;
        let previousBorder;
        let highlighting;

        function highlight() {
            highlighting = true;

            previousFilter = value.ancestor.style.filter;
            previousBorder = value.ancestor.style.border;

            value.ancestor.style.border = "5px solid gray";

            let filter = window.getComputedStyle(value.ancestor).filter;
            let brightnessReg = /brightness\((\d+)(%?)\)/;

            let brightness = "50%";

            let previousBrightness;
            if (previousBrightness = filter.match(brightnessReg)) {
                brightness = (previousBrightness[1] / 2) + previousBrightness[2];
            }

            let newBrightness = `brightness(${brightness})`;

            //stay minimal invasive, replace available brightness filter with own
            //but let other filter as they are
            if (previousFilter) {
                let currentBrightness;

                if (currentBrightness = brightnessReg.exec(previousFilter)) {
                    //make value of ancestor darker
                    value.ancestor.style.filter = previousFilter.replace(currentBrightness[0], newBrightness);
                } else {
                    //make value of ancestor darker
                    value.ancestor.style.filter = previousFilter + " " + newBrightness;
                }
            } else {
                //make value of ancestor darker
                value.ancestor.style.filter = newBrightness;
            }
        }


        //highlight element of value by darkening its brightness
        itemContainer.addEventListener("mouseenter", () => {
            if (!value) {
                return;
            }
            highlight();
        });

        function stopHighlight() {
            highlighting = false;
            value.ancestor.style.filter = previousFilter;
            value.ancestor.style.border = previousBorder;
        }

        itemContainer.addEventListener("mouseleave", () => {
            if (!value) {
                return;
            }
            stopHighlight();
        });

        const rejectButton = document.createElement("button");
        rejectButton.style.transitionDuration = "0.4s";
        rejectButton.style.border = "none";
        rejectButton.style.color = "white";
        rejectButton.style.textAlign = "center";
        rejectButton.style.textDecoration = "none";
        rejectButton.style.display = "inline-block";
        rejectButton.style.cursor = "pointer";
        rejectButton.style.backgroundColor = "rgb(77, 73, 73)";
        rejectButton.style.textShadow = "none";
        rejectButton.style.boxShadow = "none";
        rejectButton.style.borderRadius = "0";
        rejectButton.style.boxSizing = "initial";
        rejectButton.style.lineHeight = "initial";
        rejectButton.style.padding = "0px";

        itemContainer.appendChild(rejectButton);

        rejectButton.addEventListener(
            "mouseenter",
            () => (rejectButton.style.backgroundColor = "white") && (rejectButton.style.color = "black")
        );
        rejectButton.addEventListener(
            "mouseleave",
            () => (rejectButton.style.backgroundColor = "#4d4949") && (rejectButton.style.color = "white")
        );

        //send message to background that user rejected this result
        //and remove this item and evtl. the popup too if it is empty
        rejectButton.addEventListener("click", () => {
            //remove value and untrack
            if (value) {
                sendResult(value, false);

                if (Array.isArray(result)) {
                    let index = result.indexOf(value);

                    if (index >= 0) {
                        result.splice(index, 1);
                    }
                } else if (result === value) {
                    result = undefined;
                }

                ResultTracker.unTrack(value);
            }
            item.remove();

            if (Array.isArray(display)) {
                let index = display.indexOf(item);

                if (index >= 0) {
                    display.splice(index, 1);
                }
            }

            if (!popup.node.childNodes.length) {
                popup.removePopup();
            }
        });
        rejectButton.innerText = "Reject";

        itemContainer.addEventListener("click", evt => {
            //target needs to be an element
            let tag = evt.target.tagName.toLowerCase();

            if (tag === "input" || tag === "button") {
                return;
            }
            if (highlighting) {
                stopHighlight();
            } else {
                highlight();
            }
        });


        let item = {
            name: name,
            volume: volume,
            chapter: chapter,

            resize(factor = 1) {
                this.name.resize(factor);
                this.chapter.resize(factor);
                this.volume.resize(factor);

                rejectButton.style.margin = `${4 / factor}px ${4 / factor}px`;
                rejectButton.style.fontSize = `${10 / factor}px`;
                rejectButton.style.height = `${15 / factor}px`;
                rejectButton.style.width = `${52 / factor}px`;

                itemContainer.style.height = `${120 / factor}px`;
                itemContainer.style.width = `${250 / factor}px`;
            },

            even() {
                itemContainer.style.backgroundColor = "#8c8c8c";
            },

            odd() {
                itemContainer.style.backgroundColor = "#777777";
            },

            remove() {
                popup.removeChild(itemContainer)
            },

            setData(data) {
                value = data;

                this.volume.value = data.volume;
                this.chapter.value = data.chapter;
                this.name.value = data.novel;

                if (!itemContainer.parentElement) {
                    popup.node.appendChild(itemContainer);
                }
            },

            stopHighlight
        };
        return item;
    }

    function displayResult(newResult) {
        let newIsArray = Array.isArray(newResult);

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
                    display[i].setData(newResult[i])
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
                display.setData(newResult);
            }
        } else if (newIsArray) {
            display = [display];
            adjustItemSize();

            //set values of items
            for (let i = 0; i < newResult.length; i++) {
                display[i].setData(newResult[i]);
            }
        } else {
            //if neither of both are arrays, just set new values
            display.setData(newResult);
        }
        result = newResult;
    }

    const popup = (function () {
        const popupNode = document.createElement("div");
        let showing;
        //fadeOut of popup, resets then mouse enters and leaves
        let fadeOutInterval;

        popupNode.className = internalPopupClass;

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
                popup.removePopup();
                sendResult(result);
            },

            removePopup() {
                clearInterval(fadeOutInterval);
                showing = false;
                if (display) {
                    singleMultiAction(display, value => value.stopHighlight());
                }
                popupNode.parentElement && popupNode.parentElement.removeChild(popupNode);
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
                popupNode.style.height = `${120 / factor}px`;
            },
        }
    })();

    function sendResult(result, accept = true) {
        if (!result) {
            return;
        }
        sendMessage({
            overWatch: {
                result: packageResult(result),
                accept: accept,
                url: document.location.href,
            }
        }).catch(error => console.log(error))
            .then(() => console.log("message send"));

        if (!accept) {

        }
    }

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

        singleMultiAction(display, value => value.resize(ratio));
    }, 100);

    /**
     *
     * @param {Array<{trackAble: Result, progress: number}>} progressed
     */
    ResultTracker.onProgress = progressed => {
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

            ResultTracker.track(metaResults);

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