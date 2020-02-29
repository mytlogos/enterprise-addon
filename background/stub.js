const StubClient = {};


const Stub = {
    activate() {
        UserSystem.loggedIn = this.loggedIn;
        UserSystem.getUuid = this.getUid
    },

    /**
     * @return {Promise<string>}
     */
    loggedIn() {
        return Promise.resolve("testUserName");
    },

    /**
     * @return {Promise<string>}
     */
    getUid() {
        return Promise.resolve("user121kajsiojo3")
    },
};
