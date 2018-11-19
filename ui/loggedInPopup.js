const active = "active";
const inactive = "inactive";
const error = "error";
const unknown = "unknown";
const active_switch = document.getElementById("active_switch");

active_switch.addEventListener("click", () => {
    let state;
    if (active_switch.checked) {
        state = active;
    } else {
        state = inactive;
    }
    // noinspection JSIgnoredPromiseFromCall
    browser.runtime.sendMessage({popup: {state}})
        .then(accepted => {
            //if background did not accept any change to state, just set it as false
            if (!accepted) {
                active_switch.checked = false;
            }
        });
});

//add click handler to openBtn to open the extensionPage in a new Tab in the same window
document.querySelector(".open.btn").addEventListener("click", ev => {
    // zero is the left mouse-button
    if (ev.button === 0) {
        //if opening the extension page succeeded, close popup, else print error msg to console
        browser.tabs
            .create({url: "http://localhost:3000/"})
            .then(() => window.close())
            .catch(error => console.log(`error while opening extension page: ${error}`));
    }
});
const radialObj = radialIndicator(".progress", {
    barColor: "#87CEEB",
    barWidth: 10,
    roundCorner: true,
    percentage: true
});

//todo replace browser message with browser backgroundPage
browser.runtime.onMessage.addListener(msg => {
    if (msg.info) {
        processInfo(msg.info);
    }
    if (msg.progress) {
        radialObj.animate(msg.progress);
    }
});

browser.runtime
    .sendMessage({popup: {unknown}})
    .then(msg => {
        if (msg.state) {
            active_switch.checked = msg.state === active;
        }
        if (msg.name) {
            document.querySelector(".user-name").textContent = msg.name;
        }
        if (msg.info) {
            processInfo(msg.info);
        }
    })
    .catch(console.log);

function processInfo(info) {
    document.querySelector(".content").classList.remove("hidden");
    document.querySelector(".nothing").classList.add("hidden");

    document.querySelector(".title").textContent = info.title;
    document.querySelector(".medium").textContent = info.type;
    document.querySelector(".medium-name").textContent = info.name;
    document.querySelector(".action").textContent = info.action;

    if (info.part) {
        document.querySelector(".part-identifier").textContent = info.part.name;
        document.querySelector(".part-name").textContent = info.part.type;
    }
}