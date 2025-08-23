# Slockly – Next.js 14 (App Router) + TypeScript

Générateur de playlists Spotify piloté par IA. UI sombre premium (néon / glassmorphism), micro‑animations, lecteur d'extraits audio avec fallback (Spotify → iTunes → Deezer).

## Stack

- Next.js 14 (App Router)
- TypeScript, Tailwind CSS, shadcn/ui (styles utilitaires inclus), Radix Slider
- Zustand (état client), Framer Motion (animations)
- API Routes sécurisées, tokens chiffrés en cookie httpOnly (AES‑GCM 256)
- Rate‑limit 10 req/min par IP
- Fallback IA multi‑fournisseurs (OpenAI → Gemini → OpenRouter → Ollama), sinon heuristique locale

## Installation (Windows)

```powershell
git clone <ce-repo> slockly
cd slockly
npm i
copy .env.example .env
# Éditez .env et remplissez vos clés
npm run dev   # http://127.0.0.1:8080
```

> IMPORTANT : Spotify **doit** utiliser `http://127.0.0.1:8080` comme Redirect URI (copiez ci‑dessous).

## Variables d'environnement (.env.example)

```
PORT=8080
NEXT_PUBLIC_FRONTEND_URL=http://127.0.0.1:5173
SERVER_URL=http://127.0.0.1:8080

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8080/api/auth/spotify/callback

OPENAI_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_BASE_URL=

TOKEN_ENCRYPTION_KEY=dev_dev_dev_dev_dev_dev_dev_dev_32
```

- `TOKEN_ENCRYPTION_KEY` = 32 caractères (production : générez une clé forte).
- `SPOTIFY_CLIENT_SECRET` est optionnelle si vous utilisez strictement PKCE.

## Configuration Spotify

1. Créez une app sur [dashboard.spotify.com](https://developer.spotify.com/dashboard).
2. Ajoutez les **Redirect URIs** :
   - `http://127.0.0.1:8080/api/auth/spotify/callback`
   - (en prod sur Vercel : `https://<votre-domaine>/api/auth/spotify/callback`)
3. Scopes : `playlist-modify-private playlist-modify-public user-read-email user-read-private`

## Démarrage

- `npm run dev` → serveur Next à `http://127.0.0.1:8080`
- `npm run build` → build
- `npm start` → production

## Parcours utilisateur

1. **/ :** Hero, bouton "Se connecter avec Spotify".
2. **/app :** après login (avatar + pseudo). À gauche : prompt + slider `N`. À droite : aperçu de la playlist.
3. **Générer la playlist** : appelle `/api/playlist/generate` → IA → seeds → Search/Recommendations → filtrage exclu/dé‑dup → preview URLs (fallback).
4. **Envoyer sur Spotify** : crée une playlist **privée** et ajoute les titres par batch (<=100). Toast + confetti.

## Accessibilité & UX

- Focus visibles, contrastes élevés, skeletons/micro‑animations, player flottant visible **uniquement** quand une lecture démarre.
- Boutons désactivés pendant les appels réseau.

## Déploiement Vercel (gratuit)

1. Poussez le repo sur GitHub, "Import Project" dans Vercel.
2. Ajoutez les variables d’environnement dans Vercel (y compris `SPOTIFY_REDIRECT_URI=https://<domaine>/api/auth/spotify/callback`).
3. Assurez‑vous que cette Redirect URI est **ajoutée telle quelle** dans le dashboard Spotify.
4. `next start` s’exécute sur le port Vercel (pas besoin de `-p 8080` en prod).

## Tests manuels (checklist d’acceptation)

- [ ] Login Spotify OK, avatar et pseudo affichés (`/api/auth/spotify/me`).
- [ ] Chat IA comprend la consigne, exclusions respectées (artistes/genres/titres), pas de doublons, `N` approx. respecté.
- [ ] Bouton **Générer** → liste pré‑vue OK, boutons désactivés pendant l'appel.
- [ ] Bouton **Envoyer sur Spotify** crée la playlist sur le compte.
- [ ] Player invisible tant que rien ne joue → apparaît à la lecture → volume réglable.
- [ ] Préviews fonctionnent via fallback (≥80% des titres avec extrait).
- [ ] Responsive mobile OK.
- [ ] Aucune clé en clair dans le repo; `.env.example` présent.

## Notes techniques

- Les tokens de rafraîchissement sont chiffrés (AES‑GCM) et stockés en cookie httpOnly.
- PKCE est utilisé (challenge S256). En cas d’échec côté token endpoint, un fallback "client secret" est tenté.
- Aucune métrique "valence/énergie/danceability" n’est utilisée; uniquement seeds + popularité approx.
- Exclusions genres : meilleur effort via `GET /v1/artists?ids=...` pour connaître les genres des artistes.
- Si aucune clé IA n'est fournie, une heuristique locale fournit des seeds basiques pour rester fonctionnel.
