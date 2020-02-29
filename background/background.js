//todo make a export feature?
//todo get more into logging

/**
 * @typedef {"active"|"inactive"|"error"} States
 */
/**
 *
 * @type {{ACTIVE: string, INACTIVE: string, ERROR: string, any(*): boolean}}
 */
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
 *  * A Wrapper for a given Page.
 * Contains the tabId the page sits in, the activation state for the
 *
 * @property {States} active
 * @property {number} tabId
 * @property {string} url
 * @property {string} host
 * @property {number|undefined} episodeId
 */
class PageWrapper {

    /**
     * The constructor of the PageWrapper.
     *
     * @param {string} host
     * @param {string} url
     * @param {number} tabId
     */
    constructor(host, url, tabId) {
        this.host = host;
        this.url = url;
        this.tabId = tabId;
        this.active = states.INACTIVE;
    }

    /**
     * Changes the icon according the new state of this wrapper.
     * Saves the new state in storage and starts the analyzer if
     * it is the first time the state 'Active' is reached.
     *
     *
     * @param {States} newState
     * @return {Promise<void>}
     */
    async changeState(newState) {
        if (newState === "active") {
            const episodeId = await UserSystem.getAssociatedEpisode(this.url);

            if (episodeId) {
                this.episodeId = episodeId;
            }
        }
        //Change the state of this extension for a given page, followed by a change of browser action icon
        return ExtensionManager.displayState(newState)
            .catch(error => console.error("icon error " + error))
            .then(() => this.active = newState)
            .then(() => UserSystem.saveHostState(this.host, this.active));
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
                    return this.changeState(state);
                } else {
                    return this.changeState(states.INACTIVE);
                }
            })
            .catch(error => console.error("error setting value", error, this));
    };
}

const ExtensionManager = {
    tabs: new Map(),

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
     * @param {States} state
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
     * @param {States} state
     */
    set currentActive(state) {
        this.selected && this.selected.changeState(state);
    },

    /**
     * Shortcut to get the activation state of the current selected wrapper.
     *
     * @return {States|undefined}
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
        if (msg.loggedIn) {
            return Promise.resolve(UserSystem.userName);
        }

        if (msg.state) {
            //default response is false
            let responseState = false;

            //only check if user is logged in, else return for everything false
            if (UserSystem.userName && states.any(msg.state) && this.selected) {
                //if there is a selected wrapper, accept with true
                this.currentActive = msg.state;
                responseState = true;
            }
            //respond to browserAction script
            return Promise.resolve(responseState);
        }
        if (msg.unknown) {
            return Promise.resolve({name: UserSystem.userName, state: this.currentActive});
        }
        if (msg.login) {
            return UserSystem.logIn(msg.login.name, msg.login.psw);
        }

        if (msg.register) {
            return UserSystem.logIn(msg.login.name, msg.login.psw);
        }

        if (msg.user) {
            return Promise.resolve({name: UserSystem.userName});
        }

        if (msg.logout) {
            UserSystem.logOut().catch(reason => console.error(reason));
        }
    },

    tabsUpdated(tabId, changeInfo) {
        const host = ExtensionManager.getHost(changeInfo.url);

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
            wrapper.init().catch(error => console.error(`initiating wrapper failed: ${error}`));

            //if active page is reloaded, set new wrapper as selected
            let previousWrapper = this.getWrapper(tabId);

            if (this.selected === previousWrapper) {
                this.selected = wrapper;
            }

            //save wrapper with tabId
            this.tabs.set(tabId, wrapper);
        })  //print any errors that could have happened to console
            .catch(console.error);
    },

    tabActivated(activeInfo) {
        ifLoggedIn(() => {
            browser.tabs
                .get(activeInfo.tabId)
                .then(tab => {
                    //check if an wrapper with this tabId is available
                    let wrapper = this.getWrapper(tab.id);

                    //check if that wrapper has the same url as the tab has now, else create a new wrapper
                    if (wrapper && tab.url === wrapper.url) {
                        this.selected = wrapper;
                        this.displayState().catch(console.error);
                    } else {
                        let host = this.getHost(tab);
                        //if there is no valid host, reset selected and return
                        if (!host) {
                            this.selected = undefined;
                            this.displayState().catch(console.error);
                            return
                        }
                        //create a new page wrapper
                        this.selected = this.createWrapper(host, tab.url, tab.id);
                        //replace any previous wrapper for this tab
                        this.tabs.set(tab.id, this.selected);
                        return this.selected.init();
                    }
                })
                .catch(error => console.error(`error while setting selected page wrapper ${error}`));
        }).catch(console.error)

    },

    messageHandler(msg, sender) {
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
                console.error(e);
            }
        }
    },

    /**
     *
     * @param {string} command
     * @return {void}
     */
    commandHandler(command) {
        if (command === "toggle-activation") {
            this.currentActive = this.currentActive === "active" ? "inactive" : "active";
        } else if (command === "mark-finished") {
            if (this.selected && this.selected.active && this.selected.episodeId) {
                UserSystem.sendMarked(this.selected.episodeId).catch(console.error);
            }
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
        browser.tabs.onUpdated.addListener((tabId, changeInfo) => this.tabsUpdated(tabId, changeInfo));

        //set the selected tab, there can be only one
        browser.tabs.onActivated.addListener(activeInfo => this.tabActivated(activeInfo));

        //removes any wrapper with the given tabId
        browser.tabs.onRemoved.addListener(tabId => this.removeWrapper(tabId));

        //reacts to messages from content scripts of pages or the browserAction
        browser.runtime.onMessage.addListener((msg, sender) => this.messageHandler(msg, sender));

        // reacts to extension defined shortcuts
        browser.commands.onCommand.addListener((command) => this.commandHandler(command));

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
        return new PageWrapper(host, url, tabId);
    }
};

//initiate all listener that are relevant for the extensionManager
ExtensionManager.initListener();

UserSystem.onLoggedStateChange(name => {
    if (name) {
        checkBookmarkTree();
    }
});

/**
 * Executes callbacks depending on whether a user is logged in or not.
 *
 *
 * @param {function} cbTrue
 * @param {function?}cbFalse
 * @return {Promise<any | never>}
 */
function ifLoggedIn(cbTrue, cbFalse) {
    return new Promise(resolve => {
        if (UserSystem.userName) {
            resolve(cbTrue());
        }
        if (typeof cbFalse === "function") {
            resolve(cbFalse());
        }
    });
}
