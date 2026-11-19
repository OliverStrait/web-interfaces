import { LocalDb } from "./db.js";

class FileStorage {
    #settings;
    #picker_options;

    /**
     * @param {string} db_name IndexedDB database name
     * @param {string} setting_name Object store used to persist the file handle
     * @param {SaveFilePickerOptions} [picker_options]
     */
    constructor(db_name, setting_name, picker_options = {}) {
        this.#settings = new LocalDb(db_name, setting_name);
        this.#picker_options = picker_options;
    }

    async #selectFile() {
        if (typeof globalThis.showSaveFilePicker !== "function") {
            throw new Error("The File System Access API is not available in this browser or secure context");
        }

        const handle = await globalThis.showSaveFilePicker(this.#picker_options);
        await this.#settings.write(handle);
        return handle;
    }

    async #getFileHandle() {
        const handle = await this.#settings.read();
        if (
            !handle
            || handle.kind !== "file"
            || typeof handle.queryPermission !== "function"
            || typeof handle.requestPermission !== "function"
            || typeof handle.createWritable !== "function"
        ) {
            return this.#selectFile();
        }

        const options = { mode: "readwrite" };
        let permission = await handle.queryPermission(options);
        if (permission !== "granted") {
            permission = await handle.requestPermission(options);
        }

        return permission === "granted" ? handle : this.#selectFile();
    }

    /**
     * Save data to the remembered file, prompting for a file when needed.
     * @param {string | Blob | BufferSource} data
     * @returns {Promise<string>} The saved filename
     */
    async write(data) {
        const handle = await this.#getFileHandle();
        const writable = await handle.createWritable();

        try {
            await writable.write(data);
        } catch (error) {
            try {
                await writable.abort();
            } catch (abortError) {
                throw new AggregateError(
                    [error, abortError],
                    "Writing the file failed and the writable stream could not be aborted",
                );
            }
            throw error;
        }

        await writable.close();
        return handle.name;
    }

    /** Forget the remembered file without deleting it from disk. */
    async remove() {
        return this.#settings.remove();
    }
}

export { FileStorage };
