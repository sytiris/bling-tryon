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
