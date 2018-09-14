browser.devtools.panels.create(
    "My Panel",                      // title
    "../img/config_icon.png",                // icon
    "panel.html"      // content
)
    .then(panel => {
        console.log(panel);
    })
    .catch(console.log);

console.log(this);
console.log(browser.devtools);
console.log(browser.devtools && browser.devtools.inspectedWindow);

/**
 * @type browser.runtime.Port
 */
let devDocPort;

/*
browser.runtime.onConnect.addListener((port) => {
    console.log("obtained", port);
    if (port.name === "animator") {
        devDocPort = port;
        //exchange message between devDocPort and analyzer
        //first send to backgroundScript, which sends it to content script
        devDocPort.onMessage.addListener(msg => backgroundPort.postMessage(msg));

        //if a port disconnected, remove it
        devDocPort.onDisconnect.addListener(() => devDocPort = undefined);
    }
});

/!**
 * @type browser.runtime.Port
 *!/
let backgroundPort = browser.runtime.connect({name: "dev"});
backgroundPort.onMessage.addListener(msg => {
    console.log("background", msg);
    devDocPort && devDocPort.postMessage(msg);
});*/
