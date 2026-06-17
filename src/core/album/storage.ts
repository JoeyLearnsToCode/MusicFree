import getOrCreateMMKV from "@/utils/getOrCreateMMKV.ts";
import { InteractionManager } from "react-native";
import { safeParse, safeStringify } from "@/utils/jsonUtil";

function getStorageData(key: string) {
    const mmkv = getOrCreateMMKV(`LocalSheet.${key}`);
    return safeParse(mmkv.getString("data"));
}

async function setStorageData(key: string, value: any) {
    return InteractionManager.runAfterInteractions(() => {
        const mmkv = getOrCreateMMKV(`LocalSheet.${key}`);
        mmkv.set("data", safeStringify(value));
    });
}

async function setStarredAlbums(albums: IAlbum.IAlbumItem[]) {
    return await setStorageData("starred-albums", albums);
}

function getStarredAlbums(): IAlbum.IAlbumItem[] {
    return getStorageData("starred-albums");
}

const storage = {
    setStarredAlbums,
    getStarredAlbums,
};

export default storage;
