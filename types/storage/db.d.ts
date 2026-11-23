declare class LocalDb {
    #private;
    /**
     * @param {string} db_name
     * @param {string} data_name Object store used for this value
     * @param {number} [db_version=1]
     */
    constructor(db_name: string, data_name: string, db_version?: number);
    /**
     * Read the stored value.
     * @returns {Promise<*>}
     */
    read(): Promise<any>;
    /** Write or replace the stored value. */
    /** @param {*} data */
    write(data: any): Promise<any>;
    /** Remove the stored value without deleting the database or object store. */
    remove(): Promise<any>;
}
export { LocalDb };
