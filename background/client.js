/**
 *
 */
class Client extends EventTarget {
    constructor() {
        super();
        //allow this client only in browser environment and only once
        if (window.WSClient) {
            throw Error("only one client instance is allowed");
        }
    }

    /***
     *  Starts the WebSocket to the server of this
     *  Extension.
     *  Throws Error if client is offline.
     *
     * @return {Promise<void>}
     */
    startPush() {
        return new Promise(resolve => {
            //fixme for now opens webSocket without tls
            this.socket = new WebSocket("ws://localhost:3000/");
            this.socket.onmessage = this.pushed;
            this.socket.onopen = () => resolve();
        });
    }

    /***
     * Pushes a Message to the Server after converting it to JSON.
     *
     * @param message message to be stringified to JSON
     * @return {void}
     */
    push(message) {
        if (!this.socket) {
            throw Error("webSocket is not active while trying to send message")
        }
        this.socket.send(JSON.stringify(message));
    }

    /***
     * Dispatches Events extracted from the message of the server.
     *
     * @param event
     * @return {void}
     */
    pushed(event) {
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (e) {
            return;
        }

        if (!data) {
            return
        }

        for (let key of Object.keys(data)) {
            //emit events if it is any of the valid events
            if (events.any(key)) {
                let msg = {status: data.status};
                msg[key] = data[data];

                this.dispatchEvent(new CustomEvent(key, {detail: msg}));
            }
        }
    }

    /***
     * Closes the WebSocket and removes it from this client.
     *
     * @return {void}
     */
    close() {
        this.socket.close();
        this.socket = undefined;
    }
}

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

    get loggedIn() {
        return Boolean(user.uuid);
    },

    /**
     *
     * @param {string} uuid
     * @param {string} session
     * @param {string} name
     */
    setUser({uuid, session, name}) {
        try {
            user
                .clear()
                .setName(name)
                .setId(uuid)
                .setSession(session)
        } catch (e) {
            //in case some error happened while adding new data,
            //clear any rest data and rethrow error
            user.clear();
            throw e;
        }
    },

    /**
     * Checks whether a user is currently logged in on this device.
     *
     * @return {Promise<boolean>}
     */
    isLoggedIn() {
        return this
            .queryServer({auth: false})
            .then(result => {
                if (!result) {
                    return false;
                }
                this.setUser(result);
                return true;
            })
    },

    /**
     * @param {string} userName
     * @param {string} psw
     *
     * @return {Promise<boolean>}
     */
    login(userName, psw) {
        //need to be logged out to login
        if (HttpClient.loggedIn) {
            return Promise.reject();
        }

        if (!userName || !psw) {
            return Promise.reject();
        }

        return this
            .queryServer({
                query: {
                    userName: userName,
                    pw: psw
                },
                path: "login",
                method: Methods.post,
                auth: false
            })
            .then(result => {
                this.setUser(result);
                return true;
            });
    },

    /**
     * @param {string} userName
     * @param {string} psw
     * @param {string} psw_repeat
     *
     * @return {Promise<boolean>}
     */
    register(userName, psw, psw_repeat) {
        //need to be logged out to login
        if (HttpClient.loggedIn) {
            return Promise.reject("already logged in");
        }
        if (psw !== psw_repeat) {
            //todo show incorrect password
            return Promise.reject(status.INVALID_REQUEST);
        }

        return this
            .queryServer({
                query: {
                    userName: userName,
                    pw: psw
                },
                path: "register",
                method: Methods.post,
                auth: false
            })
            .then(result => {
                this.setUser(result);
                return true;
            });
    },


    /**
     * @return {Promise<boolean>}
     */
    logout() {
        return this
            .queryServer({
                path: "logout",
                method: Methods.post,
            })
            .then(result => result)
            .then(loggedOut => {
                user.clear();

                if (!loggedOut) {
                    //todo show error msg, but still clear data?
                }
                return loggedOut;
            })
            .catch(error => console.log(error));
    },


    /**
     *
     * @param {Object?} query
     * @param {string?} path
     * @param {string?} method
     * @param {boolean?} auth
     * @return {Promise<Object>}
     */
    queryServer({query, path = "", method = Methods.get, auth = true} = {}) {
        if (auth) {
            if (!user.uuid) {
                throw Error("cannot send user message if no user is logged in")
            }
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
            init.body = JSON.stringify(query);
        }
        //fixme change url to real server address
        return fetch(`http://localhost:3000/api/user/${path}`, init)
            .then(response => response.json())
            .then(result => {
                if (result.error) {
                    return Promise.reject(result.error);
                }
                return result;
            });
    },
};

/**
 * Possible Events for this Client.
 */
const events = {
    REGISTER: "register",
    LOGIN: "login",
    LOGGED: "logged",
    LOGOUT: "logout",
    DATA: "data",
    UPDATE: "update",

    /***
     *
     * @param {string} type
     * @return {boolean}
     */
    any(type) {
        for (let key in Object.keys(this)) {
            let event = this[key];

            if (event === type && typeof(event) !== "function") {
                return true;
            }
        }
        return false;
    }
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

//the only instance of Client in the window namespace
const WSClient = new Client();