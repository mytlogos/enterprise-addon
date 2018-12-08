const unknown = "unknown";

const user = Observable({
    name: "",
    session: "",
    uuid: "",

    /**
     *
     * @param {string} name
     * @return {this}
     */
    setName(name) {
        validateString(name);
        this.name = name;
        return this;
    },

    /**
     *
     * @param {string} uuid
     * @return {this}
     */
    setId(uuid) {
        validateString(uuid);
        this.uuid = uuid;
        return this;
    },

    /**
     *
     * @param {string} session
     * @return {this}
     */
    setSession(session) {
        validateString(session);
        this.session = session;
        return this;
    },

    /**
     *
     * @return {this}
     */
    clear() {
        this.session = "";
        this.uuid = "";
        this.name = "";
        return this;
    }
});


//todo make a export feature?
//todo get more into logging
const states = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    ERROR: "error",

    /**
     *
     * @param key
     * @return {boolean}
     */
    any(key) {
        for (let v in states) {
            if (states[v] === key) {
                return true;
            }
        }
        return false;
    }
};

/**
 * A Wrapper for a given Page.
 * Contains the tabId the page sits in, the activation state for the
 */
class PageWrapper {

    /**
     * The constructor of the PageWrapper.
     *
     * @param {string} host
     * @param {string} url
     * @param {number} tabId
     * @param {number} wrapperId
     */
    constructor(host, url, tabId, wrapperId) {
        this.host = host;
        this.url = url;
        this.tabId = tabId;
        this.wrapperId = wrapperId;

        this.active = states.INACTIVE;
        this.analyzed = false;
        this._scripts = {};
    }

    /**
     * Starts a Analysis on this Page if it is not analyzed yet.
     *
     * @return {void}
     */
    startAnalyzer() {
        if (this.analyzed) {
            return
        }

        this.analyzed = true;
        console.log("starting analyzer for " + this.host);
        this.sendMessage({start: true}).catch(error => console.log(`error starting analyzer: ${error}`))
    }

    /**
     * Changes the icon according the new state of this wrapper.
     * Saves the new state in storage and starts the analyzer if
     * it is the first time the state 'Active' is reached.
     *
     *
     * @param {string} newState
     * @return {void}
     */
    changeState(newState) {

        //Change the state of this extension for a given page, followed by a change of browser action icon
        ExtensionManager.displayState(newState)
            .catch(error => console.log("icon error " + error))
            .then(() => this.active = newState)
            .then(() => UserSystem.saveHostState(this.host, this.active));

        if (newState === states.ACTIVE && !this.analyzed) {
            this.startAnalyzer();
        }
    }

    /**
     * Initiates the link of this Tab.
     * Checks the local state of the host for the current user
     * and changes the state of this wrapper accordingly.
     *
     * @returns {Promise<any[] | void>}
     */
    init() {
        //look if this extension was activated for this host before
        return UserSystem.getState(this.host)
            .then(state => {
                //if there is an state, change to it, else change to INACTIVE
                if (state) {
                    this.changeState(state);
                } else {
                    this.changeState(states.INACTIVE);
                }
            })
            .catch(error => console.log("error setting value", error, this));
    };

    /**
     * Sends a message to all content scripts in the page of this wrapper.
     *
     * @param {Object} message
     * @param {number} attempts
     * @return {Promise<any>}
     */
    sendMessage(message, attempts = 0) {
        //should throw an error only if no content script is available yet,
        //it should be ensured that no code that is executed from message handler
        //throws an error, e.g. all error are caught before it propagates to here
        return browser.tabs.sendMessage(this.tabId, message).catch(error => {
            if (attempts >= 5) {
                console.log(`could not reach any content script ${attempts} with ${error}`);
                return;
            }
            //if no content script was reachable, wait for one second and try again
            return new Promise(resolve => setTimeout(() => resolve(), 1000))
            //DON'T FORGET TO INCREMENT ATTEMPTS!
                .then(() => this.sendMessage(message, ++attempts));
        });
    }

    executeScript(fileName) {
        //execute scripts only once per wrapper/page
        if (this._scripts[fileName]) {
            return;
        }
        this._scripts[fileName] = 1;
        browser.tabs.executeScript(this.tabId, {file: fileName}).catch(console.log);
    }
}

