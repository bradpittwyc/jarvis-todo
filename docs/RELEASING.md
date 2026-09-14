# 发布指南

## 自动发布

1. 确认主分支已通过本地运行和安装包测试。
2. 更新 `package.json` 中的版本号与 `CHANGELOG.md`。
3. 提交更改并推送到 GitHub。
4. 创建并推送与版本一致的标签：

```powershell
git tag v1.0.0
git push origin main --tags
```

GitHub Actions 会在 Windows 环境执行 `npm ci` 和 `npm run release`，随后创建 GitHub Release，并上传安装包、blockmap 与 `latest.yml`。

## 本地发布

需要具有仓库 Release 写权限的 GitHub Token：

```powershell
$env:GH_TOKEN = "<token>"
npm run release
```

不要把 Token 写入源码、配置文件、日志或 Git 历史。

## 发布检查清单

- 应用版本、Git 标签和更新日志一致
- Windows 安装、卸载和快捷方式正常
- `latest.yml` 与安装包在同一 Release
- 从上一正式版本能够发现并下载新版本
- Release 不是草稿，且仓库为公开仓库
