
class LocalDb {
    #db_name;
    #db_version;
    #data_name;

    /**
     * @param {string} db_name
     * @param {string} data_name Object store used for this value
     * @param {number} [db_version=1]
     */
    constructor(db_name, data_name, db_version = 1) {
        this.#db_name = db_name;
        this.#data_name = data_name;
        this.#db_version = db_version;
    }

    /** @returns {Promise<IDBDatabase>} */
    async #open() {
        if (typeof indexedDB === "undefined") {
            throw new Error("IndexedDB is not available");
        }

        return new Promise((resolve, reject) => {
            /** @type {IDBOpenDBRequest} */
            let request;
            try {
                request = indexedDB.open(this.#db_name, this.#db_version);
            } catch (error) {
                reject(error);
                return;
            }

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(this.#data_name)) {
                    db.createObjectStore(this.#data_name);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));
        });
    }

    /**
     * @param {IDBTransactionMode} mode
     * @param {(store: IDBObjectStore) => IDBRequest} operation
     * @returns {Promise<any>}
     */
    async #run(mode, operation) {
        const db = await this.#open();

        return new Promise((resolve, reject) => {
            /** @type {IDBTransaction | undefined} */
            var transaction;
            /** @type {IDBRequest | undefined} */
            let request;
            /** @type {any} */
            let result;

            try {
                transaction = db.transaction(this.#data_name, mode);
                request = operation(transaction.objectStore(this.#data_name));
                request.onsuccess = () => {
                    result = request?.result;
                };
                transaction.oncomplete = () => {
                    db.close();
                    resolve(result);
                };
                transaction.onabort = () => {
                    db.close();
                    reject(transaction?.error ?? request?.error ?? new Error("IndexedDB transaction aborted"));
                };
                transaction.onerror = () => {
                    reject(transaction?.error ?? request?.error ?? new Error("IndexedDB transaction failed"));
                };
            } catch (error) {
                db.close();
                reject(error);
            }
        });
    }

    /**
     * Read the stored value.
     * @returns {Promise<*>}
     */
    async read() {
        return this.#run("readonly", store => store.get("value"));
    }

    /** Write or replace the stored value. */
    /** @param {*} data */
    async write(data) {
        return this.#run("readwrite", store => store.put(data, "value"));
    }

    /** Remove the stored value without deleting the database or object store. */
    async remove() {
        return this.#run("readwrite", store => store.delete("value"));
    }
}

export { LocalDb };