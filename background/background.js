const unknown = "unknown";
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
     * @param {boolean} middlemen
     */
    constructor(host, url, tabId, middlemen = false) {
        this.host = host;
        this.url = url;
        this.tabId = tabId;
        this.middlemen = middlemen;

        this.active = states.INACTIVE;
        this.analyzed = false;
        this._scripts = {};
    }

    /**
     * Starts a Analysis on this Page if it is no middlemen or analyzed yet.
     * Does nothing for middlemen.
     *
     * @return {void}
     */
    start_analyze() {
        if (this.middlemen || this.analyzed) {
            return
        }

        this.analyzed = true;
        this.sendMessage({start: true}).catch(error => console.log(`error starting analyzer: ${error}`))
    }

    /**
     * Changes the icon according the new state of this wrapper.
     * Saves the new state in storage and starts the analyzer if
     * it is the first time the state 'Active' is reached.
     * Does nothing for middlemen.
     *
     *
     * @param {string} new_state
     * @return {void}
     */
    change_state(new_state) {
        //you cannot change state on a middlemen
        if (this.middlemen) {
            return;
        }

        //Change the state of this extension for a given page, followed by a change of browser action icon
        ExtensionManager.displayState(new_state)
            .catch(error => console.log("icon error " + error))
            .then(() => this.active = new_state)
            .then(() => UserSystem.saveHostState(this.host, this.active));

        if (new_state === states.ACTIVE && !this.analyzed) {
            this.start_analyze();
        }
    }

    /**
     * Initiates the link of this Tab.
     * Checks the local state of the host for the current user
     * and changes the state of this wrapper accordingly.
     *
     * Does nothing for middlemen.
     *
     * @returns {Promise<any[] | void>}
     */
    init() {
        if (this.middlemen) {
            return Promise.resolve();
        }
        //look if this extension was activated for this host before
        return UserSystem.getState(this.host)
            .then(state => {
                //if there is an state, change to it, else change to INACTIVE
                if (state) {
                    this.change_state(state);
                } else {
                    this.change_state(states.INACTIVE);
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
        return browser.tabs.sendMessage(this.tabId, message).catch(error => {
            if (attempts >= 5) {
                console.log(`could not reach any content script ${attempts} with ${error}`);
                return;
            }
            //if no content script was reachable, wait for one second and try again
            return new Promise(resolve => setTimeout(() => resolve(), 1000)).then(() => this.sendMessage(message));
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
     * Creates a Wrapper for the given tabId
     * and sets it as the wrapper for the extensionPage.
     *
     * Closes the tab of the previous extensionPage if it is in another tab.
     *
     * @param {number} tabId
     * @return {Promise<any[] | void | never>}
     */
    setExtensionPage(tabId) {
        let closing = Promise.resolve();

        //if an extensionPage is already open, close it if it is another tab, only one 'instance' allowed
        if (this.extensionPage && this.extensionPage.tabId !== tabId) {
            //try to close tab, but catch error even if it fails
            closing = browser.tabs.remove(this.extensionPage.tabId).catch(console.log);
        }
        return closing
            .then(() => browser.tabs.get(tabId))
            .then(value => {
                let host = this.get_host(value);
                //create a wrapper which injects the middlemen script to communicate with page scripts
                this.extensionPage = this.createWrapper(host, value.url, tabId, true);
                return this.extensionPage.init();
            });
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
     * Removes the wrapper for this tabId from the tabs or the extensionPage
     * if the id match.
     *
     * @param {number} tabId
     */
    removeWrapper(tabId) {
        //first try to remove the wrapper from the tabs, if this failed try to 'remove' the extensionWrapper
        if (!this.tabs.delete(tabId) && this.extensionPage && this.extensionPage.tabId === tabId) {
            this.extensionPage = undefined;
        }
    },

    /**
     * Shortcut to set the activation state of the current selected wrapper.
     *
     * @param {string} state
     */
    set currentActive(state) {
        this.selected && this.selected.change_state(state);
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
     *
     * @param msg
     * @return {Promise<{state: boolean}>}
     */
    processStateMsg(msg) {
        //default response is false
        let responseState = false;

        //only check if user is logged in, else return for everything false
        if (UserSystem.logged_in_cache) {
            if (states.any(msg.state) && this.selected) {
                //if there is a selected wrapper, accept with true
                this.currentActive = msg.state;
                responseState = true;
            } else if (msg.state === unknown) {
                //send the current state of the selected
                responseState = this.currentActive;
            }
        }
        //respond to browserAction script
        return Promise.resolve({state: responseState})
    },

    /**
     *
     * @param userMsg
     * @return {Promise<{user: Object}>| never}
     */
    processUserMsg: function (userMsg) {
        if (userMsg.logged_in === unknown) {
            return UserSystem.logged_in()
                .then(value => {
                    return {user: {logged_in: value}};
                });
        } else if (userMsg.log_in) {
            return UserSystem.log_in(userMsg.log_in.mail, userMsg.log_in.pw)
                .then(value => {
                    return {user: {login: value}};
                });
        } else if (userMsg.log_out) {
            return UserSystem.log_out()
                .then(() => {
                    return {user: {logout: true}};
                });
        } else if (userMsg.data) {
            return UserSystem.get_data()
                .then(value => {
                    return {user: {data: value}};
                });
        } else if (userMsg.register) {
            return UserSystem.register(userMsg.register.mail, userMsg.register.pw)
                .then(value => {
                    return {user: {register: value}};
                })
        }
    },

    /**
     *
     * @param sender
     * @param msg
     */
    processDevMsg(sender, msg) {
        let currentPort;

        for (let port of this.devPorts) {
            if (port.id === sender.tab.id) {
                currentPort = port;
                break;
            }
        }

        let wrapper = this.getWrapper(sender.tab.id);

        if (!wrapper) {
            throw Error(`there cannot be a message from non-existing wrapper with id ${sender.tab.id}, ${msg}`);
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
     * Initiates the listener for the tabs
     * and the communication between content scripts
     * and this background script.
     *
     * @return {void}
     */
    initListener() {
        //react to url changes in tabs, create a new wrapper each time the url changes, even if it reloads
        browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
            let host = ExtensionManager.get_host(changeInfo.url);
            console.log(tabId, changeInfo);

            //check if url was updated
            if (!host) {
                return
            }

            //if page is the extensionPage, set it as it, this closes the previous other tab with
            // this extensionPage if available
            if (this.isExtensionUrl(changeInfo.url)) {
                this.setExtensionPage(tabId);
            }

            //create a new wrapper for this page only if user is logged in
            if_logged_in(() => {
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
        browser.tabs.onActivated.addListener(active_info => {
            if_logged_in(() => {
                browser.tabs
                    .get(active_info.tabId)
                    .then(value => {
                        //check if an wrapper with this tabId is available
                        let wrapper = this.getWrapper(value.id);

                        //only extensionPages have a middlemen wrapper
                        if (wrapper && wrapper.middlemen) {
                            return;
                        }

                        //check if that wrapper has the same url as the tab has now, else create a new wrapper
                        if (wrapper && value.url === wrapper.url) {
                            this.selected = wrapper;
                            this.displayState().catch(console.log);
                        } else {
                            let host = this.get_host(value);
                            //if there is no valid host, reset selected and return
                            if (!host) {
                                this.selected = undefined;
                                this.displayState().catch(console.log);
                                return
                            }
                            //create a new page wrapper, that is not a middlemen
                            this.selected = this.createWrapper(host, value.url, value.id);
                            //replace any previous wrapper for this tab
                            this.tabs.set(value.id, this.selected);
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
            //state message come from browserAction popup
            if (msg.state) {
                try {
                    return this.processStateMsg(msg);
                } catch (e) {
                    console.log(e);
                }
            }

            //analyze message comes from analyzer.js
            if (msg.analyzed) {
                try {
                    return process_result(msg.analyzed);
                } catch (e) {
                    console.log(e);
                }
            }

            //should come from page-content as middle men from page script of the associated SPA
            if (msg.user) {
                try {
                    return this.processUserMsg(msg.user);
                } catch (e) {
                    console.log(e);
                }
            }

            //message from contentScript (analyzer) to devTool
            if (msg.dev && sender && sender.tab) {
                try {
                    this.processDevMsg(sender, msg);
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

        //ignore all updates if extensionPage is not open, else sends it to the middle men (content script) of the SPA
        UserSystem.on_update = update => if_logged_in(() => this.extensionPage && this.extensionPage.sendMessage({update}));

        //ignore all data if extensionPage is not open, else sends it to the middle men (content script) of the SPA
        UserSystem.on_data = data => if_logged_in(() => this.extensionPage && this.extensionPage.sendMessage({data}));

        //notify SPA of extension if open, that a server side logout occurred
        UserSystem.on_logout = () => if_logged_in(() => this.extensionPage && this.extensionPage.sendMessage({logout: true}));
    },

    /**
     * Returns the host (e.g. 'www.google.com' from 'https://www.google.com/')
     * of the given url or an empty string.
     *
     * @param {string | browser.tabs.Tab} tab or url
     * @returns {string}
     */
    get_host(tab) {
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
     * @param spa
     * @return {PageWrapper}
     */
    createWrapper(host, url, tabId, spa) {
        return new PageWrapper(host, url, tabId, spa);
    }
};

//fixme replaces some functions with stub functions to simulate certain behaviour
Stub.activate();

//initiate all listener that are relevant for the extensionManager
ExtensionManager.initListener();
//ask initially for login status and activate webSocket (mutual push) if logged in
if_logged_in(UserSystem.activatePush).catch(console.log);

/**
 * Executes callbacks depending on whether a user is logged in or not.
 *
 * @param {function} cb_true
 * @param cb_false
 * @return {Promise<any | never>}
 */
function if_logged_in(cb_true, cb_false) {
    return UserSystem.logged_in().then(logged_in => {
        if (logged_in) {
            return cb_true();
        }
        if (typeof cb_false === "function") {
            return cb_false();
        }
    });
}

function process_result(result) {
    //todo implement result processor
}

function log_local(key) {
    log(browser.storage.local.get(key))
}

function log(promise) {
    promise.then(console.log)
}

function cD() {
    log(UserSystem.get_uid().then(uid => StoreManager.read(uid)))
}
