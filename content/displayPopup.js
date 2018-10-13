//fixme remove this later
// ProgressChecker.onProgress = progress => Display.setProgress(`${(progress * 100).toFixed(1)}%`);

const OverWatch = (function () {
    function addInfo(name, textProcessor, defaultValue = "N/A") {
        const info = document.createElement("div");
        info.innerText = name;

        const infoText = document.createElement("span");
        infoText.innerText = defaultValue;
        info.style.padding = "5px";

        const button = document.createElement("button");
        button.innerText = "*";

        button.style.transitionDuration = "0.4s";
        button.style.border = "none";
        button.style.color = "white";
        button.style.textAlign = "center";
        button.style.textDecoration = "none";
        button.style.display = "inline-block";
        button.style.margin = "4px 2px";
        button.style.fontSize = "16px";
        button.style.cursor = "pointer";
        button.style.border = "2px solid #4CAF50";
        button.style.backgroundColor = "black";
        button.style.color = "white";

        button.addEventListener("mouseenter", () => (button.style.backgroundColor = "white") && (button.style.color = "black"));
        button.addEventListener("mouseleave", () => (button.style.backgroundColor = "black") && (button.style.color = "white"));
        button.addEventListener("click", () => selectText = textProcessor);

        info.appendChild(button);
        info.appendChild(infoText);
        popup.appendChild(info);

        let text;

        return {
            get() {
                return text;
            },


            set(txt) {
                text = infoText.innerText = txt;
            }
        };
    }

    function showPopup() {
        document.body.appendChild(popup);
        showing = true;
    }

    function hidePopup() {
        showing = false;
        popup.parentElement && popup.parentElement.removeChild(popup);
        console.log(name.get(), volume.get(), chapter.get());
    }

    function fadeOut() {
        let opacity = 1;
        return setInterval(() => opacity ? popup.style.opacity = `${opacity -= 0.1}` : hidePopup(), 500);
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
    popup.addEventListener("mouseenter", () => popup.style.opacity = "1" && clearInterval(fadeOutInterval));
    popup.addEventListener("mouseleave", () => fadeOutInterval = fadeOut());

    //clean up
    window.addEventListener("unload blur", () => popup.parentElement && popup.parentElement.removeChild(popup));
    window.addEventListener("show", () => showing && showPopup());

    //if there is a textProcessor('selectText'), get the clicked text and inject it in textProcessor
    window.addEventListener("click", evt => {
        if (evt.target.innerText) {
            if (selectText) {
                selectText(evt.target.innerText);
                selectText = undefined;
            }
        }
    });

    const name = addInfo("Name", txt => MetaExtractor.extractName(txt));
    const volume = addInfo("Volume", txt => MetaExtractor.extractVolume(txt));
    const chapter = addInfo("Episode", txt => MetaExtractor.extractEpisode(txt));

    return {
        start() {
            const result = Analyzer.analyze();

            if (!result) {
                return;
            }

            const meta = MetaExtractor.extractMeta(result);

            if (!meta) {
                return;
            }

            if (result.seeAble) {
                ProgressChecker.setStart(result.start);
                ProgressChecker.setEnd(result.end);
            }

            if (result.durationAble) {
                ProgressChecker.setDurationAble(result.start)
            }

            name.set(meta.novel);
            volume.set(meta.volume);
            chapter.set(meta.chapter);

            showPopup();
        }
    }
})();

browser.runtime.onMessage.addListener((msg) => {
    if (!msg) {
        return
    }

    if (msg.start) {
        //if document is not fully loaded yet, listen to the load event, else start immediately
        if (document.readyState !== "complete") {
            window.addEventListener("load", OverWatch.start);
        } else {
            OverWatch.start();
        }
        return
    }


    //any messages beyond this point are dev messages
    if (msg.animator !== null) {
        if (msg.animator) {
            sendMessage({analyzer: true}, true);
        }
    }
});