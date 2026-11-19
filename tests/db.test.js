import { afterEach, describe, expect, it, vi } from "vitest"
import { LocalDb } from "../src/storage/db.js"

describe("LocalDb", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("creates its object store and reads, writes, and removes its value", async () => {
        const values = new Map()
        const stores = new Set()
        let store
        let db

        const makeRequest = (result, transaction) => {
            const request = { result }
            queueMicrotask(() => {
                request.onsuccess()
                queueMicrotask(() => transaction.oncomplete())
            })
            return request
        }

        const transaction = {
            objectStore: vi.fn(() => store),
        }
        store = {
            get: vi.fn(key => makeRequest(values.get(key), transaction)),
            put: vi.fn((value, key) => {
                values.set(key, value)
                return makeRequest(key, transaction)
            }),
            delete: vi.fn(key => {
                values.delete(key)
                return makeRequest(undefined, transaction)
            }),
        }
        db = {
            objectStoreNames: {
                contains: name => stores.has(name),
            },
            createObjectStore: vi.fn(name => {
                stores.add(name)
                return store
            }),
            transaction: vi.fn(() => transaction),
            close: vi.fn(),
        }
        vi.stubGlobal("indexedDB", {
            open: vi.fn(() => {
                const request = { result: db }
                queueMicrotask(() => {
                    request.onupgradeneeded()
                    request.onsuccess()
                })
                return request
            }),
        })

        const storage = new LocalDb("app", "records")
        const value = { count: 1 }

        expect(await storage.read()).toBeUndefined()
        expect(await storage.write(value)).toBe("value")
        expect(await storage.read()).toEqual(value)
        expect(await storage.remove()).toBeUndefined()
        expect(await storage.read()).toBeUndefined()
        expect(db.createObjectStore).toHaveBeenCalledOnce()
        expect(db.transaction).toHaveBeenCalledWith("records", "readwrite")
        expect(db.close).toHaveBeenCalled()
    })

    it("rejects when IndexedDB is unavailable", async () => {
        vi.stubGlobal("indexedDB", undefined)

        await expect(new LocalDb("app", "records").read()).rejects.toThrow(
            "IndexedDB is not available",
        )
    })
})
