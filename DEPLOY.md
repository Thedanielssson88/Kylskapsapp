# Deploy till Vercel

## Steg-för-steg:

### 1. Installera Vercel CLI
```bash
npm install -g vercel
```

### 2. Logga in på Vercel
```bash
vercel login
```

### 3. Deploya projektet
```bash
cd /workspace/group/Kylskåpsapp
vercel
```

### 4. Följ prompterna:
- Set up and deploy? → Yes
- Which scope? → Välj ditt konto
- Link to existing project? → No
- What's your project's name? → kylskapsapp (eller eget namn)
- In which directory is your code located? → ./
- Want to override settings? → No

### 5. Produktionsdeploy
```bash
vercel --prod
```

## Miljövariabler (om du har några)

Om du har API-nycklar, lägg till dem i Vercel Dashboard:
1. Gå till ditt projekt på vercel.com
2. Klicka på "Settings" → "Environment Variables"
3. Lägg till:
   - `VITE_API_KEY` = din-api-nyckel
   - `VITE_BACKEND_URL` = din-backend-url

## Automatisk deploy vid git push

Vercel kopplar automatiskt till ditt Git-repo och deployer vid varje push till main/master.

## URL

Din app kommer att vara live på:
- `https://kylskapsapp.vercel.app` (eller liknande)
- Du kan lägga till egen domän i Vercel Dashboard → Settings → Domains
