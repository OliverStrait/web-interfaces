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
        return {
            kind: "file",
            name,
            queryPermission: vi.fn().mockResolvedValue("granted"),
            requestPermission: vi.fn(),
            createWritable: vi.fn().mockResolvedValue(writable),
            writable,
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

    it("reports when the file picker API is unavailable", async () => {
        settings.read.mockResolvedValue(undefined)
        vi.stubGlobal("showSaveFilePicker", undefined)

        const storage = new FileStorage("app", "report")

        await expect(storage.write("contents")).rejects.toThrow(
            "The File System Access API is not available",
        )
    })
})
