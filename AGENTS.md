# NexMess Workspace Rules

## Mandatory Release & GitHub Push Workflow

Whenever you make any change in this repository (features, UI updates, bug fixes, refactors, configuration, or documentation):

1. **Bump the App Version**:
   - Always increment `"version"` in both `package.json` and `package-lock.json` (for example via `npm version patch --no-git-tag-version` or `npm version minor --no-git-tag-version`).
   - Follow the repository's SemVer convention:
     - **Minor (`x.Y.0`)**: New features, UI/page redesigns, or notable functional enhancements.
     - **Patch (`x.y.Z`)**: Bug fixes, copy/i18n tweaks, styling adjustments, or maintenance updates.
     - **Major (`X.0.0`)**: Breaking architectural changes or explicitly planned major releases only.
   - `APP_VERSION` in `src/lib/version.ts` dynamically reads `package.json` at build/test time and propagates the version across the UI, metadata, and telemetry.

2. **Verify Before Pushing**:
   - After your final edit (including the version bump), run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build` and confirm all checks pass.

3. **Commit and Push to GitHub**:
   - Unless the user explicitly instructs you not to commit/push (or a verification check fails), stage the relevant changes (never staging `.env` or secret files), create a concise conventional commit message referencing the bumped version/change, and push to `origin` on the active branch (`main`).
