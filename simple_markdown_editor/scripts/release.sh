#!/bin/bash
set -e

# ── Verify Environment ──

if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
  echo "Error: Missing signing environment variables."
  echo "Required: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID"
  exit 1
fi

if ! command -v gh &> /dev/null; then
  echo "Error: gh CLI is required. Install with: brew install gh"
  exit 1
fi

# ── Get Version ──

VERSION=$(node -p "require('./package.json').version")
echo "Releasing v${VERSION}..."

# ── Build ──

echo "Building renderer..."
npm run build:renderer

echo "Building Electron app (signing + notarization)..."
npx electron-builder --config electron-builder.config.js --publish never

# ── Git Tag ──

echo "Creating git tag..."
git add -A
git commit -m "chore: release v${VERSION}" || true
git tag "v${VERSION}"
git push origin main --tags

# ── GitHub Release ──

echo "Creating GitHub release..."

# Extract changelog for this version
CHANGELOG_NOTES=$(sed -n "/^## \[${VERSION}\]/,/^## \[/p" ../CHANGELOG.md | head -n -1 | tail -n +2)

if [ -z "$CHANGELOG_NOTES" ]; then
  CHANGELOG_NOTES="Release v${VERSION}"
fi

# Find the built artifacts (DMG for download, ZIP + YML for auto-update)
DMG_FILE=$(ls dist/*.dmg 2>/dev/null | head -1)
ZIP_FILE=$(ls dist/*.zip 2>/dev/null | head -1)
YML_FILE=$(ls dist/latest-mac.yml 2>/dev/null | head -1)

RELEASE_FILES=""
[ -n "$DMG_FILE" ] && RELEASE_FILES="$RELEASE_FILES $DMG_FILE"
[ -n "$ZIP_FILE" ] && RELEASE_FILES="$RELEASE_FILES $ZIP_FILE"
[ -n "$YML_FILE" ] && RELEASE_FILES="$RELEASE_FILES $YML_FILE"

gh release create "v${VERSION}" \
  --title "v${VERSION}" \
  --notes "$CHANGELOG_NOTES" \
  $RELEASE_FILES

echo "Release v${VERSION} complete!"
