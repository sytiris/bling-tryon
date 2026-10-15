## English

Bling Try-On now supports **English and Chinese** throughout the distributed Chrome extension and local helper. The UI follows your browser language, with a saved manual switch. The README defaults to English and links to a Chinese edition; installation, Decart sign-up/credits/API-key instructions and privacy documentation are included in both languages.

- Language switching updates text without restarting the camera or a live try-on.
- The hover picker, floating mirror, minimized tab, status/error messages and settings are translated.
- ASCII launchers: `start-macos.command`, `start-windows.cmd`, `start-linux.sh`. Original Chinese launcher names remain available.
- Your own Decart key stays in the local helper; the extension uses temporary tokens. The fixed extension ID and existing local key location are unchanged.
- Both 10/20-second choices remain standard mode. The timer starts at the first frame; billable generation may last longer. Cropping does not lower the per-second rate. There are no automatic paid retries.

Download the matching `bling-tryon-*.tar.gz` full package and verify `SHA256SUMS.txt`. Extract everything, run its launcher and keep the terminal open. First use opens Decart API Keys and `http://127.0.0.1:3000/setup`; register/log in and enter your key yourself. Load `chrome-tryon` via `chrome://extensions` → Developer mode → Load unpacked. On an HTTPS shopping page, click the extension icon, hover an image → Try this, allow the camera, then click 10 sec / 20 sec.

For upgrades, stop the old helper, run the new launcher, load the new `chrome-tryon` directory (or update your existing unpacked directory), then refresh the shopping page. Do not copy your key into the extension. Chrome's extension-list name follows Chrome's language; the in-tool switch changes the tool UI.

macOS Apple Silicon has been tested locally. Windows/X64 and Linux/X64 pass automated build/tests; real camera and site compatibility on those devices still needs testing. No signed/notarized installer or Web Store listing yet. The original Next.js/upstream reference demos retain their existing languages.

## 简体中文

本版本为插件和本地助手增加**中英文双语**，默认跟随浏览器，支持手动切换并记住选择。GitHub 首页默认英文，链接到中文 README；安装、Decart 注册/积分/API Key 与隐私说明都提供两种语言。

- 悬浮选衣、浮窗、小标签、设置、连接状态和错误提示均支持双语；切换文字不会重开相机或实时会话。
- 新增英文文件名启动器，保留中文名称启动器。扩展 ID 和本机密钥路径保持不变。
- 仍使用用户自己的 Decart Key，本地助手保管永久密钥，插件仅拿短期令牌。
- 10/20 秒仍均为标准模式，出画后开始计时，到点断开 AI，保留本地相机。出画前生成可能计费，裁剪不降低每秒费用，无自动付费重试。

下载匹配系统/芯片的完整包并核对 SHA256SUMS.txt，完整解压后运行启动器，保持终端开启。首次启动打开 Decart API Keys 和本机设置页，由用户自行注册、查看额度并填写密钥；随后到 chrome://extensions 开启开发者模式，加载 chrome-tryon。

升级时先退出旧助手，运行新启动器，加载新版 chrome-tryon 目录（或更新原加载目录）并刷新购物页。不要将密钥复制进扩展。Chrome 扩展列表名称跟随 Chrome 本身语言，工具内按钮控制界面语言。

本机验证平台为 macOS Apple Silicon。Windows/Linux 提供自动构建包，真实摄像头和购物站兼容性仍需对应设备验证。尚未提供系统签名/公证安装器或商店安装；上游参考示例保留原有语言。
