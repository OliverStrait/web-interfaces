import { VOID_CALLBACKS } from "./constants.js";


/**
 * @typedef {Object} CookieConfig
 * @property {number} expires - Expiration time as a DOM timestamp
 * @property {"strict" | "lax" | "none"} [sameSite="lax"] - Optional string selection with a default.
 * @property {number} [maxAge] - Optional lifespan in seconds.
 */


/** Cookie service abstraction that interface with stated name */
export default class CookieService {
    /**
     * @var {string} #name Name of cookieStorage
     */
    #name;
    #options;
    /**
     * Secure cookie storage
     * @param {string } name identifier of the cookie
     * @param {CookieConfig} options
     */
    constructor(name, options) {
        this.#name = name
        this.#options = { ...options, name: this.#name }
    }
    /**
     * @param {*} data
     * @param {{done: import("./constants.js").DataCallback, error: import("./constants.js").DataCallback}} [callbacks]
     * @returns {Promise<*>}
     */
    write(data, callbacks = VOID_CALLBACKS) {
        const value = typeof data === "string" ? data : JSON.stringify(data)
        return cookieStore.set({ value, ...this.#options })
            .then((d) => callbacks.done(d))
            .catch((d) => callbacks.error(d))
    }
    read(callbacks = VOID_CALLBACKS) {
        return cookieStore.get(this.#name)
            .then((d) => callbacks.done(d))
            .catch((d) => callbacks.error(d))
    }
    remove() {
        return cookieStore.delete(this.#name)
    }
}
