## English

### New in v1.2.0

- Enlarge the fitting mirror to fullscreen, then restore its size and position or press Escape. If fullscreen is unavailable, the mirror enlarges within the page. Resizing preserves the current camera and try-on session.
- On normal 10/20-second completion, disconnect AI first and automatically play the locally recorded result once. Replay does not start another AI session.
- Hover or focus the video for a progress bar and translucent play/pause, stop, download and close controls. Hover over an icon for its text label. Stop pauses and rewinds; close discards the replay. Downloads use MP4 when supported, otherwise WebM.
- A dashed head-and-shoulders guide, positioning tips and elapsed wait time appear while connecting, then disappear when the first frame arrives or the session stops. New controls and tips support English and Chinese.
- Recordings contain only the center-square AI output, without audio, and remain in browser memory until cleared or explicitly downloaded. New trials, camera off, minimizing/closing and hiding/refreshing the page clear the recording. Errors discard incomplete recordings. Encoder failures do not block AI disconnection.

Your own Decart key remains in the local helper; the extension uses short-lived client tokens. The 10/20-second viewing timer starts at the first decoded frame; generation before it may also be billed. No automatic paid retries. Existing first-frame timeouts and maximum session durations remain in place.

### Installation and upgrade

| Computer | Download |
| --- | --- |
| Intel Mac / x86_64 | `bling-tryon-macOS-X64.tar.gz` |
| Apple Silicon / arm64 | `bling-tryon-macOS-ARM64.tar.gz` |
| Windows x64 | `bling-tryon-Windows-X64.tar.gz` |
| Linux x64 | `bling-tryon-Linux-X64.tar.gz` |

Both Mac packages require macOS 13.5 or newer. All four native builds/tests and runtime architecture checks must pass before publication; `SHA256SUMS.txt` covers the archives. Extract the complete package and run `start-macos.command`, `start-windows.cmd` or `start-linux.sh`. Keep the helper open and load `chrome-tryon` through Chrome Developer mode → Load unpacked.

For upgrades, quit the old helper, replace the package in its stable installation folder, launch the new helper, reload the extension in `chrome://extensions`, and refresh shopping pages. Existing keys remain in the user's configuration directory; do not copy or publish `user.env`.

Local browser checks used synthetic media and a simulated AI connection, including 10-second MP4 / 20-second WebM recording, replay, downloads, fullscreen, hover labels and waiting-guide cleanup. No paid generation was run for automated validation. Real camera/site behavior on Intel Mac, Windows and Linux still needs device testing. This is a preview release without signed/notarized installers or Chrome Web Store publication.

## 简体中文

### v1.2.0 新功能

- 试衣镜支持全屏放大、还原和 Esc 退出；不支持全屏时在网页内放大。调整尺寸保留相机和当前试穿连接。
- 正常 10/20 秒结束后先断开 AI，再自动回放本次录制的视频一次；回放不会重新启动 AI。
- 鼠标移入或键盘聚焦时显示进度条和半透明播放/暂停、停止、下载、关闭按钮，悬停图标可查看文字说明。停止会暂停并回到开头；关闭会丢弃回放。支持时下载 MP4，否则 WebM。
- 等待出画时显示头肩虚线轮廓、站位提示和等待秒数，收到首帧或停止后自动隐藏。新增功能均支持中英文。
- 视频只录制中心正方形 AI 输出，不含音频，保存在浏览器内存。主动下载才保存文件；开始新试穿、关闭相机、收起/关闭或隐藏/刷新页面会清除。异常断连丢弃未完成录制，录制失败也不会阻碍 AI 断连。

继续采用用户自备 Decart Key 的本地助手模式，插件只拿短期令牌。10/20 秒从首帧出现后开始计算，出画前生成时间也可能计费；不自动重试付费连接，保留首帧超时和总时长保护。

### 安装与升级

保留 Apple Silicon Mac、Intel Mac、Windows x64、Linux x64 四种原生安装包和 SHA256SUMS.txt。两种 Mac 包要求 macOS 13.5 或以上。完整解压后运行对应启动器，保持助手开启；Chrome 开发者模式加载包内 `chrome-tryon`。

升级时退出旧助手，将新版完整文件替换到固定安装目录，启动新版助手，在 `chrome://extensions` 重新加载扩展并刷新购物页。原有密钥留在用户配置目录，不要复制或上传 `user.env`。

本机以合成视频和模拟 AI 验证了 10 秒 MP4 / 20 秒 WebM、回放下载、全屏、悬停提示及等待轮廓清理，自动验证未运行付费生成。Intel Mac、Windows 和 Linux 的真实相机及购物网站效果仍需对应设备测试。本次发布到 GitHub，仍为预览版，暂无签名/公证安装器或 Chrome 应用商店发布。