const ExtensionManager = {
    tabs: new Map(),
    devPorts: new Set(),

    /**
     * Gets the Wrapper for this tabId.
     *
     * @param {number} tabId
     * @return {PageWrapper}
     */
    getWrapper(tabId) {
        if (!Number.isInteger(tabId)) {
            throw Error(`id is not a number: '${tabId}'`);
        }
        return this.tabs.get(tabId);
    },

    /**
     * Checks whether the given url is the url of
     * the page from the server of this extension (has only one page!).
     *
     * @param {string} link
     * @return {boolean}
     */
    isExtensionUrl(link) {
        return /(https?:\/\/)?localhost\/?/.test(link)
    },

    /**
     * Change the browserAction icon depending on the state parameter
     * or do nothing if the state is invalid.
     *
     * @param {string} state
     * @return {Promise<void>}
     */
    displayState(state = this.currentActive) {
        let icon;

        if (state === states.ACTIVE) {
            icon = "img/ext_icon_active_";
        } else if (state === states.INACTIVE) {
            icon = "img/ext_icon_inactive_";
        } else if (state === states.ERROR) {
            icon = "img/ext_icon_error_";

        } else {
            //if it is an unknown state, do nothing
            return Promise.reject("unknown state");
        }

        return browser.browserAction.setIcon({
            path: {
                32: icon + "32.png",
                48: icon + "48.png"
            }
        });
    },


    /**
     * Removes the wrapper for this tabId from the tabs if the id match.
     *
     * @param {number} tabId
     */
    removeWrapper(tabId) {
        this.tabs.delete(tabId);
    },

    /**
     * Shortcut to set the activation state of the current selected wrapper.
     *
     * @param {string} state
     */
    set currentActive(state) {
        this.selected && this.selected.changeState(state);
    },

    /**
     * Shortcut to get the activation state of the current selected wrapper.
     *
     * @return {string}
     */
    get currentActive() {
        return this.selected && this.selected.active || states.INACTIVE;
    },

    /**
     * Processes a message from the browserAction popup.
     *
     * @param {object} msg
     * @return {Promise<*>}
     */
    processPopupMsg(msg) {
        if (msg.state) {
            //default response is false
            let responseState = false;

            //only check if user is logged in, else return for everything false
            if (HttpClient.loggedIn && states.any(msg.state) && this.selected) {
                //if there is a selected wrapper, accept with true
                this.currentActive = msg.state;
                responseState = true;
            }
            //respond to browserAction script
            return Promise.resolve(responseState);
        }
        if (msg.unknown) {
            return Promise.resolve({name: user.name, state: this.currentActive});
        }
        if (msg.login) {
            return UserSystem.logIn(msg.login.name, msg.login.psw);
        }

        if (msg.register) {
            return UserSystem.logIn(msg.login.name, msg.login.psw);
        }

        if (msg.user) {
            return Promise.resolve({name: user.name});
        }
    },

    /**
     *
     * @param {Tab} senderTab
     * @param {Object} msg
     */
    processDevMsg(senderTab, msg) {
        let currentPort;

        for (let port of this.devPorts) {
            if (port.id === senderTab.id) {
                currentPort = port;
                break;
            }
        }

        let wrapper = this.getWrapper(senderTab.id);

        if (!wrapper) {
            throw Error(`there cannot be a message from non-existing wrapper with id ${senderTab.id}, ${msg}`);
        }

        if (!wrapper.devCache) {
            wrapper.devCache = [];
        }

        let dev = msg.dev;

        if (currentPort) {

            if (dev.analyzer) {
                currentPort.postMessage(dev);
                console.log("analyzer");
                wrapper.devCache.forEach(value => currentPort.postMessage(value));
            } else {
                currentPort.postMessage(dev);
            }
        }
        if (dev.tree) {
            wrapper.devCache.push(dev);
        }
    },


    /**
     *
     * @param {Object} result
     * @param {browser.tabs.Tab} senderTab
     */
    processOverWatch(result, senderTab) {
        let wrapper = this.getWrapper(senderTab.id);

        if (!wrapper) {
            throw Error(`no wrapper found for '${senderTab.id}'`)
        }

        result.contentSession = wrapper.wrapperId;
        UserSystem.pushMessage(result);
    },

    /**
     * Initiates the listener for the tabs
     * and the communication between content scripts
     * and this background script.
     *
     * @return {void}
     */
    initListener() {
        //react to url changes in tabs, create a new wrapper each time the url changes, even if it reloads
        browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
            let host = ExtensionManager.getHost(changeInfo.url);

            if (!changeInfo.favIconUrl) {
                console.log(tabId, changeInfo);
            }

            //check if url was updated
            if (!host) {
                return
            }

            //don't listen to extensionPage
            if (this.isExtensionUrl(changeInfo.url)) {
                return;
            }

            //create a new wrapper for this page only if user is logged in
            ifLoggedIn(() => {
                let wrapper = this.createWrapper(host, changeInfo.url, tabId);
                //init the wrapper
                wrapper.init().catch(error => console.log(`initiating wrapper failed: ${error}`));

                //if active page is reloaded, set new wrapper as selected
                let previousWrapper = this.getWrapper(tabId);

                if (this.selected === previousWrapper) {
                    this.selected = wrapper;
                }

                //save wrapper with tabId
                this.tabs.set(tabId, wrapper);
            })  //print any errors that could have happened to console
                .catch(console.log);
        });

        //set the selected tab, there can be only one
        browser.tabs.onActivated.addListener(activeInfo => {
            ifLoggedIn(() => {
                browser.tabs
                    .get(activeInfo.tabId)
                    .then(tab => {
                        //check if an wrapper with this tabId is available
                        let wrapper = this.getWrapper(tab.id);

                        //check if that wrapper has the same url as the tab has now, else create a new wrapper
                        if (wrapper && tab.url === wrapper.url) {
                            this.selected = wrapper;
                            this.displayState().catch(console.log);
                        } else {
                            let host = this.getHost(tab);
                            //if there is no valid host, reset selected and return
                            if (!host) {
                                this.selected = undefined;
                                this.displayState().catch(console.log);
                                return
                            }
                            //create a new page wrapper
                            this.selected = this.createWrapper(host, tab.url, tab.id);
                            //replace any previous wrapper for this tab
                            this.tabs.set(tab.id, this.selected);
                            return this.selected.init();
                        }
                    })
                    .catch(error => console.log(`error while setting selected page wrapper ${error}`));
            }).catch(console.log)
        });

        //removes any wrapper with the given tabId
        browser.tabs.onRemoved.addListener(tabId => this.removeWrapper(tabId));

        //reacts to messages from content scripts of pages or the browserAction
        browser.runtime.onMessage.addListener((msg, sender) => {
            //ignore message that are not send from this extension
            if (sender.id !== browser.runtime.id) {
                return;
            }
            console.log(msg, sender);

            //state message come from browserAction popup
            if (msg.popup) {
                try {
                    return this.processPopupMsg(msg.popup);
                } catch (e) {
                    console.log(e);
                }
            }

            //result and progress messages coming from overWatch.js
            if (msg.overWatch && sender && sender.tab) {
                try {
                    this.processOverWatch(msg.overWatch, sender.tab);
                } catch (e) {
                    console.log(e);
                }
            }

            //message from contentScript (analyzer) to devTool
            if (msg.dev && sender && sender.tab) {
                try {
                    this.processDevMsg(sender.tab, msg);
                } catch (e) {
                    console.log(e);
                }
            }
        });

        browser.runtime.onConnect.addListener(port => {
            if (port.name === "dev") {
                this.devPorts.add(port);

                port.onMessage.addListener(msg => {
                    if (msg.id && msg.msg) {
                        if (!port.id) {
                            //ready 'flasher' for mouseOver events
                            this.getWrapper(msg.id).executeScript("animator/flasher.js");
                        }
                        port.id = msg.id;
                        this.getWrapper(msg.id).sendMessage(msg.msg).catch(error => console.log("message error", error));
                    }
                });

                port.onDisconnect.addListener(() => this.devPorts.delete(port));
            }
        });
    },

    /**
     * Returns the host (e.g. 'www.google.com' from 'https://www.google.com/')
     * of the given url or an empty string.
     *
     * @param {string | browser.tabs.Tab} tab or url
     * @returns {string}
     */
    getHost(tab) {
        if (!tab) {
            return ""
        }
        let link = tab.url || tab;
        //check whether the url has a valid protocol
        if (/https?:\/\//.test(link)) {
            try {
                //return the hostName
                return new URL(link).hostname;
            } catch (e) {
                return "";
            }
        }
        return "";
    },

    /**
     * Creates a wrapper with the given parameter.
     *
     * @param {string} host
     * @param {string} url
     * @param {number} tabId
     * @return {PageWrapper}
     */
    createWrapper(host, url, tabId) {
        return new PageWrapper(host, url, tabId, nextWrapperId());
    }
};

