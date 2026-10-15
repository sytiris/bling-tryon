# Bling Try-On: local-agent installation guide

For requests to download, install, start or use this project, read README.md first and follow the steps below. Authorized local installation and read-only preparation may proceed. The human handles account registration, verification codes, terms, payments, key entry and browser permission decisions. Chinese user documentation: README.zh-CN.md.

## 1. Select and verify the package

- Official repository: https://github.com/sytiris/bling-tryon . Download the latest Release's full package and SHA256SUMS.txt, verify SHA-256, then extract to the workspace or a stable user-selected directory.
- Match OS/architecture: macOS/ARM64, Windows/X64 or Linux/X64. If unavailable, explain and build from source on the target machine with Node 24.14.1 or a later 24.x. Never run a mismatched Node binary.
- Reuse an already extracted full package. Do not download just chrome-tryon: it requires the helper. From source, run npm ci and npm run build:release in examples/ecommerce. Building needs no API key.
- Do not change system security policy or bypass OS blocks or Chrome permission prompts automatically.

## 2. Start and open registration/setup

- Run start-macos.command, start-windows.cmd or start-linux.sh. Chinese macOS/Windows launcher names are also retained. Keep the helper running; reuse existing services/configuration without deleting or overwriting user settings.
- Normal desktop launch opens http://127.0.0.1:3000/setup and, when unconfigured, https://platform.decart.ai/api-keys . If a headless terminal does not open them, use an available local browser tool. Otherwise provide clickable URLs.
- Let the human sign up/log in to Decart, check trial credits and create an API key. The official FAQ currently states new accounts get free credits; the console determines amounts, expiry and eligibility. Do not promise a fixed amount or top up for them.
- The human pastes the key directly into local setup and clicks Verify & save. Do not ask for or read keys, put them in chat/tool arguments/commands/frontend/logs/screenshots/version control, or read existing user.env or .env files to fill the field for the user.
- Read only GET http://127.0.0.1:3000/api/health to check configured status. Wait for the human to enter the key. Do not start a try-on to check balance.
- UI follows browser language, with Chinese/English switch buttons. Do not change OS language. Configuration paths remain stable regardless of UI language.

## 3. Install Chrome extension and hand over

- Provide the absolute path of the extracted chrome-tryon folder, open chrome://extensions, and guide the human through Developer mode and Load unpacked.
- Guide them to an HTTPS shopping page, click the extension icon, hover and select clothing. The human grants camera access and actively clicks 10 sec or 20 sec.
- Provide the local setup URL, extension path and launcher. A successful health/configuration check does not verify real try-on quality.
- Do not auto-enable the camera, start generation or retry paid sessions. Permanent keys stay in the local helper; the extension uses short-lived client tokens only.
