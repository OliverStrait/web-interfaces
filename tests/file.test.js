import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../src/storage/db.js", () => ({
    LocalDb: vi.fn(),
}))

import { LocalDb } from "../src/storage/db.js"
import { FileStorage } from "../src/storage/file.js"

describe("FileStorage", () => {
    let settings

    beforeEach(() => {
        settings = {
            read: vi.fn(),
            write: vi.fn(),
            remove: vi.fn(),
        }
        LocalDb.mockImplementation(function () {
            return settings
        })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.clearAllMocks()
    })

    function makeFileHandle(name) {
        const writable = {
            write: vi.fn(),
            close: vi.fn(),
            abort: vi.fn(),
        }
        const file = new File(["contents"], name)
        return {
            kind: "file",
            name,
            queryPermission: vi.fn().mockResolvedValue("granted"),
            requestPermission: vi.fn(),
            createWritable: vi.fn().mockResolvedValue(writable),
            getFile: vi.fn().mockResolvedValue(file),
            writable,
            file,
        }
    }

    it("prompts for a file when no handle is stored and remembers it", async () => {
        const handle = makeFileHandle("report.txt")
        settings.read.mockResolvedValue(undefined)
        settings.write.mockResolvedValue("value")
        vi.stubGlobal("showSaveFilePicker", vi.fn().mockResolvedValue(handle))

        const storage = new FileStorage("app", "report", { suggestedName: "report.txt" })

        await expect(storage.write("contents")).resolves.toBe("report.txt")
        expect(globalThis.showSaveFilePicker).toHaveBeenCalledWith({ suggestedName: "report.txt" })
        expect(settings.write).toHaveBeenCalledWith(handle)
        expect(handle.writable.write).toHaveBeenCalledWith("contents")
        expect(handle.writable.close).toHaveBeenCalledOnce()
    })

    it("reuses a stored file handle when write permission is granted", async () => {
        const handle = makeFileHandle("report.txt")
        settings.read.mockResolvedValue(handle)
        vi.stubGlobal("showSaveFilePicker", vi.fn())

        const storage = new FileStorage("app", "report")

        await storage.write("updated")

        expect(handle.queryPermission).toHaveBeenCalledWith({ mode: "readwrite" })
        expect(handle.requestPermission).not.toHaveBeenCalled()
        expect(globalThis.showSaveFilePicker).not.toHaveBeenCalled()
    })

    it("prompts for a replacement file when permission is denied", async () => {
        const previousHandle = makeFileHandle("old.txt")
        const replacementHandle = makeFileHandle("new.txt")
        previousHandle.queryPermission.mockResolvedValue("denied")
        previousHandle.requestPermission.mockResolvedValue("denied")
        settings.read.mockResolvedValue(previousHandle)
        vi.stubGlobal("showSaveFilePicker", vi.fn().mockResolvedValue(replacementHandle))

        const storage = new FileStorage("app", "report")

        await expect(storage.write("contents")).resolves.toBe("new.txt")
        expect(settings.write).toHaveBeenCalledWith(replacementHandle)
    })

    it("downloads through an anchor when the file picker API is unavailable", async () => {
        settings.read.mockResolvedValue(undefined)
        vi.stubGlobal("showSaveFilePicker", undefined)
        const createObjectURL = vi.fn().mockReturnValue("blob:report")
        const revokeObjectURL = vi.fn()
        vi.stubGlobal("URL", { createObjectURL, revokeObjectURL })
        const anchor = {
            href: "",
            download: "",
            hidden: false,
            click: vi.fn(),
            remove: vi.fn(),
        }
        const append = vi.fn()
        vi.stubGlobal("document", {
            createElement: vi.fn().mockReturnValue(anchor),
            body: { append },
        })
        vi.stubGlobal("queueMicrotask", vi.fn(callback => callback()))

        const storage = new FileStorage("app", "report", { suggestedName: "report.txt" })

        await expect(storage.write("contents")).resolves.toBe("report.txt")
        expect(settings.read).not.toHaveBeenCalled()
        expect(createObjectURL).toHaveBeenCalledOnce()
        expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob)
        expect(anchor.download).toBe("report.txt")
        expect(append).toHaveBeenCalledWith(anchor)
        expect(anchor.click).toHaveBeenCalledOnce()
        expect(anchor.remove).toHaveBeenCalledOnce()
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:report")
    })

    it("uses download when no suggested filename is provided", async () => {
        vi.stubGlobal("showSaveFilePicker", undefined)
        vi.stubGlobal("URL", {
            createObjectURL: vi.fn().mockReturnValue("blob:file"),
            revokeObjectURL: vi.fn(),
        })
        const anchor = {
            href: "",
            download: "",
            hidden: false,
            click: vi.fn(),
            remove: vi.fn(),
        }
        vi.stubGlobal("document", {
            createElement: vi.fn().mockReturnValue(anchor),
            body: { append: vi.fn() },
        })
        vi.stubGlobal("queueMicrotask", vi.fn(callback => callback()))

        const storage = new FileStorage("app", "report")

        await expect(storage.write(new Uint8Array([1, 2, 3]))).resolves.toBe("download")
        expect(anchor.download).toBe("download")
    })

    it("reports when legacy downloads are unsupported", async () => {
        vi.stubGlobal("showSaveFilePicker", undefined)
        vi.stubGlobal("URL", undefined)
        vi.stubGlobal("document", undefined)

        const storage = new FileStorage("app", "report")

        await expect(storage.write("contents")).rejects.toThrow(
            "The browser does not support creating downloadable files",
        )
    })

    it("opens and reads a file through showOpenFilePicker", async () => {
        const handle = makeFileHandle("report.txt")
        settings.read.mockResolvedValue(undefined)
        settings.write.mockResolvedValue("value")
        vi.stubGlobal("showOpenFilePicker", vi.fn().mockResolvedValue([handle]))

        const storage = new FileStorage("app", "report", { suggestedName: "report.txt" })

        await expect(storage.read()).resolves.toBe("contents")
        expect(globalThis.showOpenFilePicker).toHaveBeenCalledWith({
            multiple: false,
            excludeAcceptAllOption: undefined,
            id: undefined,
            startIn: undefined,
            types: undefined,
        })
        expect(settings.write).toHaveBeenCalledWith(handle)
        expect(handle.getFile).toHaveBeenCalledOnce()
    })

    it("reads array buffers from a selected file", async () => {
        const handle = makeFileHandle("report.bin")
        handle.file = new Blob([new Uint8Array([1, 2, 3])])
        handle.getFile.mockResolvedValue(handle.file)
        settings.read.mockResolvedValue(handle)
        vi.stubGlobal("showOpenFilePicker", vi.fn())

        const storage = new FileStorage("app", "report")

        await expect(storage.read("arrayBuffer")).resolves.toEqual(
            new Uint8Array([1, 2, 3]).buffer,
        )
    })

    it("reads through a hidden file input when open picker APIs are unavailable", async () => {
        vi.stubGlobal("showOpenFilePicker", undefined)
        const file = new File(["legacy contents"], "legacy.txt")
        const input = {
            type: "",
            hidden: false,
            multiple: true,
            accept: "",
            files: [file],
            click: vi.fn(),
            remove: vi.fn(),
            addEventListener: vi.fn((event, listener) => {
                if (event === "change") {
                    listener()
                }
            }),
        }
        vi.stubGlobal("document", {
            createElement: vi.fn().mockReturnValue(input),
            body: { append: vi.fn() },
        })

        const storage = new FileStorage("app", "report", {
            types: [{ accept: { "text/plain": [".txt"] } }],
        })

        await expect(storage.read()).resolves.toBe("legacy contents")
        expect(input.type).toBe("file")
        expect(input.accept).toBe("text/plain,.txt")
        expect(input.multiple).toBe(false)
        expect(input.click).toHaveBeenCalledOnce()
        expect(input.remove).toHaveBeenCalledOnce()
    })

    it("rejects unsupported read formats", async () => {
        vi.stubGlobal("showOpenFilePicker", undefined)
        const file = new File(["contents"], "report.txt")
        const input = {
            type: "",
            hidden: false,
            multiple: true,
            accept: "",
            files: [file],
            click: vi.fn(),
            remove: vi.fn(),
            addEventListener: vi.fn((event, listener) => {
                if (event === "change") {
                    listener()
                }
            }),
        }
        vi.stubGlobal("document", {
            createElement: vi.fn().mockReturnValue(input),
            body: { append: vi.fn() },
        })

        const storage = new FileStorage("app", "report")

        await expect(storage.read("json")).rejects.toThrow(
            "Unsupported file read format: json",
        )
    })
})
