# 自动升级系统

Jarvis Todo 使用 `electron-updater` 与 electron-builder 的 GitHub provider。

## 工作流程

1. 安装版启动后延迟三秒检查更新。
2. `electron-updater` 读取 GitHub 最新正式 Release 中的 `latest.yml`。
3. 若发现更高版本，后台下载 NSIS 安装包与差分数据。
4. 下载完成后通知用户；用户可立即重启安装，也可退出应用时自动安装。

## 发布物

- `Jarvis-Todo-Setup-x.y.z.exe`：Windows NSIS 安装器
- `Jarvis-Todo-Setup-x.y.z.exe.blockmap`：差分升级数据
- `latest.yml`：版本、文件、哈希与下载地址

## 重要约束

- 客户端不能使用重复或降低的版本号。
- 更新 Release 必须是正式发布，不能只是草稿。
- 公开 GitHub 仓库可让客户端无凭据获取更新；私有仓库需要在每台客户端配置令牌，不适合普通分发。
- 未签名安装包可以构建和升级，但 Windows 可能显示信誉警告。生产分发应配置代码签名。

## 故障排查

升级日志保存在 Electron 用户日志目录。检查 Release 是否包含 `latest.yml`、安装器和 blockmap，并确认三者来自同一次构建。
