#!/usr/bin/env bash
# Commit everything and push. Usage: ./push.sh "your message"
# If the repo is linked to Vercel, the push auto-triggers a production deploy.
set -e
msg="${1:-update}"
git add -A
git commit -m "$msg" || echo "(nothing to commit)"
git push
echo ""
echo "✓ Pushed to GitHub. If the repo is linked to Vercel, your deploy is updating now."
