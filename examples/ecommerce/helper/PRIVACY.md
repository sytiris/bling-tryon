**English** | [简体中文](PRIVACY.zh-CN.md)

# Data and privacy

- **Permanent API key:** entered on your local setup page and persisted only in your local configuration directory. Sent to `https://api.decart.ai` to verify/request tokens, never to the author. The extension does not store it.
- **Temporary tokens:** obtained when needed, restricted by model, expiry and session duration. Not persisted across sessions.
- **Camera:** enabled with your permission, for local preview first. After you click 10/20 sec, a center-square video feed is sent to Decart over WebRTC. Audio is always off.
- **Clothing:** the selected image URL is held temporarily. Starting a try-on downloads, compresses and sends the image to Decart. The image host can observe the download request.
- **Replay video:** a silent center-square recording of the AI output is held in browser memory for the current trial. It is not sent back to Decart or the author. Normal completion plays it once. Closing replay, a new trial, camera off, minimizing/closing, hiding or refreshing clears it. Files are saved only when you explicitly click Download; downloaded files remain on your computer until you delete them.
- **Last frame:** kept only in the current mirror's local canvas; not automatically saved to disk or sent to the author.
- **Local helper:** listens on 127.0.0.1. Management endpoints check local Origin and a per-process random CSRF token. No author account service, ads, analytics or telemetry; SDK telemetry is disabled.
- **Language:** the extension stores only a language preference in Chrome local storage, and the helper in browser localStorage. Keys are never stored there. Neither preference is synced to the author's service.
- **Third parties:** Decart's privacy policy, processing terms and account settings apply. This project does not promise zero retention by Decart.
- **Deletion:** delete the locally saved key from setup. Any separate development `.env.local` backups or system environment values must be removed yourself. Revoke the platform key in Decart's console.
