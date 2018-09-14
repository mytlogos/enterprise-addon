/**
 *
 * @type {{
 * logged_in_cache: undefined | boolean,
 * on_update: function | undefined,
 * on_data: function | undefined,
 * on_login: function | undefined,
 * on_logout: function | undefined,
 * logged_in(): Promise<boolean>,
 * register(string, string): Promise<void>,
 * log_in(string, string): Promise<void>,
 * log_out(boolean=false): Promise<void>,
 * get_data(): Promise<Object|void>,
 * request(Object, function): Promise<Object|void>,
 * get_uid(): Promise<string>,
 * activatePush(): Promise<void>,
 * saveHostState(string, boolean): Promise<void>,
 * getState(string): Promise<string | boolean>
 * finish(): void
 * }}
 */
const UserSystem = {

    //todo ask server with password and mail for token, validate token?
    //todo client side encryption?

    on_update: undefined,
    on_data: undefined,
    on_login: undefined,
    on_logout: undefined,

    logged_in_cache: undefined,

    /***
     * Checks whether a user is currently logged in the extension in this browser.
     * Returns the cached login status if it is set.
     *
     * @return Promise<boolean>
     */
    logged_in() {
        //check if the cache is set
        if (this.logged_in_cache == null) {
            return this.get_uid().then(uid => {
                let request = {};
                request[events.LOGGED] = uid;

                return this.request(request, data => {
                    if (data.status !== status.OK) {
                        //todo more precise elaboration on the status codes
                        throw Error("not ok");
                    }

                    //server accepted this uuid, grants further requests
                    if (data[events.LOGGED === true]) {
                        return true;
                    } else if (data[events.LOGGED === false]) {
                        //if server rejects this uuid, delete local and return undefined as in 'no - not logged in'
                        return StoreManager.delete(StoreManager.active_user).then(() => false);
                    }
                    else {
                        throw Error("server sent gibberish");
                    }
                    //if an error happened while asking server, return local uuid
                })
                    .then(logged_in => this.logged_in_cache = logged_in).catch(() => !!uid);
            });
        } else {
            return Promise.resolve(this.logged_in_cache);
        }
    },

    /**
     * Registers an user with the given mail and password on the server.
     * Caches the login status and saves the server generated uid
     * in storage.
     * Enables the bidirectional Push on success.
     *
     * Throws an Error if either the mail or password evaluates to false or registering failed.
     *
     * @param {string}  mail
     * @param {string} pw
     * @return {Promise<void>}
     */
    register(mail, pw) {
        //todo what if an account with this mail already exists?

        if (!mail || !pw) {
            // noinspection ES6ModulesDependencies
            return Promise.reject("invalid credentials")
        }
        let request = {};
        request[events.REGISTER] = {mail, pw};

        return this.request(request, data => {
            if (data.status === status.OK) {
                if (data.uid) {
                    return data.uid;
                } else {
                    throw Error("server sent gibberish");
                }
            } else {
                //todo more precise elaboration on the status codes
                throw Error("not ok");
            }
        })   //save login
            .then(uid => StoreManager.write(StoreManager.active_user, uid))
            .then(() => this.logged_in_cache = true)
            .then(() => this.activatePush());
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
     * @param {string} mail
     * @param {string} pw
     * @return {Promise<void>}
     */
    log_in(mail, pw) {
        //todo what if login failed on server side?

        if (!mail || !pw) {
            // noinspection ES6ModulesDependencies
            return Promise.reject("invalid credentials")
        }
        let request = {};
        request[events.LOGIN] = {mail, pw};

        return this.request(request, data => {
            if (data.status === status.OK) {
                if (data.uid) {
                    return data.uid;
                } else {
                    throw Error("server sent gibberish");
                }
            } else {
                //todo more precise elaboration on the status codes
                throw Error("not ok");
            }
            //save login
        })
            .then(uid => StoreManager.write(StoreManager.active_user, uid))
            .then(() => this.logged_in_cache = true)
            .then(() => this.activatePush());
    },


    /***
     * Clears the current user from this client and storage
     * and pushes a logout message to the server.
     *
     * Logs out the current client only if all is false,
     * else logs out all clients of the current account.
     *
     * @param {boolean} all
     * @return {Promise<void>}
     */
    log_out(all = false) {
        let message = {};
        message[events.LOGOUT] = {all};
        //if logout from client side
        return StoreManager.delete(StoreManager.active_user)
            .then(() => this.logged_in_cache = false)
            .then(() => WSClient.push(message))
            .then(() => WSClient.close());
    },

    /***
     * Requests data from the server from a given user.
     * Throws an error if an user is not available, valid,
     * server is unreachable or response is undefined.
     *
     * @return {Promise<Object | void>}
     */
    get_data() {
        //todo request specific data not all
        return this.get_uid()
            .then(uid => WSClient.request({uid, data: unknown}))
            .then(user_data => user_data.data);
    },


    /***
     * Makes a Http Request to the server and processes the
     * as JSON parsed response body through the process_fn callback.
     *
     * @param {Object} request
     * @param {function} process_fn
     * @return {Promise<Object | void>}
     */
    request(request, process_fn) {
        //todo handle error codes better
        return WSClient.request(request)
            .then(response => {
                if (response) {
                    return process_fn(response);
                } else {
                    throw Error("missing response")
                }
            });
    },

    /***
     * Reads the uid of current user or rejects if there is  none.
     *
     * @return {Promise<string>}
     */
    get_uid() {
        // noinspection ES6ModulesDependencies
        return StoreManager
            .read(StoreManager.active_user)
            //reject if uid is not available
            .then(uid => uid || Promise.reject("no available user"));
    },

    /***
     * Starts the WebSocket to enable push
     * from either server or client.
     *
     * @return {Promise<void>}
     */
    activatePush() {
        return WSClient.startPush();
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
        return this.get_uid().then(uid => {
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
        return this.get_uid()
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
    if (typeof (UserSystem.on_data) === "function") {
        UserSystem.on_data(event.detail)
    }
});
//webSocket listener for update events like, new chapters
WSClient.addEventListener(events.UPDATE, event => {
    if (typeof (UserSystem.on_update) === "function") {
        UserSystem.on_update(event.detail);
    }
});
//set logged_in_cache to false on logout from server side and execute callback
WSClient.addEventListener(events.LOGOUT, () => {
    StoreManager.delete(StoreManager.active_user);
    WSClient.logged_in_cache = false;

    if (typeof (UserSystem.on_logout) === "function") {
        UserSystem.on_logout(event.detail);
    }
});