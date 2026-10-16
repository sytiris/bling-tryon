# Third-Party Notices

The code in this repository is licensed under the MIT License (see [LICENSE](LICENSE)).

The example apps depend on third-party packages that are installed from npm at build time. Most of them are under permissive licenses (MIT, Apache-2.0, ISC, BSD). The packages below are distributed under weak-copyleft licenses and are listed here for attribution. They are used unmodified, exactly as published on npm, and are not part of this repository's source code.

## lightningcss (MPL-2.0)

- Used by Tailwind CSS v4 (`@tailwindcss/postcss`) as a build-time CSS transformer. Includes the `lightningcss-*` platform binaries.
- Source: https://github.com/parcel-bundler/lightningcss
- License: https://github.com/parcel-bundler/lightningcss/blob/master/LICENSE

## libvips, via `@img/sharp-libvips-*` and `@img/sharp-*` (LGPL-3.0-or-later)

- Prebuilt libvips binaries pulled in by `sharp`, an optional dependency of Next.js used for server-side image optimization. These binaries are never shipped to the browser. The examples set `images.unoptimized: true`, so sharp is not invoked at runtime.
- Source: https://github.com/libvips/libvips and https://github.com/lovell/sharp-libvips
- License: https://github.com/libvips/libvips/blob/master/LICENSE

## Vidu S API integration examples (MIT)

The optional Vidu S2-Editing HTTP/control and RTC integration follows the official example at https://github.com/shengshu-ai/vidu-s-api . The integration is adapted for local BYOK storage, silent cropped video and bounded sessions.

Copyright (c) 2026 ShengShu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Aliyun RTC SDK 7.1.9

The optional Vidu browser path bundles `aliyun-rtc-sdk` 7.1.9 from npm, as recommended by Vidu's official integration example. This vendor SDK is not relicensed under this repository's MIT license. Its npm package does not declare an SPDX license or include a separate license file; refer to the vendor's service/SDK terms and documentation: https://help.aliyun.com/zh/ims/developer-reference/quick-use . Its dependencies' available license notices are included in `chrome-tryon/THIRD_PARTY_NOTICES.txt`. The vendor SDK/service terms apply; this project does not claim a standalone MIT license for this vendor SDK.

## ws 8.18.3 (MIT)

The local Vidu helper bundles https://github.com/websockets/ws .

Copyright (c) 2011 Einar Otto Stangvik <einaros@gmail.com>
Copyright (c) 2013 Arnout Kazemier and contributors
Copyright (c) 2016 Luigi Pinca and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
