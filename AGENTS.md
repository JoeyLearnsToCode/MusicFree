# MusicFree — Agent 指南

## 项目概述

基于 React Native 0.76.5 + Expo 的插件化音乐播放器（仅 Android/Harmony OS）。  
入口：`index.js` → `src/entry/index.tsx`。后台播放服务：`src/service/index.ts`。

## 关键命令

| 命令 | 用途 |
|------|------|
| `npm run android` | 启动 Android 设备/模拟器运行 |
| `npm run ios` | 启动 iOS 模拟器运行 |
| `npm run start` | 启动 Metro bundler |
| `npm run lint` | ESLint 检查 `src/**/*.{js,jsx,ts,tsx}` 并自动修复 |
| `npm run test` | Jest 测试 |
| `npm run build-android` | 构建 APK release (`./gradlew assembleRelease`) |
| `npm run generate-assets` | 从 `src/assets/icons/` 的 SVG 文件自动生成 `src/components/base/icon.tsx` |
| `npm run clean` | 清理 Android gradle 构建缓存 |
| `npm run connect-mumu` | 连接 MuMu 模拟器 (adb localhost:7555) |

无 typecheck 脚本。tsconfig 中 `noImplicitAny: false`，类型检查较弱。

## 代码规范

- **缩进**: 4 空格
- **引号**: 双引号
- **分号**: 必需
- **尾逗号**: `always-multiline`
- **花括号**: `1tbs`
- **箭头函数参数**: 无括号（单参数时）
- **import/export 花括号**: 前后空格 (`{ foo }`)
- ESLint 配置: `@react-native` + `prettier` 扩展
- `.eslintignore`: `src/lib/*` 排除检查

## 路径别名

`@/` → `./src/`（babel-plugin-module-resolver 和 tsconfig paths 均配置）

## 架构要点

- **插件化核心**: `src/core/pluginManager/` 管理插件生命周期，插件是 CommonJS 模块
- **依赖注入**: 各模块通过 `injectDependencies(Config, ...)` 注入依赖（见 `src/entry/bootstrap/bootstrap.ts:32-37`）
- **状态管理**: `jotai`（原子状态）+ 自定义 `GlobalState`（基于 `StateMapper` 观察者模式）
- **导航**: `@react-navigation/native-stack`，路由定义在 `src/core/router/routes.tsx`
- **播放器**: `react-native-track-player`，类型定义在 `src/core.defination/trackPlayer/`
- **存储**: MMKV (`react-native-mmkv`) 优先，AsyncStorage 逐步迁移中
- **日志**: `react-native-logs` 写文件到 `{basePath}/log/`

## SVG 图标管理

- 图标 SVG 文件放在 `src/assets/icons/`
- 每次增删改 SVG 后必须运行 `npm run generate-assets` 重新生成组件
- Metro 配置了 `react-native-svg-transformer` 处理 `.svg`

## 特殊配置注意

- `babel.config.js`: `react-native-reanimated/plugin` 必须放在 **最后**
- `webdav` 在 babel 中别名为 `webdav/dist/react-native`
- Metro 配置额外处理 SVG 的 transformer/resolver
- 生产构建会移除 console 调用（`transform-remove-console`）

## 国际化

`src/core/i18n/`，通过 `i18n.t("key")` 使用

## 提交规范

- 使用 Conventional Commits (`feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`, `revert`, `ci`)
- Husky pre-commit: `lint-staged`（对 `src/**/*.{ts,tsx}` 运行 lint）
- Husky commit-msg: `commitlint` 校验
