const StoreManager = {
    active_user: "active_user",

    /***
     * Reads a value from the storage with a given key.
     * Logs a message to the console if key is undefined.
     *
     * @param key a single key
     * @returns {Promise<any>}
     */
    read(key) {
        if (!key) {
            console.log("reading with undefined key!");
        }
        return browser.storage.local.get(key)
        //if return value is not undefined try getting the value for key
            .then(value => !value || value[key]);
    },

    /***
     * Write a value associated with the key to the storage.
     * Logs a message to the console if key is undefined.
     *
     * @param key
     * @param value
     * @returns {Promise<void>}
     */
    write(key, value) {
        if (!key) {
            console.log("writing with undefined key!");
        }
        let item = {};
        item[key] = value;
        return browser.storage.local.set(item);
    },

    /***
     * Updates a value associated with the given key with the
     * callback function.
     *
     * @param key
     * @param update_fn
     * @returns {Promise<void>}
     */
    update(key, update_fn) {
        return this.read(key)
            .then(value => {
                value = value || {};
                update_fn(value);
                return value;
            })
            .then(value => this.write(key, value));
    },

    /***
     * Removes one or multiple keys and their values from the storage.
     * Logs a message to the console if key is undefined.
     *
     * @param keys
     * @returns {Promise<void>}
     */
    delete(keys) {
        if (!keys) {
            console.log("deleting with undefined key!");
        }

        return browser.storage.local.remove(keys);
    }
};