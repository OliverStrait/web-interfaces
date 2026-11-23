import { LocalDb } from "./db.js";

/**
 * @typedef {Object} FilePickerAcceptType
 * @property {Record<string, string[]>} accept
 * @property {string} [description]
 */

/**
 * @typedef {Object} FilePickerOptions
 * @property {string} [id]
 * @property {*} [startIn]
 * @property {string} [suggestedName]
 * @property {boolean} [excludeAcceptAllOption]
 * @property {FilePickerAcceptType[]} [types]
 * @property {boolean} [multiple]
 */

class FileStorage {
    #settings;
    #picker_options;

    /**
     * @param {string} db_name IndexedDB database name
     * @param {string} setting_name Object store used to persist the file handle
     * @param {FilePickerOptions} [picker_options]
     */
    constructor(db_name, setting_name, picker_options = {}) {
        this.#settings = new LocalDb(db_name, setting_name);
        this.#picker_options = picker_options;
    }

    async #selectFile() {
        const browser = /** @type {any} */ (globalThis);
        if (typeof browser.showSaveFilePicker !== "function") {
            throw new Error("The File System Access API is not available in this browser or secure context");
        }

        const handle = await browser.showSaveFilePicker(this.#picker_options);
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

    async #selectReadFile() {
        const browser = /** @type {any} */ (globalThis);
        if (typeof browser.showOpenFilePicker !== "function") {
            return this.#legacyRead();
        }

        const [handle] = await browser.showOpenFilePicker({
            multiple: false,
            excludeAcceptAllOption: this.#picker_options.excludeAcceptAllOption,
            id: this.#picker_options.id,
            startIn: this.#picker_options.startIn,
            types: this.#picker_options.types,
        });
        await this.#settings.write(handle);
        return handle;
    }

    async #getReadableFileHandle() {
        const handle = await this.#settings.read();
        if (
            !handle
            || handle.kind !== "file"
            || typeof handle.getFile !== "function"
            || typeof handle.queryPermission !== "function"
            || typeof handle.requestPermission !== "function"
        ) {
            return this.#selectReadFile();
        }

        const options = { mode: "read" };
        let permission = await handle.queryPermission(options);
        if (permission !== "granted") {
            permission = await handle.requestPermission(options);
        }

        return permission === "granted" ? handle : this.#selectReadFile();
    }

    #legacyRead() {
        return new Promise((resolve, reject) => {
            const browser = /** @type {any} */ (globalThis);
            if (
                typeof browser.document?.createElement !== "function"
                || typeof browser.Blob !== "function"
            ) {
                reject(new Error("The browser does not support reading files"));
                return;
            }

            const input = document.createElement("input");
            input.type = "file";
            input.hidden = true;
            input.multiple = false;
            input.accept = this.#pickerOptionsAccept();
            document.body.append(input);

            const cleanup = () => {
                input.remove();
            };
            const abort = () => {
                cleanup();
                if (typeof browser.DOMException === "function") {
                    reject(new DOMException("The file selection was cancelled", "AbortError"));
                } else {
                    const error = new Error("The file selection was cancelled");
                    error.name = "AbortError";
                    reject(error);
                }
            };

            input.addEventListener("change", () => {
                const file = input.files?.[0];
                if (!file) {
                    abort();
                    return;
                }
                cleanup();
                resolve(file);
            }, { once: true });
            input.addEventListener("cancel", abort, { once: true });
            input.click();
        });
    }

    #pickerOptionsAccept() {
        const accept = this.#picker_options.types?.[0]?.accept;
        if (!accept) {
            return "";
        }

        return Object.entries(accept)
            .flatMap(([mime, extensions]) => [mime, ...(extensions ?? [])])
            .join(",");
    }

    /**
     * @param {string | Blob | BufferSource} data
     * @returns {string}
     */
    #legacyWrite(data) {
        const browser = /** @type {any} */ (globalThis);
        if (
            typeof browser.document?.createElement !== "function"
            || typeof browser.URL?.createObjectURL !== "function"
            || typeof browser.Blob !== "function"
        ) {
            throw new Error("The browser does not support creating downloadable files");
        }

        let blob;
        if (typeof browser.Blob !== "undefined" && data instanceof browser.Blob) {
            blob = data;
        } else {
            let type = "";
            const type_accept = this.#picker_options.types?.[0]?.accept;
            if (type_accept) {
                type = Object.keys(type_accept)[0] ?? "";
            }
            blob = new browser.Blob([data], type ? { type } : undefined);
        }

        const object_url = URL.createObjectURL(blob);
        const filename = this.#picker_options.suggestedName || "download";
        const anchor = document.createElement("a");
        anchor.href = object_url;
        anchor.download = filename;
        anchor.hidden = true;
        document.body.append(anchor);

        try {
            anchor.click();
        } finally {
            anchor.remove();
            const revoke = () => URL.revokeObjectURL(object_url);
            if (typeof globalThis.queueMicrotask === "function") {
                globalThis.queueMicrotask(revoke);
            } else {
                globalThis.setTimeout(revoke, 0);
            }
        }

        return filename;
    }

    /**
     * Save data to the remembered file, prompting for a file when needed.
     * @param {string | Blob | BufferSource} data
     * @returns {Promise<string>} The saved filename
     */
    async write(data) {
        const browser = /** @type {any} */ (globalThis);
        if (typeof browser.showSaveFilePicker !== "function") {
            return this.#legacyWrite(data);
        }

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

    /**
     * Read data from a selected file.
     * @param {"text" | "arrayBuffer" | "blob"} [format="text"]
     * @returns {Promise<string | ArrayBuffer | Blob>}
     */
    async read(format = "text") {
        const browser = /** @type {any} */ (globalThis);
        let file;
        if (typeof browser.showOpenFilePicker === "function") {
            const handle = await this.#getReadableFileHandle();
            file = await handle.getFile();
        } else {
            file = await this.#legacyRead();
        }

        if (format === "text") {
            return file.text();
        }
        if (format === "arrayBuffer") {
            return file.arrayBuffer();
        }
        if (format === "blob") {
            return file;
        }
        throw new Error(`Unsupported file read format: ${format}`);
    }

    /** Forget the remembered file without deleting it from disk. */
    async remove() {
        return this.#settings.remove();
    }
}

export { FileStorage };
