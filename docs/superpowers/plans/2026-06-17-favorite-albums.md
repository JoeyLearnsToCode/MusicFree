# 收藏专辑功能 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现收藏专辑功能 — 专辑页收藏/取消收藏、主页收藏专辑 Tab、数据持久化与导入导出。

**Architecture:** 新建 `src/core/album/` 模块（独立于 `musicSheet`），包含 atom、MMKV 存储、hooks。PlayAllBar 新增 `isStarred`/`onStarPress` 可选属性支持外部收藏逻辑。修改 backup.ts 加入专辑导出。

**Tech Stack:** React Native, jotai, MMKV

---

### Task 1: MMKV 存储层 — `src/core/album/storage.ts`

**Files:**
- Create: `src/core/album/storage.ts`

- [ ] **Step 1: 创建 storage.ts**

```typescript
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
```

- [ ] **Step 2: 运行 lint 检查**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/core/album/storage.ts
git commit -m "feat(album): add MMKV storage for starred albums"
```

---

### Task 2: 核心逻辑 — `src/core/album/index.ts`

**Files:**
- Create: `src/core/album/index.ts`

- [ ] **Step 1: 创建 index.ts**

```typescript
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
```

- [ ] **Step 2: 运行 lint 检查**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/core/album/index.ts
git commit -m "feat(album): add core logic for starring/unstarring albums"
```

---

### Task 3: 修改 PlayAllBar — 支持外部收藏逻辑

**Files:**
- Modify: `src/components/base/playAllBar.tsx`

- [ ] **Step 1: 修改 PlayAllBar 接口和逻辑**

在 `IProps` 接口中新增两个可选属性：

```typescript
interface IProps {
    musicList: IMusic.IMusicItem[] | null;
    canStar?: boolean;
    musicSheet?: IMusic.IMusicSheetItem | null;
    // 新增：专辑收藏用，外部控制收藏状态和行为
    isStarred?: boolean;
    onStarPress?: () => void;
}
```

修改 `starred` 变量的计算方式（约第 32 行）：

替换：
```typescript
const starred = useSheetIsStarred(musicSheet);
```
为：
```typescript
const defaultStarred = useSheetIsStarred(musicSheet);
const starred = onStarPress !== undefined ? (isStarred ?? false) : defaultStarred;
```

修改心形按钮的 `onPress` 回调（约第 70-77 行）：

替换：
```typescript
onPress={async () => {
    if (!starred) {
        MusicSheet.starMusicSheet(musicSheet);
        Toast.success(t("toast.hasStarred"));
    } else {
        MusicSheet.unstarMusicSheet(musicSheet);
        Toast.success(t("toast.hasUnstarred"));
    }
}}
```
为：
```typescript
onPress={async () => {
    if (onStarPress) {
        await onStarPress();
    } else if (!starred) {
        MusicSheet.starMusicSheet(musicSheet);
        Toast.success(t("toast.hasStarred"));
    } else {
        MusicSheet.unstarMusicSheet(musicSheet);
        Toast.success(t("toast.hasUnstarred"));
    }
}}
```

- [ ] **Step 2: 运行 lint 检查**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/components/base/playAllBar.tsx
git commit -m "feat(playAllBar): add isStarred/onStarPress props for external star control"
```

---

### Task 4: 透传 isStarred/onStarPress 属性

**Files:**
- Modify: `src/components/musicSheetPage/index.tsx` — interface + 透传
- Modify: `src/components/musicSheetPage/components/sheetMusicList.tsx` — interface + 透传
- Modify: `src/components/musicSheetPage/components/header.tsx` — interface + 透传到 PlayAllBar

- [ ] **Step 1: 修改 musicSheetPage/index.tsx**

`IMusicSheetPageProps` 新增：
```typescript
isStarred?: boolean;
onStarPress?: () => void;
```

`MusicSheetPage` 组件中向 `SheetMusicList` 透传：
```typescript
<SheetMusicList
    canStar={canStar}
    isStarred={isStarred}
    onStarPress={onStarPress}
    sheetInfo={sheetInfo as any}
    musicList={musicList ?? sheetInfo?.musicList}
    state={state}
    onRetry={onRetry}
    onLoadMore={onLoadMore}
