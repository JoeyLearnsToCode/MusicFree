import { isSameMediaItem } from "@/utils/mediaUtils";
import { atom, getDefaultStore, useAtomValue } from "jotai";
import { useMemo } from "react";
import storage from "./storage.ts";

const starredAlbumsAtom = atom<IAlbum.IAlbumItem[]>([]);

function setup() {
    const albums = storage.getStarredAlbums() || [];
    getDefaultStore().set(starredAlbumsAtom, albums);
}

async function starAlbum(albumItem: IAlbum.IAlbumItem) {
    const store = getDefaultStore();
    const starredAlbums = store.get(starredAlbumsAtom);
    const newVal = [albumItem, ...starredAlbums];
    store.set(starredAlbumsAtom, newVal);
    await storage.setStarredAlbums(newVal);
}

async function unstarAlbum(albumItem: IAlbum.IAlbumItemBase) {
    const store = getDefaultStore();
    const starredAlbums = store.get(starredAlbumsAtom);
    const newVal = starredAlbums.filter(
        it =>
            !isSameMediaItem(
                it as ICommon.IMediaBase,
                albumItem as ICommon.IMediaBase,
            ),
    );
    store.set(starredAlbumsAtom, newVal);
    await storage.setStarredAlbums(newVal);
}

function backupAlbums(): IAlbum.IAlbumItem[] {
    return getDefaultStore().get(starredAlbumsAtom);
}

async function resumeAlbums(albums: IAlbum.IAlbumItem[]) {
    if (!Array.isArray(albums)) return;
    getDefaultStore().set(starredAlbumsAtom, albums);
    await storage.setStarredAlbums(albums);
}

function useAlbumIsStarred(albumItem?: IAlbum.IAlbumItem | null) {
    const albums = useAtomValue(starredAlbumsAtom);
    return useMemo(() => {
        if (!albumItem) return false;
        return (
            albums.findIndex(it =>
                isSameMediaItem(
                    it as ICommon.IMediaBase,
                    albumItem as ICommon.IMediaBase,
                ),
            ) !== -1
        );
    }, [albumItem, albums]);
}

function useStarredAlbums() {
    return useAtomValue(starredAlbumsAtom);
}

const Album = {
    setup,
    starAlbum,
    unstarAlbum,
    backupAlbums,
    resumeAlbums,
    useAlbumIsStarred,
    useStarredAlbums,
};

export default Album;
export { useAlbumIsStarred, useStarredAlbums };
