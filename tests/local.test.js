import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SetStorage } from "../src/storage/local.js"

describe("SetStorage", () => {
    let localStorage

    beforeEach(() => {
        localStorage = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        }
        vi.stubGlobal("window", { localStorage })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("loads an empty Set when storage is empty", () => {
        localStorage.getItem.mockReturnValue(null)

        const storage = new SetStorage("viewed", "Viewed")

        expect(localStorage.getItem).toHaveBeenCalledWith("viewed")
        expect(storage.data).toEqual(new Set())
    })

    it("loads valid string identifiers from storage", () => {
        localStorage.getItem.mockReturnValue('["post-1","post-2"]')
        const done = vi.fn()

        const storage = new SetStorage("viewed", "Viewed")
        storage.get({ done, error: vi.fn() })

        expect(done).toHaveBeenCalledWith(new Set(["post-1", "post-2"]))
        expect(storage.data).toEqual(new Set(["post-1", "post-2"]))
    })

    it("reports invalid stored data and leaves an empty Set", () => {
        localStorage.getItem.mockReturnValue('{"id":"post-1"}')
        const error = vi.fn()

        const storage = new SetStorage("viewed", "Viewed")

        expect(error).not.toHaveBeenCalled()
        expect(storage.data).toBeInstanceOf(Set)
        storage.get({ done: vi.fn(), error })
        expect(error).toHaveBeenCalledWith(expect.objectContaining({
            message: "Invalid viewed data",
        }))
    })

    it("adds a value and saves it", () => {
        localStorage.getItem.mockReturnValue(null)
        const done = vi.fn()
        const storage = new SetStorage("viewed", "Viewed")

        storage.add("post-1", { done, error: vi.fn() })

        expect(storage.data).toEqual(new Set(["post-1"]))
        expect(localStorage.setItem).toHaveBeenCalledWith("viewed", '["post-1"]')
        expect(done).toHaveBeenCalledWith(storage.data)
    })

    it("does not save an existing value when adding", () => {
        localStorage.getItem.mockReturnValue('["post-1"]')
        const done = vi.fn()
        const storage = new SetStorage("viewed", "Viewed")

        storage.add("post-1", { done, error: vi.fn() })

        expect(localStorage.setItem).not.toHaveBeenCalled()
        expect(done).toHaveBeenCalledWith(storage.data)
    })

    it("flips a value from present to absent", () => {
        localStorage.getItem.mockReturnValue('["post-1"]')
        const done = vi.fn()
        const storage = new SetStorage("viewed", "Viewed")

        storage.flipset("post-1", { done, error: vi.fn() })

        expect(storage.data).toEqual(new Set())
        expect(localStorage.setItem).toHaveBeenCalledWith("viewed", "[]")
        expect(done).toHaveBeenCalledWith(storage.data)
    })

    it("flips a value from absent to present", () => {
        localStorage.getItem.mockReturnValue(null)
        const done = vi.fn()
        const storage = new SetStorage("viewed", "Viewed")

        storage.flipset("post-1", { done, error: vi.fn() })

        expect(storage.data).toEqual(new Set(["post-1"]))
        expect(localStorage.setItem).toHaveBeenCalledWith("viewed", '["post-1"]')
        expect(done).toHaveBeenCalledWith(storage.data)
    })

    it("passes storage read errors to the error callback", () => {
        const failure = new Error("read failed")
        localStorage.getItem.mockImplementation(() => {
            throw failure
        })
        const error = vi.fn()
        const storage = new SetStorage("viewed", "Viewed")

        storage.get({ done: vi.fn(), error })

        expect(error).toHaveBeenCalledWith(failure)
    })

    it("passes storage write errors to the error callback", () => {
        localStorage.getItem.mockReturnValue(null)
        const failure = new Error("write failed")
        localStorage.setItem.mockImplementation(() => {
            throw failure
        })
        const error = vi.fn()
        const storage = new SetStorage("viewed", "Viewed")

        storage.add("post-1", { done: vi.fn(), error })

        expect(error).toHaveBeenCalledWith(failure)
    })

    it("removes only this storage key", () => {
        localStorage.getItem.mockReturnValue(null)
        const storage = new SetStorage("viewed", "Viewed")

        storage.remove()

        expect(localStorage.removeItem).toHaveBeenCalledWith("viewed")
        expect(localStorage.clear).toBeUndefined()
    })

    it("does not expose private key properties", () => {
        localStorage.getItem.mockReturnValue(null)
        const storage = new SetStorage("viewed", "Viewed")

        expect(storage.keySlug).toBeUndefined()
        expect(Object.keys(storage)).not.toContain("keySlug")
        expect(Object.keys(storage)).not.toContain("#keySlug")
    })
})
