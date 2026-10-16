**English** | [简体中文](README.zh-CN.md)

# Bling Try-On · 试衣镜bling

Live virtual try-on on shopping websites with your own Decart or optional Vidu API key. Preview release: tested locally on macOS Apple Silicon. Intel Mac/X64, Windows/X64 and Linux/X64 packages are built automatically; real camera/site compatibility still needs testing on those devices.

Mac packages require macOS 13.5 or newer. Intel / `x86_64`: download `bling-tryon-macOS-X64.tar.gz`. Apple Silicon / `arm64`: use `bling-tryon-macOS-ARM64.tar.gz`. Check the actual latest Release; do not use an ARM64 runtime on Intel.

## First use

1. Extract the **entire package** to a permanent folder matching your OS and architecture. The Node runtime is included.
2. Run `start-macos.command`, `start-windows.cmd` or `start-linux.sh`. Chinese launcher names are also available for macOS and Windows.
3. Open `http://127.0.0.1:3000/setup` if it does not open automatically. With no saved key, the launcher also opens [Decart API Keys](https://platform.decart.ai/api-keys). Sign up/log in, check credits and create a key, then enter it on your **local** page and click **Verify & save**. Verification requests a temporary token only, without video generation. It does not guarantee sufficient generation balance.
4. Open `chrome://extensions` in Chrome. Enable **Developer mode**, click **Load unpacked** and select the package's **chrome-tryon** folder. The helper can copy its path.
5. On an HTTPS shopping page, click the extension icon. Hover over a clothing image and click **Try this**. Allow the camera yourself, then click **10 sec / 20 sec**.

The UI follows your browser language (Chinese or English). The title-bar/settings/helper language buttons let you switch and remember your choice. The extension and helper store language preferences separately. Chrome's extension-list name follows Chrome's language.

Keep the helper terminal open; Ctrl+C stops it. Closing the setup webpage does not stop the service. Relaunching reuses a running helper. Stop an older Next.js development server if it occupies port 3000.

Verify the download source and checksum if your OS blocks it, then follow the OS's trusted-file opening process. Signed/notarized installers and Chrome Web Store installation are not available yet.

## Decart sign-up and credits

Register/log in yourself at the [Decart console](https://platform.decart.ai/) and complete required verification. The [official FAQ](https://docs.platform.decart.ai/getting-started/pricing#faq) currently states that new accounts receive free trial credits. The console determines amounts, expiry and conditions. This project does not provide credits or top up automatically. The API is pay-as-you-go; subscription membership is not required.

## Optional Vidu S2-Editing (experimental)

**v1.3.0 adds Vidu S2-Editing** using your own API account. Decart remains the default. Download the full v1.3.0-or-later package and upgrade both the helper and extension; older packages do not have the Vidu option. This integration has passed mocked HTTP/WebSocket and browser lifecycle tests, but **real paid Vidu generation has not been verified** because no funded test account is available.

1. Open local setup at `http://127.0.0.1:3000/setup`, select **Vidu S2-Editing (experimental)**, then choose **China** (`api.vidu.cn`) or **Global** (`api.vidu.com`) to match the account that issued your key.
2. Create an API key in the corresponding [China console](https://platform.vidu.cn/) or [Global console](https://platform.vidu.com/). Paste it into the local helper's password field and click **Verify & save**. Do not paste a Vidu key into Decart mode.
3. Verification queries [`GET /ent/v2/credits`](https://platform.vidu.cn/docs/api-reference/task-management/account-balance) only. A valid zero-balance account can be configured; verification does not create a live session or prove there are enough credits to generate video.
4. Return to the mirror, choose clothing and actively click **10 sec / 20 sec**. The app uses Vidu's `virtual_tryon` editing mode, with the existing centered camera, fullscreen and local replay/download controls. Switching provider/region stops the current trial; errors never automatically retry or fall back to another paid provider.

Decart remains the recommendation for an initial trial because its official FAQ offers new-account credits. As of 2026-10-16, a default sign-up grant usable with the S2-Editing API has not been confirmed in Vidu's public documentation. Check your regional console's balance, [API pricing](https://platform.vidu.cn/docs/overview/pricing), promotions and purchase options yourself. Website bonus credits do not necessarily apply to API usage.

Vidu's permanent key stays in a separate local `vidu.env`; provider/region preferences are in `providers.json`. The extension receives short-lived RTC credentials and an opaque local control capability. The helper keeps the permanent key and upstream control secret, and sends an explicit hangup when stopping. It enforces a 5-second client heartbeat lease, a 30-second first-frame limit and a 45/55-second absolute cap. The visible timer starts at the first decoded frame; Vidu may bill generation during the wait. Slow cold starts may hit the protective timeout. These are local safeguards, not a guarantee of immediate remote billing termination during a helper crash or network outage; check your provider's usage records. Vidu transports video through Aliyun RTC, whose terms and necessary service diagnostics also apply.

Create a key on [API Keys](https://platform.decart.ai/api-keys), then paste it into your local helper's password field. Do not send keys to chat or an agent. Replace or delete a local key in setup; local deletion does not revoke the key at Decart.

A local agent can follow the package's AGENTS.md to download, start and open pages. You handle registration, terms, payments, key entry and browser permissions. Configured users are not sent back to Decart on every launch; refreshing setup does not open an external page.

## Keys and charges

Usage is billed to your own selected provider account. The permanent key is saved in your local configuration directory as `user.env` (Decart) or `vidu.env` (Vidu) and passed to the local service at runtime. The extension uses temporary tokens/RTC credentials; no permanent key is synced to your Chrome account or sent to the author. New Unix directories/files use permissions 700/600. This is not an encrypted vault; local programs with file access may read it.

- macOS: `~/Library/Application Support/试衣镜bling/user.env` (unchanged across UI languages).
- Windows: `%LOCALAPPDATA%/BlingTryOn/user.env`.
- Linux: `~/.config/bling-tryon/user.env` (honors `XDG_CONFIG_HOME`).

Verification failure preserves your existing key. Local deletion prevents a previous environment key from being restored at restart. Revoke a compromised key in the corresponding provider console.

10/20 seconds means **viewing time after the first frame**, not total billed time. Generation before the first frame may be billed. With Decart, both options use `lucy-vton-latest` standard mode; fast mode is disabled. Square cropping changes framing, not the per-second price. See [Decart pricing](https://docs.platform.decart.ai/getting-started/pricing).

## Fullscreen and replay

Use the enlarge button in the title bar or video to view the mirror fullscreen; restore or Escape returns to its previous size. Resizing preserves the active stream. After a normal 10/20-second deadline, AI disconnects first, then the locally recorded AI video plays once. Hover or focus the video to reveal the progress bar and pause/play, stop (pause and rewind), close (discard replay) and download controls. Downloads use MP4 when supported, otherwise WebM. Replay/seek/download never starts generation. Hover over a control to see its text label; labels follow the selected language. While connecting, a dashed head-and-shoulders outline and positioning tips help you center your head and upper body. The guide disappears when the first frame arrives or the session stops.

Recordings have no audio and are kept only in memory. Starting a new try-on, closing replay, camera off, minimizing/closing, or hiding/refreshing the page clears them. Errors discard incomplete recordings. Save a wanted clip with Download before leaving. If recording is unsupported or fails, the last frame remains available and billing stop rules still apply.

## Stop rules

- Selecting clothing, local camera preview and opening setup do not start generation.
- After 10/20 seconds, AI disconnects, keeping the last frame and local camera. Another try-on needs a click.
- Camera off, minimizing/closing the mirror, hiding or refreshing the shopping page stop AI and close the camera.
- API errors, offline events and interrupted camera/remote tracks stop the session without automatic retry.
- During a try-on, helper loss or key changes stop generation as soon as detected.
- Connection/first-frame timeout: 30 seconds. Absolute client and Decart server caps: 45/55 seconds. Crashes, sleep or severe network failure can prevent an instant disconnect; server caps provide a fallback.

## Known limits and support

CSS backgrounds, cross-origin frames, closed components and protected images may not work. Some sites block embedded camera access. Chrome internal pages and the Web Store do not support injection. Results depend on positioning, lighting, reference images and the model; keep the relevant body area in the center square.

If needed, set your own `TRYON_PROXY_URL` or inherit `HTTP_PROXY`/`HTTPS_PROXY`. The helper does not change your system proxy. Do not use an untrusted proxy for keys or camera requests.

See [PRIVACY.md](PRIVACY.md) / [中文隐私说明](PRIVACY.zh-CN.md). Based on DecartAI/tryon-examples and the Decart JavaScript SDK; MIT and third-party notices are preserved. Not affiliated with Decart or Vidu. Report reproduction steps, OS/Chrome versions and redacted errors, without keys, tokens or camera footage.
