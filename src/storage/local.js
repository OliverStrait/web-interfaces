import { VOID_CALLBACKS } from "./constants";



/**
 * @typedef {Object} CallbackSetStorage
 * @property {(Object)=> void} done - Succesfull data
 * @property {error:(Error)=> void} error - unSuccesfullerro state


/** SetStorage is a localStorage interface to save Set into local storage
 * and have fast access to set in runtime
 */
class SetStorage {

    /**
     * @var {string}
     */
    #keySlug

    /**
     * @param {*} slug keyslug for the storage
     * @param {*} name Human Readable name for the storage
     * @param {{save:string, fetch:string}} errors  error message, {name} 
     * * @param {CallbackSetStorage} callbacks 
     */
    constructor(slug, name, callbacks = VOID_CALLBACKS) {
        this.#keySlug = slug;
        this.name = name
        this.data = new Set()
        this.get(callbacks)
    }


    /** Read whole set from storage.
     * 
     * @param {CallbackSetStorage} callbacks 
     * @returns {(a)=> void}
     */
    async get(callbacks = VOID_CALLBACKS) {
        try {
            const stored = window.localStorage.getItem(this.#keySlug)
            const data = stored ? JSON.parse(stored) : []
            if (!Array.isArray(data) || !data.every(id => typeof id === 'string')) {
                throw new Error('Invalid viewed data')
            }
            this.data = new Set(data)
            return callbacks.done(this.data)
        } catch (e) {
            console.log(e)
            return callbacks.error(e)
        }
    }

    /** If value is not in set, value added, otherwise removed
     * 
     * @param {string} data 
     * @param {CallbackSetStorage} callback
     * @returns {(Set)=> void | (Error)=> void}
     */
    async flipset(data, callbacks = VOID_CALLBACKS) {
        if (this.data.has(data)) {
            this.data.delete(data)
            return this.saveStorage(callbacks)
        } else {
            this.data.add(data)
            return this.saveStorage(callbacks)
        }
    }
    /** Save data into storage
     * 
     * @param {string} data 
     * @param {CallbackSetStorage} callback
     * @returns {(Set)=> void | (Error)=> void}
     */
    async saveStorage(callback = VOID_CALLBACKS) {
        try {
            window.localStorage.setItem(this.#keySlug, JSON.stringify([...this.data]));
            return callback.done(this.data)
        }
        catch (e) {
            console.log(e)
            return callback.error(e)
        }
    }

    /** if data is not in set, data is pushed into set and Storage
     * Set is returned in either case
     * 
     * @param {any} data 
     * @param {CallbackSetStorage} callback ,
     * @returns {(Set)=> void | (Error)=> void}
     */
    async add(data, callbacks = VOID_CALLBACKS) {
        try {
            if (this.data.has(data)) {
                return callbacks.done(this.data)
            }
            else {
                this.data.add(data)
                return this.saveStorage(callbacks)
            }
        }
        catch (e) {
            return callbacks.error(e)
        }

    }

    remove() {
        window.localStorage.removeItem(this.#keySlug)
    }

}


export { SetStorage }