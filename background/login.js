/**
 *
 */
const UserSystem = {
    //todo ask server with password and mail for token, validate token?
    //todo client side encryption?
    onUpdate: undefined,
    onData: undefined,
    on_login: undefined,
    onLogout: undefined,
    messageCache: [],

    /***
     * Checks whether a user is currently logged in the extension in this browser.
     * Returns the cached login status if it is set.
     *
     * @return Promise<boolean>
     */
    loggedIn() {
        return HttpClient.isLoggedIn();
    },

    get offline() {
        return HttpClient.offline;
    },

    /**
     * Registers an user with the given mail and password on the server.
     * Caches the login status and saves the server generated uid
     * in storage.
     * Enables the bidirectional Push on success.
     *
     * Throws an Error if either the mail or password evaluates to false or registering failed.
     *
     * @param {string}  name
     * @param {string} pw
     * @param {string} pwRepeat
     * @return {Promise<void>}
     */
    register(name, pw, pwRepeat) {
        //todo what if an account with this mail already exists?

        if (!name || !pw) {
            return Promise.reject("invalid credentials");
        }
        return HttpClient.register(name, pw, pwRepeat)
    },

    /***
     *  Logs an user with the given credentials to the server.
     *  Caches the login status and saves the server generated uid
     *  in storage.
     *  Enables the bidirectional Push on success.
     *
     *  Throws an Error if mail or password evaluates to false or
     *  login failed.
     *
     * @param {string} name
     * @param {string} pw
     * @return {Promise<void>}
     */
    logIn(name, pw) {
        //todo what if login failed on server side?

        //todo what if an account with this mail already exists?

        if (!name || !pw) {
            return Promise.reject("invalid credentials");
        }
        return HttpClient.login(name, pw)
    },


    /***
     * Clears the current user from this client and storage
     * and pushes a logout message to the server.
     *
     * Logs out the current client only if all is false,
     * else logs out all clients of the current account.
     *
     * @param {boolean} all
     * @return void
     */
    logOut(all = false) {
        let message = {};
        message[events.LOGOUT] = {all};
        this.pushMessage(message);
        user.clear();
    },

    /***
     * Reads the uid of current user or rejects if there is  none.
     *
     * @return {Promise<string|void>}
     */
    getUuid() {
        return StoreManager
            .readUser()
            .then(user => user && user.uuid);
    },

    /***
     * Starts the WebSocket to enable push
     * from either server or client.
     *
     * @return {Promise<void>}
     */
    activatePush() {
        return WSClient
            .startPush()
            //if there are cached messages, send them to server
            .then(() => {
                this.messageCache.forEach(message => WSClient.push(message));
                this.messageCache.length = 0;
                return StoreManager.deleteMessageCache();
            });
    },

    /**
     * Push a message to the server.
     *
     * @param {Object} message json valid object
     */
    pushMessage(message) {
        if (user.loggedIn) {
            if (HttpClient.offline || WSClient.closed()) {
                this.messageCache.push(message);
                StoreManager.writeMessageCache(this.messageCache);
            } else {
                WSClient.push(message);
            }
        }
    },

    /***
     * Saves the Extension active state for a given host of the active
     * user if available.
     *
     * @param {string} host
     * @param {string} active
     * @returns {Promise<void>}
     */
    saveHostState(host, active) {
        return this.getUuid().then(uid => {
            if (!uid) {
                return
            }
            return StoreManager.update(uid, value => {
                let page_state = value[host];

                //if it is not set before
                if (!page_state) {
                    page_state = value[host] = {}
                }

                if (active) {
                    page_state.active = active;
                } else {
                    delete page_state.active;
                }
            });
        });
    },

    /**
     * Gets the state of the host in the current user.
     * Returns false if there is no user or there is no data for host.
     *
     * @param {string} host
     * @return {Promise<string | boolean>}
     */
    getState(host) {
        return this.getUuid()
        //if there is an user logged in, read the current activation state for the given host, else return false
            .then(uid => uid ?
                StoreManager.read(uid).then(value => value[host] && value[host].active) :
                Promise.resolve(false));
    },

    /**
     * Closes the Client.
     * @return {void}
     */
    finish() {
        WSClient.close();
    }
};


//webSocket listener for data events in the unlikely event that
// the extension (SPA) is open on two devices and one updates data
WSClient.addEventListener(events.DATA, event => {
    if (typeof (UserSystem.onData) === "function") {
        UserSystem.onData(event.detail)
    }
});
//webSocket listener for update events like, new chapters
WSClient.addEventListener(events.UPDATE, event => {
    if (typeof (UserSystem.onUpdate) === "function") {
        UserSystem.onUpdate(event.detail);
    }
});
//delete offlineUser on logout from server side and execute callback
WSClient.addEventListener(events.LOGOUT, () => {
    StoreManager.deleteUser();

    if (typeof (UserSystem.onLogout) === "function") {
        UserSystem.onLogout(event.detail);
    }
});

//query the server every 10s if a user session exists for this device
setInterval(() => {
    try {
        if (!user.loggedIn) {
            UserSystem.loggedIn().catch(console.log);
        }
    } catch (e) {

    }
}, 10000);