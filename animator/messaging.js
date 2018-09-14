let backgroundPort = browser.runtime.connect({name: "dev"});

backgroundPort.onMessage.addListener(msg => {
    //important that it is != and not !==, else it is mostly true because undefined !== null
    if (msg.analyzer != null) {
        if (msg.analyzer) {
            clearInterval(intervalId);
            intervalId = undefined;
            if (msg.url) {
                history.clear();
                url = msg.url;
            } else {
                throw Error("no url for animator!");
            }
        } else {
            sendMessage({animator: true});
        }
    }

    if (msg.tree && url) {
        if (msg.url !== url) {
            throw Error(`receiving message from unexpected url: ${msg.url}, expected: ${url}`);
        }

        if (msg.tree.finished) {
            history.showAll();
        } else {
            updateTree(msg.tree);
        }
    }
});

function sendMessage(message) {
    message.url = url;
    backgroundPort.postMessage({msg: message, id: browser.devtools.inspectedWindow.tabId})
}

let intervalId;
sendMessage({animator: true});

/*

function beat() {
    if (intervalId !== undefined){
        return
    }
    intervalId = setInterval(() => {
        console.log("beating");
    }, 1000);
}*/
