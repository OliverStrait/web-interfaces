export type CookieConfig = {
    /**
     * - Expiration time as a DOM timestamp
     */
    expires: number;
    /**
     * - Optional string selection with a default.
     */
    sameSite?: "strict" | "lax" | "none";
    /**
     * - Optional lifespan in seconds.
     */
    maxAge?: number;
};
/**
 * @typedef {Object} CookieConfig
 * @property {number} expires - Expiration time as a DOM timestamp
 * @property {"strict" | "lax" | "none"} [sameSite="lax"] - Optional string selection with a default.
 * @property {number} [maxAge] - Optional lifespan in seconds.
 */
/** Cookie service abstraction that interface with stated name */
export default class CookieService {
    #private;
    /**
     * Secure cookie storage
     * @param {string } name identifier of the cookie
     * @param {CookieConfig} options
     */
    constructor(name: string, options: CookieConfig);
    /**
     * @param {*} data
     * @param {{done: import("./constants.js").DataCallback, error: import("./constants.js").DataCallback}} [callbacks]
     * @returns {Promise<*>}
     */
    write(data: any, callbacks?: {
        done: import("./constants.js").DataCallback;
        error: import("./constants.js").DataCallback;
    }): Promise<any>;
    read(callbacks?: {
        done: import("./constants.js").DataCallback;
        error: import("./constants.js").DataCallback;
    }): Promise<any>;
    remove(): Promise<void>;
}