/>
```

- [ ] **Step 2: 修改 sheetMusicList.tsx**

`IMusicListProps` 新增：
```typescript
isStarred?: boolean;
onStarPress?: () => void;
```

`SheetMusicList` 组件中向 `Header` 透传：
```typescript
<Header
    canStar={canStar}
    isStarred={isStarred}
    onStarPress={onStarPress}
    musicSheet={sheetInfo}
    musicList={musicList}
/>
```

- [ ] **Step 3: 修改 header.tsx**

`IHeaderProps` 新增：
```typescript
isStarred?: boolean;
onStarPress?: () => void;
```

`Header` 组件中向 `PlayAllBar` 透传：
```typescript
<PlayAllBar
    canStar={canStar}
    isStarred={isStarred}
    onStarPress={onStarPress}
    musicList={musicList}
    musicSheet={musicSheet}
/>
```

- [ ] **Step 4: 运行 lint 检查**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/components/musicSheetPage/ && git commit -m "feat(musicSheetPage): thread isStarred/onStarPress through component chain"
```

---

### Task 5: 修改 AlbumDetail 页面 — 接入收藏按钮

**Files:**
- Modify: `src/pages/albumDetail/index.tsx`

- [ ] **Step 1: 修改 albumDetail/index.tsx**

加入 `Album` 导入和收藏逻辑：

```typescript
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
```

- [ ] **Step 2: 运行 lint 检查**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/pages/albumDetail/index.tsx
git commit -m "feat(albumDetail): add star/unstar button using album hooks"
```

---

### Task 6: 主页 — 添加"收藏专辑"Tab

**Files:**
- Modify: `src/pages/home/components/homeBody/sheets.tsx`

- [ ] **Step 1: 修改 sheets.tsx**

导入 `useStarredAlbums`：

```typescript
import MusicSheet, { useSheetsBase, useStarredSheets } from "@/core/musicSheet";
import Album, { useStarredAlbums } from "@/core/album";
```

新增 `starredAlbums` 数据源（跟在 `staredSheets` 后面）：

```typescript
const allSheets = useSheetsBase();
const staredSheets = useStarredSheets();
const starredAlbums = useStarredAlbums();
```

在第二个 Tab 后面新增第三个 Tab（"收藏专辑"），放在 `</TouchableWithoutFeedback>` 之后、`<View style={styles.more}>` 之前：

```tsx
<TouchableWithoutFeedback
    style={styles.tabContainer}
    accessible
    accessibilityLabel={t("home.starredAlbumsCount.a11y", {
        count: starredAlbums.length,
    })}
    onPress={() => {
        setIndex(2);
    }}>
    <ThemeText
        fontSize="title"
        accessible={false}
        style={[
            styles.tabText,
            index === 2 ? selectedTabTextStyle : null,
        ]}>
        {t("home.starredAlbums")}
    </ThemeText>
    <ThemeText
        fontColor="textSecondary"
        fontSize="subTitle"
        accessible={false}
        style={styles.tabText}>
        {" "}
        ({starredAlbums.length})
    </ThemeText>
