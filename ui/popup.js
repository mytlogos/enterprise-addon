const active = "active";
const inactive = "inactive";
const error = "error";
const unknown = "unknown";


(function () {
    let active_switch = document.getElementById("active_switch");

    active_switch.addEventListener("click", () => {
        let state;
        if (active_switch.checked) {
            state = active;
        } else {
            state = inactive;
        }
        // noinspection JSIgnoredPromiseFromCall
        browser.runtime.sendMessage({state})
            .then(accepted => {
                console.log(accepted);
                //if background did not accept any change to state, just set it as false
                if (!accepted.state) {
                    active_switch.checked = false;
                }
            });
    });

    //add click handler to openBtn to open the extensionPage in a new Tab in the same window
    document.getElementById("open").addEventListener("click", ev => {
        // zero is the left mouse-button
        if (ev.button === 0) {
            //if opening the extension page succeeded, close popup, else print error msg to console
            browser.tabs
                .create({url: "http://localhost/"})
                .then(() => window.close())
                .catch(error => console.log(`error while opening extension page: ${error}`));
        }
    });

    browser.runtime.sendMessage({state: unknown})
        .then(msg => {
            console.log(msg);
            if (msg && msg.state) {
                if (msg.state === active) {
                    active_switch.checked = true;
                } else if (msg.state === inactive) {
                    active_switch.checked = false;
                } else if (msg.state === error) {
                    //todo change display in case of error
                }
            }
        })
        .catch(console.log);
})();
