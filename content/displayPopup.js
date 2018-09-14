const Displayer = (function () {
    const style =
        ".enterprise-popup {" +
        "       position: fixed;" +
        "       color: white;" +
        "       background-color: gray;" +
        "       bottom: 20px;" +
        "       right: 20px;" +
        "       opacity: .2;" +
        "       z-index: 9999;" +
        "     }" +
        "    .enterprise-popup:hover{" +
        "     opacity:.7" +
        "    }" +
        "    .enterprise-popup * {" +
        "     padding: 5px;" +
        "    }";

    // let previousPopup = document.querySelector("body > .enterprise-popup");
    // previousPopup.parentElement.removeChild(previousPopup);

    function addInfo(name, defaultValue = "N/A") {
        const info = document.createElement("div");
        info.innerText = name;

        const infoText = document.createElement("span");
        infoText.innerText = defaultValue;

        info.appendChild(infoText);
        popup.appendChild(info);

        return newText => infoText.innerText = newText;
    }

    const styleElement = document.body.appendChild(document.createElement("style"));
    styleElement.innerText = style;

    const popup = document.body.appendChild(document.createElement("div"));
    popup.className = "enterprise-popup";

    //clean up
    window.addEventListener("unload", () => {
        styleElement.parentElement.removeChild(styleElement);
        popup.parentElement.removeChild(popup);
    });

    const typeSetter = addInfo("Type:", "N/A");
    const progressSetter = addInfo("Progress:", "0");
    const startSetter = addInfo("Start:", "N/A");
    const endSetter = addInfo("End:", "N/A");
    const titleSetter = addInfo("Title:", "N/A");
    const seriesSetter = addInfo("Series:", "N/A");

    return {
        setType: typeSetter,
        setProgress: progressSetter,
        setStart: startSetter,
        setEnd: endSetter,
        setTitle: titleSetter,
        setSeries: seriesSetter,
    };
})();