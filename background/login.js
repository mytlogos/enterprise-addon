/**
 * @typedef {{
 *  session: string,
 *  uuid: string,
 *  name: string
 *  }} User
 */

/**
 *
 */
const UserSystem = (function () {
    /**
     *
     * @type {function(string)|null}
     */
    let onLoggedStateChange = null;
    /**
     *  The current active user
     * @type {User|null}
     */
    let currentUser = null;
    HttpClient.isLoggedIn().then(value => setUser(value)).catch((reason) => {
        console.error(reason);

        if (HttpClient.offline) {
            StoreManager.readUser().then(user => setUser(user)).catch(console.error);
        }
    });

    /**
     *
     * @param {User | null} user
     * @return {Promise<string>}
     */
    function setUser(user) {
        if (!!user == !!currentUser) {
            return Promise.reject("Cannot logIn when logged in and cannot log out when logged out");
        }
        currentUser = user;
        const name = user ? user.name : "";
        onLoggedStateChange && onLoggedStateChange(name);
        if (currentUser) {
            return StoreManager.writeUser(currentUser).then(() => name);
        } else {
            return StoreManager.deleteUser().then(() => name);
        }
    }

    //query the server every 10s if a user session exists for this device
    setInterval(() => {
        try {
            if (!currentUser) {
                UserSystem.loggedIn().catch(console.error);
            }
        } catch (e) {

        }
    }, 10000);
    return {
        //todo ask server with password and mail for token, validate token?
        //todo client side encryption?
        /**
         *
         * @param {function(string)} callback
         */
        onLoggedStateChange(callback) {
            onLoggedStateChange = callback;

            if (callback && typeof callback != "function") {
                throw Error("not a function");
            } else if (callback) {
                callback(currentUser ? currentUser.name : "");
            }
        },

        /***
         * Checks whether a user is currently logged in the extension in this browser.
         * Returns the cached login status if it is set.
         *
         * @return Promise<string>
         */
        loggedIn() {
            return HttpClient.isLoggedIn().then(value => setUser(value));
        },

        get userName() {
            return currentUser ? currentUser.name : "";
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
         * @return {Promise<string>}
         */
        register(name, pw, pwRepeat) {
            //todo what if an account with this mail already exists?
            if (!name || !pw) {
                return Promise.reject("invalid credentials");
            }
            return HttpClient.register(name, pw, pwRepeat).then(value => setUser(value));
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
         * @return {Promise<string>}
         */
        logIn(name, pw) {
            //todo what if login failed on server side?
            //todo what if an account with this mail already exists?

            if (!name || !pw) {
                return Promise.reject("invalid credentials");
            }
            return HttpClient.login(name, pw).then(value => setUser(value));
        },


        /***
         * Clears the current user from this client and storage
         * and pushes a logout message to the server.
         *
         * Logs out the current client only if all is false,
         * else logs out all clients of the current account.
         *
         * @param {boolean} all
         * @return Promise<void>
         */
        logOut(all = false) {
            return HttpClient.logout().finally(() => setUser(null));
        },

        /***
         * Reads the uid of current user or rejects if there is  none.
         *
         * @return {Promise<string|void>}
         * @private
         */
        getUuid() {
            return StoreManager.readUser().then(user => user && user.uuid);
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
            return this.getUuid().then(uuid => {
                if (!uuid) {
                    return
                }
                return StoreManager.update(uuid, value => {
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
         * @return {Promise<States | boolean>}
         */
        getState(host) {
            return this.getUuid()
                //if there is an user logged in, read the current activation state for the given host, else return false
                .then(uuid => uuid
                    ? StoreManager.read(uuid).then(value => !!value && value[host] && value[host].active)
                    : false
                );
        },

        /**
         *
         * @param {string[]} bookmarks
         * @return {Promise<string[]>}
         */
        sendBookMarks(bookmarks) {
            return HttpClient.sendBookMarks(bookmarks, currentUser);
        },

        /**
         *
         * @param {string} url
         * @return {Promise<number>}
         */
        getAssociatedEpisode(url) {
            return HttpClient.getAssociatedEpisode(url, currentUser);
        },

        /**
         *
         * @param {number} episodeId
         * @return {Promise<void>}
         */
        sendMarked(episodeId) {
            return HttpClient.sendMarked(episodeId, null, currentUser);
        }
    }
})();
