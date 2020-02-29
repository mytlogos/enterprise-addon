/**
 * Allowed Methods for the API.
 *
 * @type {{post: string, get: string, put: string, delete: string}}
 */
const Methods = {
    post: "POST",
    get: "GET",
    put: "PUT",
    delete: "DELETE"
};

const HttpClient = {

    /**
     * Checks whether a user is currently logged in on this device.
     *
     * @return {Promise<User>}
     */
    isLoggedIn() {
        return this.queryServer();
    },

    /**
     * @param {string} userName
     * @param {string} psw
     *
     * @return {Promise<User>}
     */
    login(userName, psw) {
        if (!userName || !psw) {
            return Promise.reject();
        }

        return this.queryServer({
            query: {
                userName: userName,
                pw: psw
            },
            path: "login",
            method: Methods.post,
        });
    },

    /**
     * @param {string} userName
     * @param {string} psw
     * @param {string} psw_repeat
     *
     * @return {Promise<User>}
     */
    register(userName, psw, psw_repeat) {
        if (psw !== psw_repeat) {
            //todo show incorrect password
            return Promise.reject(status.INVALID_REQUEST);
        }

        return this.queryServer({
            query: {
                userName: userName,
                pw: psw
            },
            path: "register",
            method: Methods.post,
        });
    },


    /**
     * @param {User} user
     * @return {Promise<boolean>}
     */
    logout(user) {
        return this.queryServer({
            user,
            path: "user/logout",
            method: Methods.post,
        });
    },

    /**
     *
     * @param {number} episodeId
     * @param {Date?} date
     * @param {User} user
     * @return {Promise<void>}
     */
    sendMarked(episodeId, date, user) {
        return this.queryServer({
            user,
            method: Methods.post,
            path: "user/medium/progress",
            query: {progress: 1, episodeId}
        });
    },

    /**
     *
     * @param {string[]} bookmarks
     * @param {User} user
     * @return {Promise<string[]>}
     */
    sendBookMarks(bookmarks, user) {
        return this.queryServer({
            user,
            method: Methods.post,
            path: "user/bookmarked",
            query: {bookmarked: bookmarks}
        });
    },

    /**
     *
     * @param {string} url
     * @param {User} user
     * @return {Promise<number>}
     */
    getAssociatedEpisode(url, user) {
        return this.queryServer({
            user,
            method: Methods.get,
            path: "user/associated",
            query: {url}
        });
    },

    /**
     *
     * @param {Object?} query
     * @param {string?} path
     * @param {string?} method
     * @param {User?} user
     * @return {Promise<Object>}
     */
    queryServer({query, path = "", method = Methods.get, user} = {}) {
        if (user) {
            if (!query) {
                query = {};
            }
            query.uuid = user.uuid;
            query.session = user.session;
        }
        let init = {
            method: method,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
        };
        //append json query if
        if (query) {
            if (method === Methods.get) {
                path = `${path}?${new URLSearchParams(query)}`;
            } else {
                init.body = JSON.stringify(query);
            }
        }
        //fixme change url to real server address
        return fetch(`http://localhost:3000/api/${path}`, init)
            // fetch rejects only on network failure or on anything that prevents completing the request
            .catch(error => (this.offline = true) && Promise.reject(error))
            .then(response => !(this.offline = false) && response.json())
            .then(result => {
                if (result.error) {
                    return Promise.reject(result.error);
                }
                return result;
            });
    },
};

/***
 * Message Codes for the client-server communication.
 *
 * @type {{OK: number, INVALID_SESSION: number, INVALID_REQUEST: number, SERVER_OUT_OF_REACH: number, OFFLINE: number}}
 */
const status = {
    OK: 0,
    INVALID_SESSION: 1,
    INVALID_REQUEST: 2,
    SERVER_OUT_OF_REACH: 3,
    OFFLINE: 4,
};
