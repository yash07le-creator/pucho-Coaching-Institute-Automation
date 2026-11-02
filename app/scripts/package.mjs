#!/usr/bin/env node
// scripts/package.mjs — NOT a deploy route (pucho-os v5.1.1, rule 13). The old no-Docker bundle it used to make
// (server.js + .next + node_modules, no Dockerfile) was uploaded to CP Portal twice on 31 Oct 2026: once it carried Windows-only
// native binaries, once the portal's Docker build stopped at `open Dockerfile: no such file or directory`. It is removed, with no
// override. The only App Zip File is deploy/deploy-ready.zip from the kit's build_deploy.py (source + Dockerfile; the portal runs
// `npm ci` inside Linux), checked with `build_deploy.py --check-zip` before it is uploaded.
console.error([
  'npm run package is not a deploy route (pucho-os v5.1.1, rule 13) — nothing was built.',
  '  Build the deploy folder with the kit (the exact command is in this repository\'s README.md):',
  '      py <pucho-os>/scripts/build_deploy.py <os folder>        (Windows; python3 on macOS / Linux)',
  '  Then check the zip and upload only deploy/deploy-ready.zip as the App Zip File (Build Type: Dockerfile):',
  '      py <pucho-os>/scripts/build_deploy.py --check-zip <os folder>/deploy/deploy-ready.zip',
  '  deploy/UPLOAD.md lists every portal field.',
].join('\n'));
process.exit(2);