/**
 * Returns the next ID number.
 * Starts at zero.
 *
 * @type function
 */
const nextWrapperId = (function () {
    let current = 0;
    return () => current++;
});

//initiate all listener that are relevant for the extensionManager
ExtensionManager.initListener();
//ask initially for login status
UserSystem.loggedIn();

browser.browserAction
    .setPopup({popup: "../ui/popupProducer.html"})
    .catch(error => console.log("could not set popup: ", error));

/**
 * Executes callbacks depending on whether a user is logged in or not.
 *
 *
 * @param {function} cbTrue
 * @param cbFalse
 * @return {Promise<any | never>}
 */
function ifLoggedIn(cbTrue, cbFalse) {
    return new Promise(resolve => {
        if (HttpClient.loggedIn) {
            resolve(cbTrue());
        }
        if (typeof cbFalse === "function") {
            resolve(cbFalse());
        }
    });
}

/**
 * Function to add an listener for session changes for
 * everything that has access to the background page.
 * (especially popupProducer.js)
 *
 * @param {function} listener
 */
function addLoginListener(listener) {
    user.addListener("session", listener);
}

function returnMessage(promise) {

}

function validateString(value) {
    if (!(value && (typeof value === 'string' || value instanceof String))) {
        throw Error(`'${value}' is no valid string input`);
    }
}

function logLocal(key) {
    log(browser.storage.local.get(key))
}

function log(promise) {
    promise.then(console.log)
}

function cD() {
    log(UserSystem.getUuid().then(uid => StoreManager.read(uid)))
}