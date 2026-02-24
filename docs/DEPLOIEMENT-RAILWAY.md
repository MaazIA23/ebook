# Déploiement sur Railway – étape par étape

Backend + Frontend + Base PostgreSQL, le tout sur Railway.

---

## Prérequis

- Projet poussé sur **GitHub**
- Compte **Railway** ([railway.app](https://railway.app))
- (Optionnel) Clés **Stripe** pour les paiements

---

## Étape 1 : Créer un projet Railway

1. Va sur [railway.app](https://railway.app) et connecte-toi (avec GitHub si tu veux).
2. Clique sur **New Project**.
3. Choisis **Deploy from GitHub repo** et sélectionne ton dépôt du projet (ex. `projetweb`).
4. Railway va te proposer de détecter les services. On va tout configurer à la main.

---

## Étape 2 : Ajouter la base PostgreSQL

1. Dans ton projet Railway, clique sur **+ New**.
2. Choisis **Database** → **PostgreSQL**.
3. Railway crée la base. Clique sur le service **PostgreSQL**.
4. Onglet **Variables** (ou **Connect**) : tu verras une variable **`DATABASE_URL`** (ou **`DATABASE_PRIVATE_URL`**). **Copie sa valeur** (tu en auras besoin pour le backend).
5. Tu peux noter l’URL quelque part, ou on la réutilisera via le lien entre services à l’étape suivante.

---

## Étape 3 : Déployer le backend (API)

1. Dans le même projet, clique sur **+ New** → **GitHub Repo** (ou **Empty Service** si tu préfères, puis tu connecteras le repo).
2. Sélectionne **le même dépôt** que celui du projet.
3. Clique sur le **nouveau service** (celui qui vient d’être créé) pour le configurer.

### 3.1 Build et Démarrer

4. Onglet **Settings** (ou **Configure** selon l’interface) :
   - **Root Directory** : `server`
   - **Builder** : s’assurer que le **Dockerfile** est utilisé (pas Nixpacks).
   - **Build Command** : laisser vide si Dockerfile utilisé (le Dockerfile gère le build).
   - **Start Command** : **laisser vide** pour que le `CMD` du Dockerfile soit utilisé (sinon Railway peut lancer une commande où `$PORT` n’est pas pris en compte).

### 3.2 Variables d’environnement

5. Onglet **Variables** → **Add Variable** (ou **RAW Editor** pour tout coller).

Ajoute **une par une** (ou en bloc si Railway propose un éditeur brut) :

| Nom | Valeur |
|-----|--------|
| `DATABASE_URL` | Colle l’URL PostgreSQL (étape 2). Si tu as lié le service PostgreSQL au projet, tu peux parfois choisir **Add Reference** → **PostgreSQL** → **DATABASE_URL**. |
| `JWT_SECRET` | Une longue phrase secrète (ex. 32 caractères aléatoires). |
| `STRIPE_SECRET_KEY` | Ta clé Stripe (ex. `sk_test_...` ou `sk_live_...`). |
| `STRIPE_WEBHOOK_SECRET` | Clé webhook Stripe (ex. `whsec_...`), ou laisse vide en test. |
| `CORS_ORIGINS` | Pour l’instant laisse vide ; on la remplira à l’étape 5 avec l’URL du front. |
| `PAYMENTS_MOCK_ENABLED` | `0` en production (ou `1` si tu veux le mode mock). |

6. Enregistre, puis lance un **Deploy** (ou laisse Railway redéployer tout seul).

### 3.3 URL publique du backend

7. Toujours dans le service backend : **Settings** → **Networking** (ou **Generate Domain**).
8. Clique sur **Generate Domain** (ou **Public Networking**). Railway te donne une URL du type :  
   `https://ton-service.up.railway.app`
9. **Copie cette URL** (ex. `https://ebook-production-d994.up.railway.app`) : c’est l’**URL de ton API**. Tu en auras besoin pour le frontend et pour CORS.

---

## Étape 4 : Déployer le frontend (client)

1. Dans le **même projet** Railway, **+ New** → **GitHub Repo** (ou **Empty Service**).
2. Sélectionne **le même dépôt**.
3. Clique sur ce **nouveau service** (frontend).

### 4.1 Build et Démarrer

4. **Settings** :
   - **Root Directory** : `client`
   - **Build Command** :  
     `npm install && npm run build`
   - **Start Command** :  
     `npx serve -s dist -l $PORT`  
     (Railway définit `PORT` automatiquement. Le `-s` sert l’app en mode SPA pour que le routage fonctionne.)

### 4.2 Variable d’environnement obligatoire

5. **Variables** → **Add Variable** :
   - **Nom** : `VITE_API_URL`
   - **Valeur** : l’URL de ton **backend** (étape 3.3), **sans slash à la fin**.  
     Exemple : `https://ebook-production-d994.up.railway.app`

Sans cette variable, le front appelle encore `localhost` et tu auras l’erreur « Impossible de joindre l’API ».

6. Sauvegarde et **Deploy** (ou attends le redéploiement automatique).

### 4.3 URL publique du frontend

7. **Settings** → **Networking** → **Generate Domain**.
8. **Copie l’URL du frontend** (ex. `https://ton-front.up.railway.app`).

---

## Étape 5 : CORS (backend)

Pour que le navigateur autorise les appels du front vers l’API :

1. Retourne sur le **service backend** (API).
2. **Variables** → modifie **`CORS_ORIGINS`** :
   - Valeur : **l’URL exacte du frontend** (étape 4.3), sans slash final.  
     Exemple : `https://ton-front.up.railway.app`
3. Si tu as plusieurs origines (ex. un autre domaine), sépare-les par des virgules, sans espaces.
4. Sauvegarde → Railway redéploie le backend.

---

## Étape 6 : Vérifications

1. **Backend**  
   Ouvre dans le navigateur :  
   `https://TON-URL-BACKEND/health`  
   Tu dois voir : `{"status":"ok"}`.

2. **Frontend**  
   Ouvre l’URL du frontend. Le catalogue doit s’afficher et les requêtes doivent partir vers l’API (pas vers localhost).  
   Si tu vois encore « Impossible de joindre l’API », vérifie que **`VITE_API_URL`** est bien définie sur le **service frontend** et que tu as bien **redéployé** le front après l’avoir ajoutée.

3. **Base de données (seed)**  
   Pour avoir des produits dans le catalogue, exécute le seed **une fois** avec l’URL de la base Railway :
   - Soit en local : dans `server`, définis `DATABASE_URL` avec l’URL **externe** de la base Railway, puis lance `python seed_products.py`.
   - Soit via Railway : **Backend** → **Settings** → **Shell** (si disponible) et exécute depuis le répertoire du backend :  
     `python seed_products.py`  
   (en t’assurant que `DATABASE_URL` est bien celle de la base Railway).

---

## Récap

| Élément | Où | À retenir |
|--------|-----|------------|
| Base de données | Service PostgreSQL | `DATABASE_URL` pour le backend |
| API | Service Backend (root `server`) | URL publique → à mettre dans `VITE_API_URL` (front) et dans `CORS_ORIGINS` (back) |
| Frontend | Service Frontend (root `client`) | URL publique → à mettre dans `CORS_ORIGINS` (back) |
| Variables front | Service Frontend | `VITE_API_URL` = URL du backend (sans slash final) |
| Variables back | Service Backend | `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` (= URL du front), Stripe |

Une fois ces étapes faites, back et front sont déployés sur Railway et le front utilise bien l’API en ligne.
