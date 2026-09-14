# 开发指南

## 环境要求

- Windows 10/11 x64
- Node.js 22 或更高版本
- npm
- Git

## 项目结构

```text
dist/                 网页界面与业务逻辑
electron/main.cjs     Electron 主进程、菜单与升级逻辑
electron/preload.cjs  安全的渲染进程桥接
.github/workflows/    GitHub Release 自动构建
docs/                 项目文档
```

## 本地运行

```powershell
npm install
npm start
```

Electron 主进程直接载入 `dist/index.html`。渲染进程启用了上下文隔离、沙箱，并禁用了 Node.js 集成。

## 构建

```powershell
npm run pack   # 生成未安装的应用目录
npm run dist   # 生成 NSIS 安装包和 latest.yml
```

构建结果位于 `release/`。不要手动编辑 `latest.yml` 的哈希值。

## 版本号

版本号遵循 SemVer。发布前更新 `package.json` 与 `CHANGELOG.md`，并保证 Git 标签一致，例如 `v1.1.0`。