</TouchableWithoutFeedback>
```

修改 `FlashList` 的 `data` 属性：

替换：
```typescript
data={(index === 0 ? allSheets : staredSheets) ?? []}
```
为：
```typescript
data={(index === 0 ? allSheets : index === 1 ? staredSheets : starredAlbums) ?? []}
```

在 `renderItem` 中处理专辑类型。在函数开头判断类型，修改条件分支。在 `isLocalSheet` 判断之后，添加专辑类型的判断：

替换：
```typescript
const isLocalSheet = !(
    sheet.platform && sheet.platform !== localPluginPlatform
);
```
为：
```typescript
const isAlbumTab = index === 2;
const isLocalSheet = !isAlbumTab && !(
    sheet.platform && sheet.platform !== localPluginPlatform
);
```

修改导航逻辑。在 `onPress` 中，Tab 2 导航到专辑详情：

替换：
```typescript
onPress={() => {
    if (isLocalSheet) {
        navigate(ROUTE_PATH.LOCAL_SHEET_DETAIL, {
            id: sheet.id,
        });
    } else {
        navigate(ROUTE_PATH.PLUGIN_SHEET_DETAIL, {
            sheetInfo: sheet,
        });
    }
}}
```
为：
```typescript
onPress={() => {
    if (isAlbumTab) {
        navigate(ROUTE_PATH.ALBUM_DETAIL, {
            albumItem: sheet,
        });
    } else if (isLocalSheet) {
        navigate(ROUTE_PATH.LOCAL_SHEET_DETAIL, {
            id: sheet.id,
        });
    } else {
        navigate(ROUTE_PATH.PLUGIN_SHEET_DETAIL, {
            sheetInfo: sheet,
        });
    }
}}
```

修改描述文本。专辑项显示艺术家（`artist`）或日期（`date`）：

替换：
```typescript
description={
    isLocalSheet
        ? t("home.songCount", { count: sheet.worksNum })
        : `${sheet.artist ?? ""}`
}
```
为：
```typescript
description={
    isAlbumTab
        ? `${sheet.artist ?? ""}${sheet.date ? ` · ${sheet.date}` : ""}`
        : isLocalSheet
            ? t("home.songCount", { count: sheet.worksNum })
            : `${sheet.artist ?? ""}`
}
```

修改删除按钮逻辑。专辑项调用 `Album.unstarAlbum`：

替换：
```typescript
{sheet.id !== MusicSheet.defaultSheet.id ? (
    <ListItem.ListItemIcon
        position="right"
        icon="trash-outline"
        onPress={() => {
            showDialog("SimpleDialog", {
                title: t("dialog.deleteSheetTitle"),
                content: t("dialog.deleteSheetContent", {
                    name: sheet.title,
                }),
                onOk: async () => {
                    if (isLocalSheet) {
                        await MusicSheet.removeSheet(
                            sheet.id,
                        );
                        Toast.success(t("toast.deleteSuccess"));
                    } else {
                        await MusicSheet.unstarMusicSheet(
                            sheet,
                        );
                        Toast.success(t("toast.hasUnstarred"));
                    }
                },
            });
        }}
    />
) : null}
```
为：
```typescript
{(isAlbumTab || sheet.id !== MusicSheet.defaultSheet.id) ? (
    <ListItem.ListItemIcon
        position="right"
        icon="trash-outline"
        onPress={() => {
            showDialog("SimpleDialog", {
                title: t(isAlbumTab ? "dialog.deleteAlbumTitle" : "dialog.deleteSheetTitle"),
                content: t(isAlbumTab ? "dialog.deleteAlbumContent" : "dialog.deleteSheetContent", {
                    name: sheet.title,
                }),
                onOk: async () => {
                    if (isAlbumTab) {
                        await Album.unstarAlbum(sheet as IAlbum.IAlbumItem);
                        Toast.success(t("toast.hasUnstarredAlbum"));
                    } else if (isLocalSheet) {
                        await MusicSheet.removeSheet(
                            sheet.id,
                        );
                        Toast.success(t("toast.deleteSuccess"));
                    } else {
                        await MusicSheet.unstarMusicSheet(
                            sheet,
                        );
                        Toast.success(t("toast.hasUnstarred"));
                    }
                },
            });
        }}
    />
) : null}
```

- [ ] **Step 2: 运行 lint 检查**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/pages/home/components/homeBody/sheets.tsx
git commit -m "feat(home): add starred albums tab in sheets section"
```

---

### Task 7: 修改 backup.ts — 导出/导入收藏专辑

**Files:**
- Modify: `src/core/backup.ts`

- [ ] **Step 1: 修改 backup.ts**

导入 `Album`：

```typescript
import Album from "@/core/album";
```

`IBackJson` 新增 `starredAlbums` 字段：

```typescript
interface IBackJson {
    musicSheets: IMusic.IMusicSheetItem[];
    starredAlbums: IAlbum.IAlbumItem[];
    plugins: Array<{ srcUrl: string; version: string }>;
}
```

`backup()` 函数中导出收藏专辑：

替换：
```typescript
return JSON.stringify({
    musicSheets: musicSheets,
    plugins: normalizedPlugins,
});
```
为：
```typescript
return JSON.stringify({
    musicSheets: musicSheets,
    starredAlbums: Album.backupAlbums(),
    plugins: normalizedPlugins,
});
```

