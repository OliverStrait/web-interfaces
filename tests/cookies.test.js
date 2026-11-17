import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import CookieService from "../src/storage/cookies.js"

describe("CookieService", () => {
    let cookieStore

    beforeEach(() => {
        cookieStore = {
            set: vi.fn(),
            get: vi.fn(),
            delete: vi.fn(),
        }
        vi.stubGlobal("cookieStore", cookieStore)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("writes a string value with its name and options", async () => {
        cookieStore.set.mockResolvedValue("written")
        const done = vi.fn()
        const service = new CookieService("session", {
            expires: new Date("2030-01-01T00:00:00Z"),
            sameSite: "strict",
            maxAge: 3600,
        })

        await service.write("abc", { done, error: vi.fn() })

        expect(cookieStore.set).toHaveBeenCalledWith({
            name: "session",
            value: "abc",
            expires: new Date("2030-01-01T00:00:00Z"),
            sameSite: "strict",
            maxAge: 3600,
        })
        expect(done).toHaveBeenCalledWith("written")
    })

    it("serializes non-string values to JSON", async () => {
        cookieStore.set.mockResolvedValue(undefined)

        await new CookieService("prefs").write({ theme: "dark", size: 12 })

        expect(cookieStore.set).toHaveBeenCalledWith({
            name: "prefs",
            value: "{\"theme\":\"dark\",\"size\":12}",
        })
    })

    it("passes write errors to the error callback", async () => {
        const failure = new Error("write failed")
        const error = vi.fn()
        cookieStore.set.mockRejectedValue(failure)

        await new CookieService("session").write("abc", { done: vi.fn(), error })

        expect(error).toHaveBeenCalledWith(failure)
    })

    it("reads a cookie and passes the result to the done callback", async () => {
        const cookie = { name: "session", value: "abc" }
        const done = vi.fn()
        cookieStore.get.mockResolvedValue(cookie)

        await new CookieService("session").read({ done, error: vi.fn() })

        expect(cookieStore.get).toHaveBeenCalledWith("session")
        expect(done).toHaveBeenCalledWith(cookie)
    })

    it("passes read errors to the error callback", async () => {
        const failure = new Error("read failed")
        const error = vi.fn()
        cookieStore.get.mockRejectedValue(failure)

        await new CookieService("session").read({ done: vi.fn(), error })

        expect(error).toHaveBeenCalledWith(failure)
    })

    it("deletes the named cookie", async () => {
        cookieStore.delete.mockResolvedValue(undefined)

        await new CookieService("session").remove()

        expect(cookieStore.delete).toHaveBeenCalledWith("session")
    })

    it("does not expose private properties", () => {
        const service = new CookieService("session", { sameSite: "strict" })

        expect(service.name).toBeUndefined()
        expect(service.options).toBeUndefined()
        expect(Object.keys(service)).not.toContain("name")
        expect(Object.keys(service)).not.toContain("options")
        expect(Reflect.ownKeys(service)).toEqual([])
    })
})
