import RNFS from "react-native-fs";
import { createMMKV } from "react-native-mmkv";

const storage = createMMKV();
const HISTORY_KEY = "watchHistory";
const HISTORY_FILE = `${RNFS.DocumentDirectoryPath}/watchHistory.json`;

export async function getWatchHistory(): Promise<any[]> {
    try {
        const content = storage.getString(HISTORY_KEY);
        if (content) {
            return JSON.parse(content);
        }

        // Fallback/migration from old file-based storage
        const exists = await RNFS.exists(HISTORY_FILE);
        if (exists) {
            const oldContent = await RNFS.readFile(HISTORY_FILE, "utf8");
            const parsed = JSON.parse(oldContent || "[]");
            storage.set(HISTORY_KEY, JSON.stringify(parsed));
            // Optional: delete old file after migration
            await RNFS.unlink(HISTORY_FILE).catch(() => {});
            return parsed;
        }

        return [];
    } catch (e) {
        return [];
    }
}

export async function addToWatchHistory(item: any): Promise<void> {
    try {
        const list = await getWatchHistory();
        // avoid duplicates by id if present
        const key = item.id ?? JSON.stringify(item);
        const filtered = list.filter((i) => (i.id ?? JSON.stringify(i)) !== key);
        filtered.unshift(item);
        storage.set(HISTORY_KEY, JSON.stringify(filtered.slice(0, 200)));
    } catch (e) {
        // ignore
    }
}

export async function clearWatchHistory(): Promise<void> {
    try {
        storage.delete(HISTORY_KEY);
        const exists = await RNFS.exists(HISTORY_FILE);
        if (exists) await RNFS.unlink(HISTORY_FILE);
    } catch (e) {
        // ignore
    }
}

export async function clearAppCache(): Promise<void> {
    try {
        // remove watch history
        await clearWatchHistory();
        // attempt remove cache dir contents
        const cacheDir = RNFS.CachesDirectoryPath;
        const items = await RNFS.readDir(cacheDir);
        await Promise.all(items.map((it) => RNFS.unlink(it.path).catch(() => { })));
    } catch (e) {
        // ignore
    }
}
