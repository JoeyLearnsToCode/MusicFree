import React from "react";
import useAlbumDetail from "./hooks/useAlbumMusicList";
import { useParams } from "@/core/router";
import MusicSheetPage from "@/components/musicSheetPage";
import { useI18N } from "@/core/i18n";
import Album, { useAlbumIsStarred } from "@/core/album";
import Toast from "@/utils/toast";

export default function AlbumDetail() {
    const { albumItem: originalAlbumItem } = useParams<"album-detail">();
    const [requestStateCode, albumItem, musicList, getAlbumDetail] =
        useAlbumDetail(originalAlbumItem);
    const { t } = useI18N();

    const isAlbumStarred = useAlbumIsStarred(albumItem);
    const handleStarPress = async () => {
        if (!albumItem) return;
        if (!isAlbumStarred) {
            await Album.starAlbum(albumItem);
            Toast.success(t("toast.hasStarredAlbum"));
        } else {
            await Album.unstarAlbum(albumItem);
            Toast.success(t("toast.hasUnstarredAlbum"));
        }
    };

    return (
        <MusicSheetPage
            canStar
            isStarred={isAlbumStarred}
            onStarPress={handleStarPress}
            navTitle={t("common.album")}
            sheetInfo={albumItem}
            state={requestStateCode}
            onRetry={getAlbumDetail}
            onLoadMore={getAlbumDetail}
            musicList={musicList}
        />
    );
}
