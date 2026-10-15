**English** | [简体中文](README.zh-CN.md)

# Bling Try-On · 试衣镜bling

Live virtual try-on on shopping websites with your own Decart API key. Preview release: tested locally on macOS Apple Silicon. Windows/X64 and Linux/X64 packages are built automatically; real camera/site compatibility still needs testing on those devices.

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

Create a key on [API Keys](https://platform.decart.ai/api-keys), then paste it into your local helper's password field. Do not send keys to chat or an agent. Replace or delete a local key in setup; local deletion does not revoke the key at Decart.

A local agent can follow the package's AGENTS.md to download, start and open pages. You handle registration, terms, payments, key entry and browser permissions. Configured users are not sent back to Decart on every launch; refreshing setup does not open an external page.

## Keys and charges

Usage is billed to your own Decart account. The permanent key is saved in your local configuration directory as `user.env` and passed to the local service at runtime. The extension uses temporary tokens; no permanent key is synced to your Chrome account or sent to the author. New Unix directories/files use permissions 700/600. This is not an encrypted vault; local programs with file access may read it.

- macOS: `~/Library/Application Support/试衣镜bling/user.env` (unchanged across UI languages).
- Windows: `%LOCALAPPDATA%/BlingTryOn/user.env`.
- Linux: `~/.config/bling-tryon/user.env` (honors `XDG_CONFIG_HOME`).

Verification failure preserves your existing key. Local deletion prevents a previous environment key from being restored at restart. Revoke a compromised key in the Decart console.

10/20 seconds means **viewing time after the first frame**, not total billed time. Generation before the first frame may be billed. Both options use `lucy-vton-latest` standard mode; fast mode is disabled. Square cropping changes framing, not the per-second price. See [Decart pricing](https://docs.platform.decart.ai/getting-started/pricing).

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

See [PRIVACY.md](PRIVACY.md) / [中文隐私说明](PRIVACY.zh-CN.md). Based on DecartAI/tryon-examples and the Decart JavaScript SDK; MIT and third-party notices are preserved. Not affiliated with Decart. Report reproduction steps, OS/Chrome versions and redacted errors, without keys, tokens or camera footage.
