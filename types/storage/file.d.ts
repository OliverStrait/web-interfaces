export type FilePickerAcceptType = {
    accept: Record<string, string[]>;
    description?: string;
};
export type FilePickerOptions = {
    id?: string;
    startIn?: any;
    suggestedName?: string;
    excludeAcceptAllOption?: boolean;
    types?: FilePickerAcceptType[];
    multiple?: boolean;
};
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
declare class FileStorage {
    #private;
    /**
     * @param {string} db_name IndexedDB database name
     * @param {string} setting_name Object store used to persist the file handle
     * @param {FilePickerOptions} [picker_options]
     */
    constructor(db_name: string, setting_name: string, picker_options?: FilePickerOptions);
    /**
     * Save data to the remembered file, prompting for a file when needed.
     * @param {string | Blob | BufferSource} data
     * @returns {Promise<string>} The saved filename
     */
    write(data: string | Blob | BufferSource): Promise<string>;
    /**
     * Read data from a selected file.
     * @param {"text" | "arrayBuffer" | "blob"} [format="text"]
     * @returns {Promise<string | ArrayBuffer | Blob>}
     */
    read(format?: "text" | "arrayBuffer" | "blob"): Promise<string | ArrayBuffer | Blob>;
    /** Forget the remembered file without deleting it from disk. */
    remove(): Promise<any>;
}
export { FileStorage };
