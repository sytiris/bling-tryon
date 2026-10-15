## English

This patch adds a **native Intel Mac (x64) package** alongside Apple Silicon, Windows and Linux. Both Mac packages require **macOS 13.5 or newer** for the bundled Node 24 runtime.

| Computer | Download |
| --- | --- |
| Intel Mac / x86_64 | `bling-tryon-macOS-X64.tar.gz` |
| Apple Silicon / arm64 | `bling-tryon-macOS-ARM64.tar.gz` |
| Windows x64 | `bling-tryon-Windows-X64.tar.gz` |
| Linux x64 | `bling-tryon-Linux-X64.tar.gz` |

All four packages must pass native build/tests and runtime architecture checks before publication. `SHA256SUMS.txt` covers each archive. Download and extract the full matching package, then run `start-macos.command`, `start-windows.cmd` or `start-linux.sh`. Keep the helper running; load its `chrome-tryon` folder through Chrome Developer mode → Load unpacked.

Installation agents should query the actual latest Release. If no matching package exists, authorized local installation may build from source with a compatible runtime; no additional project-policy confirmation is required just for that fallback. Never install a mismatched architecture or bypass OS security.

English/Chinese UI, BYOK, temporary client tokens, 10/20-second standard-mode sessions and automatic disconnect rules are unchanged. No key is included in any package. macOS Apple Silicon has been tested locally; Intel Mac camera/site compatibility still needs real-device testing. No signed/notarized installer yet.

## 简体中文

本次补上 **Intel Mac（x64）原生安装包**，保留 Apple Silicon、Windows 和 Linux 包。两种 Mac 包均要求 **macOS 13.5 或以上**，这是内置 Node 24 的最低要求。

- Intel / `x86_64`：`bling-tryon-macOS-X64.tar.gz`。
- Apple Silicon / `arm64`：`bling-tryon-macOS-ARM64.tar.gz`。
- 四个包全部通过各自平台构建、测试与原生运行时架构检查后才发布，并提供 SHA256SUMS.txt。
- 安装智能体应读取实际最新 Release；没有匹配包时，已授权的本机安装允许用兼容运行时从源码构建，不因这一点重复索取许可。不能安装错误架构或绕过系统安全设置。

完整解压后运行对应启动器，保持助手开启；Chrome 开发者模式加载包内 chrome-tryon。升级前退出旧助手，再启动新版本并刷新购物页。

中英文界面、自备 Decart Key、短期令牌、10/20 秒标准模式和自动断连规则保持不变。安装包不含密钥。本机验证平台是 Apple Silicon；Intel Mac 的真实相机和购物网站效果仍需对应设备验证，暂无系统签名/公证安装器。
