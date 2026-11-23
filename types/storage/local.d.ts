export type CallbackSetStorage = {
    done: import("./constants.js").DataCallback;
    error: import("./constants.js").DataCallback;
};
/**
 * @typedef {Object} CallbackSetStorage
 * @property {import("./constants.js").DataCallback} done
 * @property {import("./constants.js").DataCallback} error
 */
/** SetStorage is a localStorage interface to save Set into local storage
 * and have fast access to set in runtime
 */
declare class SetStorage {
    #private;
    name: any;
    data: Set<any>;
    /**
     * @param {*} slug keyslug for the storage
     * @param {*} name Human Readable name for the storage
     * @param {CallbackSetStorage} [callbacks]
     */
    constructor(slug: any, name: any, callbacks?: CallbackSetStorage);
    /** Read whole set from storage.
     *
     * @param {CallbackSetStorage} callbacks
     * @returns {Promise<*>}
     */
    get(callbacks?: CallbackSetStorage): Promise<any>;
    /** If value is not in set, value added, otherwise removed
     *
     * @param {string} data
     * @param {CallbackSetStorage} callbacks
     * @returns {Promise<*>}
     */
    flipset(data: string, callbacks?: CallbackSetStorage): Promise<any>;
    /** Save data into storage
     *
     * @param {CallbackSetStorage} callbacks
     * @returns {Promise<*>}
     */
    saveStorage(callbacks?: CallbackSetStorage): Promise<any>;
    /** if data is not in set, data is pushed into set and Storage
     * Set is returned in either case
     *
     * @param {any} data
     * @param {CallbackSetStorage} callbacks
     * @returns {Promise<*>}
     */
    add(data: any, callbacks?: CallbackSetStorage): Promise<any>;
    remove(): void;
}
export { SetStorage };
