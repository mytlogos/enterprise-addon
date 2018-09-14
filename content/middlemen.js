//this content script acts as the middle men between the page script and the background script of this extension
//this content script should only be injected in the SPA associated with this extension
document.addEventListener("message", msg => {
    console.log(msg);
    console.log(this);

    if (msg.source && msg.source !== window || msg.origin && msg.origin !== window.location.href) {
        return
    }
    //sent all messages from page scripts to background script after validating the source
    //sensitive data like mails and passwords are sent through here
    //sends all replies to page script
    browser.runtime.sendMessage(msg.data).then(msg => {
        console.log(msg);
        window.postMessage(msg, window.location.href);
    });
});

browser.runtime.onMessage.addListener(msg => {
    console.log(msg);
    //sent all messages sent to this content script to page script (to all scripts listening to message events)
    //there should not be any truly sensitive data sent here
    document.postMessage(msg, window.location.href);
});


/*(function heartBeat(message, attempts = 0) {
    console.log("heartbeat");
    //send heartbeat to background script
    browser.runtime.sendMessage(message).catch(error => {
        console.log(`could not reach background ${attempts} with ${error}`);
        return new Promise(resolve => setTimeout(() => resolve(), 200)).then(() => this.sendMessage(message, ++attempts));
    });
})({script: {middlemen: true}});*/
