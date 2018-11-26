const OverWatch = (function () {
    function addInfo(name, textProcessor, defaultValue = "N/A") {
        const info = document.createElement("div");
        info.innerText = name;

        const infoText = document.createElement("span");
        infoText.innerText = defaultValue;
        info.style.padding = "5px";

        const button = document.createElement("button");
        button.innerText = "$";

        button.style.transitionDuration = "0.4s";
        button.style.border = "none";
        button.style.color = "white";
        button.style.textAlign = "center";
        button.style.textDecoration = "none";
        button.style.display = "inline-block";
        button.style.margin = "4px 5px";
        button.style.padding = "0 5px";
        button.style.fontSize = "10px";
        button.style.cursor = "pointer";
        button.style.border = "2px solid rgb(186, 186, 186)";
        button.style.backgroundColor = "#4d4949";
        button.style.color = "white";

        button.addEventListener("mouseenter", () => (button.style.backgroundColor = "white") && (button.style.color = "black"));
        button.addEventListener("mouseleave", () => (button.style.backgroundColor = "#4d4949") && (button.style.color = "white"));
        button.addEventListener("click", () => selectText = txt => txt.length < 300 && accessor.set(textProcessor(txt)));

        info.appendChild(button);
        info.appendChild(infoText);
        popup.appendChild(info);

        let text;

        const accessor = {
            get() {
                return text;
            },


            set(txt) {
                text = infoText.innerText = txt;
            }
        };
        return accessor;
    }

    function showPopup() {
        document.body.appendChild(popup);
        showing = true;
        fadeOut();
    }

    function hidePopup() {
        showing = false;
        popup.parentElement && popup.parentElement.removeChild(popup);
        clearInterval(fadeOutInterval);

        sendMessage({
            overWatch: {
                name: name.get(),
                volume: volume.get(),
                chapter: chapter.get(),
                url: document.location.href,
            }
        }).catch(error => console.log(error))
            .then(() => console.log("message send"));
    }

    function fadeOut() {
        fadeOutInterval && clearInterval(fadeOutInterval);
        let opacity = 1;

        console.log("fading...");
        fadeOutInterval = setInterval(
            () => opacity > 0 ? popup.style.opacity = `${opacity -= 0.01}` : hidePopup(),
            50
        );
    }

    let showing;
    let selectText;
    const popup = document.createElement("div");

    popup.style.position = "fixed";
    popup.style.color = "white";
    popup.style.backgroundColor = "gray";
    popup.style.right = "20px";
    popup.style.bottom = "20px";
    popup.style.zIndex = "9999";

    //fadeOut of popup, resets then mouse enters and leaves
    let fadeOutInterval;
    popup.addEventListener("mouseenter", () => (popup.style.opacity = "1") && clearInterval(fadeOutInterval));
    //fadeOut only on mouseLeave if no selectText is active
    popup.addEventListener("mouseleave", () => !selectText && fadeOut());

    //clean up
    window.addEventListener("unload blur", () => popup.parentElement && popup.parentElement.removeChild(popup));
    window.addEventListener("show", () => showing && showPopup());

    //if there is a textProcessor('selectText'), get the clicked text and inject it in textProcessor
    window.addEventListener("click", evt => {
        let node = evt.target;
        let ignore = node === popup;

        if (!ignore) {
            while (node = node.parentElement) {
                if (ignore = node === popup) {
                    break;
                }
            }
        }

        if (!ignore) {
            selectText && node.innerText && selectText(node.innerText);
            selectText = undefined;
            fadeOut();
        }
    });

    const name = addInfo("Name", txt => MetaExtractor.extractName(txt));
    const volume = addInfo("Volume", txt => MetaExtractor.extractVolume(txt));
    const chapter = addInfo("Episode", txt => MetaExtractor.extractEpisode(txt));
    let result;


    /**
     * Removes properties which may not be
     * messageAble through the browser.runtime.sendMessage
     * API.
     *
     * @param {Result|Array<Result>} result
     * @return {Result|Array<Result>}
     */
    function packageResult(result) {
        if (Array.isArray(result)) {
            return result.map(value => packageResult(value));
        }
        let copy = Object.assign({}, result);

        //remove properties with node interface
        delete copy.start;
        delete copy.end;
        delete copy.ancestor;

        return copy;
    }

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
            result = packageResult(metaResults);

            //todo display multiple results in a scrollable list
            name.set(metaResults.novel);
            volume.set(metaResults.volume);
            chapter.set(metaResults.chapter);

            //fixme uncomment this
            // showPopup();
            return result;
        }
    }
})();

listenMessage((msg, sender) => {
    console.log("from", sender, "got", msg);

    if (msg.start) {
        //if document is not fully loaded yet, listen to the load event, else start immediately
        if (document.readyState !== "complete") {
            window.addEventListener("load", () => {
                try {
                    OverWatch.start();
                } catch (e) {
                    console.log(e);
                }
            });
        } else {
            try {
                OverWatch.start();
            } catch (e) {
                console.log(e);
            }
        }
        return;
    }

    //any messages beyond this point are dev messages
    if (msg.animator !== null) {
        if (msg.animator) {
            sendMessage({analyzer: true}, true);
        }
    }
});