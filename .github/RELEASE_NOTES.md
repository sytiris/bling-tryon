## English

### New in v1.3.0

- Optional **Vidu S2-Editing (experimental)** alongside the default Decart Lucy VTON. Select China or Global in local setup and use your own matching Vidu API key and API credits.
- Keys stay separately in the local helper. Vidu validation only queries credits; Decart validation only requests a short-lived token. Neither starts generation. A valid zero-balance Vidu key can be saved.
- Vidu supports the existing silent centered camera, first-frame 10/20-second timer, fullscreen mirror, local replay, pause/stop/close and MP4/WebM download. The extension gets scoped RTC credentials, never permanent keys or upstream control secrets.
- Explicit hangup, client heartbeat expiry, first-frame and total time limits, cancellation and late-response cleanup. No automatic paid retries or cross-provider fallback. Changing provider/region stops the current trial.
- Updated English/Chinese setup, account/key instructions, privacy information and agent installation guide.

**Vidu is experimental: real paid generation, output quality, cold-start latency and upstream billing termination have not been verified with a funded account.** Verification covered 52 local automated tests, type checking, real AliRTC SDK loading/custom-track support under Chrome MV3, and simulated Vidu/Decart browser sessions with 10-second MP4 / 20-second WebM, fullscreen and camera cleanup. No paid generation was used.

The 10/20-second timer starts at the first decoded frame; generation during the wait may also be billed. Local protections cannot guarantee instant remote billing termination during a helper crash or network outage. Check provider usage records and API-credit eligibility; Vidu website bonuses may not cover API usage.

### Install or upgrade

| Computer | Download |
| --- | --- |
| Intel Mac / x86_64 | `bling-tryon-macOS-X64.tar.gz` |
| Apple Silicon / arm64 | `bling-tryon-macOS-ARM64.tar.gz` |
| Windows x64 | `bling-tryon-Windows-X64.tar.gz` |
| Linux x64 | `bling-tryon-Linux-X64.tar.gz` |

Both Mac packages require macOS 13.5 or newer. Verify the full archive with `SHA256SUMS.txt`. Quit the old helper, extract the complete package to a stable folder and run its launcher. Keep the helper terminal open. In `chrome://extensions`, reload or load the new `chrome-tryon` folder and refresh shopping pages. **Upgrade both helper and extension**: an old running helper may hide the provider selection. Existing keys remain in the user's configuration directory; never copy or publish `user.env` / `vidu.env`.

Preview release: real camera/site compatibility on Intel Mac, Windows and Linux still needs device testing. No signed/notarized installer or Chrome Web Store distribution.

## 简体中文

### v1.3.0 新增

- 在默认 Decart 之外增加 **Vidu S2-Editing（实验性）**，本地助手可选中国站/全球站，使用用户自己的对应地区 API Key 和 API 积分。
- 两家密钥分别保存在本机。Vidu 验证仅查额度，有效零余额 Key 也能保存；Decart 验证只申请短期令牌，均不开始生成。
- Vidu 沿用无声中心裁剪、首帧后 10/20 秒计时、浮窗放大和本地回放、暂停/停止/关闭、MP4/WebM 下载。插件只拿临时 RTC 凭证，不接收永久 Key 或上游控制密钥。
- 主动挂断、客户端失联心跳保护、首帧/总时限、取消后延迟响应清理；不自动重试或换用另一家付费平台。切换平台/地区会停止当前试穿。
- 更新中英文设置、注册/密钥说明、隐私信息和智能体安装指南。

**Vidu 尚未用已充值账户验证真实生成、画质、冷启动延迟和上游停止计费表现。** 已验证 52 项本地测试、类型检查、真实 AliRTC SDK 在 Chrome MV3 下加载/接收裁剪轨道，以及 Vidu/Decart 模拟会话中的 10 秒 MP4 / 20 秒 WebM、全屏、回放下载和相机清理。验证未运行付费生成。

10/20 秒从首帧开始计时，不代表账单时长；等待期间生成也可能收费。助手崩溃或断网时，本地保护无法保证上游瞬时停止计费，请核对用量记录。Vidu 网页赠额不一定适用于 API。

### 安装与升级

提供 Apple Silicon Mac、Intel Mac、Windows x64、Linux x64 完整包与 SHA256SUMS.txt，两种 Mac 包均要求 macOS 13.5 或以上。校验后，退出旧助手，完整解压并启动新版；Chrome 在 `chrome://extensions` 重载或加载新版 `chrome-tryon`，并刷新购物页。**助手和插件需一起升级**；旧助手仍在运行时可能看不到平台选择。原密钥保留在用户配置目录，不要复制或上传 `user.env` / `vidu.env`。

仍为预览版，Intel Mac、Windows/Linux 的真实相机和购物网站效果需对应设备测试；暂无系统签名/公证安装器或 Chrome 应用商店发布。
