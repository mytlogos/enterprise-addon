const StubClient = {};


const Stub = {
    activate() {
        UserSystem.loggedIn = this.loggedIn;
        UserSystem.activatePush = () => {
        };
        UserSystem.getUuid = this.getUid
    },

    /**
     * @return {Promise<boolean>}
     */
    loggedIn() {
        return Promise.resolve(true);
    },

    /**
     * @return {Promise<string>}
     */
    getUid() {
        return Promise.resolve("user121kajsiojo3")
    },
};
