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

    return {
        start() {
            const result = Analyzer.analyze();

            if (!result) {
                return;
            }

            let meta = MetaExtractor.extractMeta(result);

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

browser.runtime.onMessage.addListener((msg, sender) => {

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