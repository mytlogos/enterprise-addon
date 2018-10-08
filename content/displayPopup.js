const Display = (function () {
    function addInfo(name, defaultValue = "N/A") {
        const info = document.createElement("div");
        info.innerText = name;

        const infoText = document.createElement("span");
        infoText.innerText = defaultValue;

        info.appendChild(infoText);
        popup.appendChild(info);
        info.style.padding = "5px";

        return newText => infoText.innerText = newText;
    }

    const popup = document.body.appendChild(document.createElement("div"));

    popup.style.position = "fixed";
    popup.style.color = "white";
    popup.style.backgroundColor = "gray";
    popup.style.right = "20px";
    popup.style.bottom = "20px";
    popup.style.opacity = ".2";
    popup.style.zIndex = "9999";

    popup.addEventListener("mouseenter", () => popup.style.opacity = ".7");
    popup.addEventListener("mouseleave", () => popup.style.opacity = ".2");

    //clean up
    window.addEventListener("unload blur", () => popup.parentElement.removeChild(popup));
    window.addEventListener("show", () => document.body.appendChild(popup));

    return {
        setType: addInfo("Type:", "N/A"),
        setProgress: addInfo("Progress:", "0"),
        setStart: addInfo("Start:", "N/A"),
        setEnd: addInfo("End:", "N/A"),
        setTitle: addInfo("Title:", "N/A"),
        setSeries: addInfo("Series:", "N/A"),
    };
})();