#!/bin/bash
# Publish @hoverlover/clawdbot-supermemory to npm
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BUMP_TYPE="${1:-patch}"

cd "$ROOT_DIR"

# Get current version
OLD_VERSION=$(bun -e "console.log(require('./package.json').version)")

# Bump version
npm version "$BUMP_TYPE" --no-git-tag-version
NEW_VERSION=$(bun -e "console.log(require('./package.json').version)")

echo "Bumping $OLD_VERSION → $NEW_VERSION"

# Commit and tag
git add package.json
git commit -m "v$NEW_VERSION"
git tag "v$NEW_VERSION"
git push origin main
git push origin "v$NEW_VERSION"

# Publish to npm
echo ""
echo "Publishing to npm..."
bun publish --access public

echo ""
echo "Published @hoverlover/clawdbot-supermemory v$NEW_VERSION"
