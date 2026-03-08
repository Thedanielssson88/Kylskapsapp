#!/bin/bash

# Script för att pusha Kylskåpsapp till GitHub
# Kör från din dator där du har GitHub-autentisering

cd "$(dirname "$0")"

echo "📦 Pushing Kylskåpsapp to GitHub..."

# Lägg till remote om den inte finns
git remote get-url origin 2>/dev/null || git remote add origin https://github.com/Thedanielssson88/kylskapsapp.git

# Byt till main branch
git branch -M main

# Pusha till GitHub
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo "🔗 Repository: https://github.com/Thedanielssson88/kylskapsapp"
else
    echo "❌ Push failed. You may need to authenticate."
    echo "💡 Try: git push https://YOUR_GITHUB_TOKEN@github.com/Thedanielssson88/kylskapsapp.git main"
fi
