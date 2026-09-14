# Jarvis Todo

Jarvis Todo 是一款 Windows 桌面待办事项应用，界面和工作流参考 Microsoft To Do。当前版本为 **1.0.0**。

## 功能

- 我的一天、重要、计划内、任务和自定义列表
- 创建、完成、收藏、搜索和排序任务
- 截止日期、提醒、重复、步骤与备注
- 主题切换、双栏打印和发送给 Jarvis
- 本机持久化，无需账户即可使用
- 通过 GitHub Releases 自动检查、下载与安装升级

## 安装

前往仓库的 **Releases** 页面下载 `Jarvis-Todo-Setup-1.0.0.exe`，运行安装程序。安装器支持选择目录，并创建桌面与开始菜单快捷方式。

> 首个未签名版本可能触发 Windows SmartScreen。确认文件来自本仓库后，可选择“更多信息 → 仍要运行”。正式分发建议配置 Windows 代码签名证书。

## 快速开发

```powershell
npm install
npm start
```

生成 Windows 安装包：

```powershell
npm run dist
```

更多说明见：

- [用户手册](docs/USER_GUIDE.md)
- [开发指南](docs/DEVELOPMENT.md)
- [发布指南](docs/RELEASING.md)
- [自动升级说明](docs/UPDATE_SYSTEM.md)
- [更新日志](CHANGELOG.md)

## 数据与隐私

任务数据保存在当前 Windows 用户的 Electron 本地存储中，不会自动上传到服务器。卸载应用通常不会删除用户数据；如需彻底清理，可删除 Electron 为 `Jarvis Todo` 创建的用户数据目录。

## 许可证

[MIT](LICENSE)