`resume()` 函数中恢复收藏专辑（在恢复插件和歌单之后）：

在 `return Promise.all([...(resumePlugins ?? []), resumeMusicSheets]);` 之前添加：

```typescript
/** 恢复收藏专辑 */
const { starredAlbums } = obj ?? {};
if (Array.isArray(starredAlbums)) {
    await Album.resumeAlbums(starredAlbums);
}
```

- [ ] **Step 2: 运行 lint 检查**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/core/backup.ts
git commit -m "feat(backup): include starred albums in backup and restore"
```

---

### Task 8: 添加国际化 keys

**Files:**
- Modify: `src/core/i18n/languages/zh-cn.json`
- Modify: `src/core/i18n/languages/en-us.json`
- Modify: `src/core/i18n/languages/zh-tw.json`

- [ ] **Step 1: 修改 zh-cn.json**

在 `home.starredPlaylistsCount.a11y` 之后添加：

```json
"home.starredAlbums": "收藏专辑",
"home.starredAlbumsCount.a11y": "收藏专辑，共{count}个",
"dialog.deleteAlbumTitle": "取消收藏专辑",
"dialog.deleteAlbumContent": "确认取消收藏专辑「{name}」吗？",
```

在 `toast.hasUnstarred` 之后添加：

```json
"toast.hasStarredAlbum": "已收藏专辑",
"toast.hasUnstarredAlbum": "已取消收藏专辑",
```

- [ ] **Step 2: 修改 en-us.json**

在 `home.starredPlaylistsCount.a11y` 之后添加：

```json
"home.starredAlbums": "Starred Albums",
"home.starredAlbumsCount.a11y": "Starred Albums, {count} total",
"dialog.deleteAlbumTitle": "Unstar Album",
"dialog.deleteAlbumContent": "Are you sure to unstar album「{name}」?",
```

在 `toast.hasUnstarred` 之后添加：

```json
"toast.hasStarredAlbum": "Album starred",
"toast.hasUnstarredAlbum": "Album unstarred",
```

- [ ] **Step 3: 修改 zh-tw.json**

在 `home.starredPlaylistsCount.a11y` 之后添加：

```json
"home.starredAlbums": "收藏專輯",
"home.starredAlbumsCount.a11y": "收藏專輯，共{count}個",
"dialog.deleteAlbumTitle": "取消收藏專輯",
"dialog.deleteAlbumContent": "確認取消收藏專輯「{name}」嗎？",
```

在 `toast.hasUnstarred` 之后添加：

```json
"toast.hasStarredAlbum": "已收藏專輯",
"toast.hasUnstarredAlbum": "已取消收藏專輯",
```

- [ ] **Step 4: 运行 lint 检查**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/core/i18n/languages/
git commit -m "feat(i18n): add i18n keys for starred albums"
```

---

### Task 9: Bootstrap 初始化 Album 模块

**Files:**
- Modify: `src/entry/bootstrap/bootstrap.ts`

- [ ] **Step 1: 修改 bootstrap.ts**

导入 `Album`：

```typescript
import MusicSheet from "@/core/musicSheet";
import Album from "@/core/album";
```

在 `MusicSheet.setup()` 之后（或在 Promise.all 中）添加 `Album.setup()`：

替换：
```typescript
await Promise.all([
    Config.setup().then(() => {
        logger.mark("Config");
    }),
    MusicSheet.setup().then(() => {
        logger.mark("MusicSheet");
    }),
    musicHistory.setup().then(() => {
        logger.mark("musicHistory");
    }),
]);
```
为：
```typescript
await Promise.all([
    Config.setup().then(() => {
        logger.mark("Config");
    }),
    MusicSheet.setup().then(() => {
        logger.mark("MusicSheet");
    }),
    Album.setup(),
    musicHistory.setup().then(() => {
        logger.mark("musicHistory");
    }),
]);
```

- [ ] **Step 2: 运行 lint 检查**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/entry/bootstrap/bootstrap.ts
git commit -m "feat(bootstrap): initialize album module on startup"
```
