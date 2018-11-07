/**
 * @typedef function ObservableHandler
 * @template {T}
 *
 * @param {T|undefined} oldValue
 * @param {T|undefined} newValue
 */

/**
 * @template {T}
 * @param {T} target
 * @return {T}
 */
function Observable(target = {}) {
    let listener = new Map();

    let proxy = new Proxy(target, {
        get: (target, p) => {
            return target[p];
        },

        set: (target, p, value) => {
            let propListener = listener.get(p);

            if (propListener) {
                let oldValue = target[p];

                if (oldValue !== value) {
                    propListener.forEach(listener => listener(oldValue, value));
                }
            }

            target[p] = value;
            return true;

        }
    });

    /**
     *
     * @param {string} prop
     * @param {ObservableHandler} handler
     */
    proxy.addListener = (prop, handler) => {
        if (!prop) {
            throw TypeError("invalid property");
        }

        prop.split(",").forEach(value => {
            let propListener = listener.get(value);

            if (!propListener) {
                listener.set(value, propListener = []);
            }

            propListener.push(handler);
            handler(undefined, target[prop]);
        });
    };

    return proxy;
}

const ChangeType = {
    UPDATE: 0x1,
    REMOVE: 0x2,
    ADD: 0x4,
};

/**
 *
 * @template {T}
 * @param {number} type
 * @param {number} start
 * @param {number} end
 * @param {Array<T>} added
 * @param {Array<T>} removed
 * @constructor
 */
function Change(type, start, end, added, removed = []) {
    this.start = start;
    this.end = end;
    this.added = added;
    this.removed = removed;

    this.wasAdded = () => (type & ChangeType.ADD) === ChangeType.ADD;
    this.wasRemoved = () => (type & ChangeType.REMOVE) === ChangeType.REMOVE;
    this.wasUpdated = () => (type & ChangeType.UPDATE) === ChangeType.UPDATE;
}

/**
 * @typedef {function} ChangeHandler
 * @param {Change} change
 */

/**
 * @template {T}
 * @extends {Array<T>}
 */
class ObservableArray extends Array {

    constructor() {
        super();
        this.listener = [];
    }

    /**
     *
     * @param {ChangeHandler} listener
     */
    addListener(listener) {
        this.listener.push(listener);
    }

    /**
     *
     * @param {Change} change
     */
    emit(change) {
        this.listener.forEach(value => value(change))
    }

    /**
     *
     * @return {T}
     */
    pop() {
        let length = this.length;
        let popped = super.pop();
        let afterLength = this.length;

        if (length !== afterLength) {
            this.emit(new Change(ChangeType.REMOVE, afterLength, afterLength, [], [popped]));
        }
        return popped;
    }

    /**
     *
     * @param {Array<T>} items
     * @return {number}
     */
    push(...items) {
        let length = this.length;
        let number = super.push(...items);
        let end = length + number;

        if (end) {
            this.emit(new Change(ChangeType.ADD, length, end, items));
        }
        return number;
    }

    /**
     *
     * @return {T}
     */
    shift() {
        let length = this.length;
        let shifted = super.shift();
        let afterLength = this.length;

        if (length !== afterLength) {
            this.emit(new Change(ChangeType.REMOVE, 0, 0, [], [shifted]));
        }
        return shifted;
    }

    /**
     *
     * @param {number} start
     * @param {number} deleteCount
     * @param {Array<T>} items
     * @return {Array<T>}
     */
    splice(start, deleteCount, ...items) {
        let splice = super.splice(start, deleteCount, ...items);

        let changeType = 0;
        let removed;
        let added;
        let addedLength = items && items.length;

        if (deleteCount) {
            changeType |= ChangeType.REMOVE;
            removed = splice;
        }

        if (addedLength) {
            changeType |= ChangeType.ADD;
            added = items;
        }

        //if something was removed and/or inserted
        if (changeType) {
            let end = start + Math.max(deleteCount, addedLength);
            this.emit(new Change(changeType, start, end, added, removed))
        }

        return splice;
    }

    /**
     *
     * @param {Array<T>} items
     * @return {number}
     */
    unshift(...items) {
        let number = super.unshift(...items);
        this.emit(new Change(ChangeType.ADD, 0, number, items));
        return number;
    }
}
