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
        this.offline = false;
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
            if (this.offline) {
                throw Error("please verify that server is online")
            }
            //for now opens webSocket without tls
            this.socket = new WebSocket("ws://localhost:80/");
            this.socket.onmessage = this.pushed;
            this.socket.onopen = () => resolve();
        });
    }

    /***
     * Sends a JSON Request to the server of this extension.
     * If the server is unreachable, the client is marked as offline, else online.
     * Returns the JSON Response if status is ok or undefined.
     *
     * @param request object to stringify
     * @return {Promise<Object | void>}
     */
    request(request) {
        return fetch("http://localhost/api", {
            method: "GET",
            mode: "cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request)
        }).then(response => {
            this.offline = false;
            //http status should ever be only ok
            if (response.ok) {
                return response.json();
            }
            return undefined;
        }).catch(() => {
            this.offline = true;
            return undefined;
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
        //todo only return if parsing failed or log an error msg
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
 * Possible Events for this Client.
 *
 * @type {{REGISTER: string, LOGIN: string, LOGGED: string, LOGOUT: string, DATA: string, UPDATE: string, any(string): boolean}}
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