/**
 * @callback DataCallback
 * @param {*} data
 * @returns {*}
 */

/** @type {{ done: DataCallback, error: DataCallback }} */
export const VOID_CALLBACKS = { done: (d) => { }, error: (d) => { } };