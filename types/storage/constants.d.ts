/**
 * @callback DataCallback
 * @param {*} data
 * @returns {*}
 */
export type DataCallback = (data: any) => any;
/** @type {{ done: DataCallback, error: DataCallback }} */
export declare const VOID_CALLBACKS: {
    done: DataCallback;
    error: DataCallback;
};
