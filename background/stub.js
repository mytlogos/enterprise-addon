const StubClient = {};


const Stub = {
    activate() {
        UserSystem.logged_in = this.loggedIn;
        UserSystem.logged_in_cache = true;
        UserSystem.activatePush = () => {
        };
        UserSystem.get_uid = this.getUid
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
