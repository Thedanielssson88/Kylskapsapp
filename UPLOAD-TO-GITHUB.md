# Ladda upp Kylskåpsapp till GitHub

## Steg 1: Skapa nytt GitHub-repo

1. Gå till https://github.com/new
2. Repository name: `kylskapsapp`
3. Description: `Smart Skafferi - AI-driven kylskåps- och recepthantering`
4. Välj **Public** eller **Private**
5. **VIKTIGT:** Kryssa INTE i "Add a README file" (vi har redan en)
6. Kryssa INTE i .gitignore eller license (redan finns)
7. Klicka "Create repository"

## Steg 2: Pusha koden

GitHub visar instruktioner - använd dessa kommandon i Kylskåpsapp-mappen:

```bash
cd /workspace/group/Kylskåpsapp

# Lägg till remote (använd DIN GitHub-URL från GitHub)
git remote add origin https://github.com/Thedanielssson88/kylskapsapp.git

# Byt till main branch
git branch -M main

# Pusha
git push -u origin main
```

Om git push kräver autentisering, använd:
```bash
git push https://DIN_GITHUB_TOKEN@github.com/Thedanielssson88/kylskapsapp.git main
```

## Steg 3: Koppla till Vercel (valfritt)

Om du vill att Vercel automatiskt deployar från GitHub:

1. Gå till https://vercel.com/dashboard
2. Klicka "Add New..." → "Project"
3. Välj GitHub och koppla repot `kylskapsapp`
4. Vercel kommer automatiskt deploya vid varje push!

---

**Nuvarande status:**
- ✅ Lokal git-repo skapad
- ✅ Initial commit gjord (58 filer)
- ⏳ Väntar på GitHub-repo att skapas
- ⏳ Väntar på push till GitHub

**Commit message:**
```
Initial commit: Smart Skafferi - Kylskåpsapp

- React + Vite PWA
- IndexedDB för lokal lagring
- AI-integration (Claude API, Gemini, OpenRouter)
- Receptgenerering och bildanalys
- Veckoplanering och inköpslistor
- Inventering med swipe-interface

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```
