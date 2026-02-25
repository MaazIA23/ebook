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

## Dépannage – Logs Railway

### Messages à ignorer (normaux ou hors de ton app)

- **`relation "pg_stat_statements" does not exist`** : requête de l’interface Railway (Data UI) sur Postgres. Tu peux l’ignorer.
- **`checkpoint starting` / `checkpoint complete`** : maintenance normale de PostgreSQL.
- **`Connection reset by peer`** (côté Postgres) : souvent quand le backend redémarre et coupe la connexion à la base.

### Pydantic : `orm_mode` → `from_attributes`

Si tu vois **`'orm_mode' has been renamed to 'from_attributes'`** : le code du dépôt est à jour (on utilise `from_attributes`). Assure-toi d’avoir **poussé** et que Railway a **redéployé** le backend avec la dernière version.

### Backend qui s’arrête après ~10 secondes

Si les logs montrent **`Uvicorn running`** puis peu après **`Shutting down`** / **`Finished server process`** :

1. **Health check** : Railway → service backend → **Settings** → cherche **Health Check** / **Probe**. Si activé, mets le chemin sur **`/health`** (ou **`/`**) et un **délai initial** suffisant (ex. 30 s) pour laisser uvicorn démarrer. Si tu peux désactiver le health check pour tester, fais-le temporairement.
2. **Redeploy** : déclenche un **Redeploy** après avoir poussé les derniers changements (Dockerfile, `from_attributes`), pour que le conteneur tourne avec la bonne config.

---

## Stripe : webhook et carte test

### Webhook (marquer la commande comme payée)

Quand un client paie avec Stripe, le backend doit recevoir l’événement `payment_intent.succeeded` pour passer la commande en « payée ». Pour cela :

1. Va sur [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks** → **Add endpoint**.
2. **URL** : `https://TON-URL-BACKEND/payments/webhook` (remplace par l’URL publique de ton backend, sans slash final).
3. **Événements** : sélectionne `payment_intent.succeeded`.
4. Crée l’endpoint, puis copie le **Signing secret** (ex. `whsec_...`).
5. Dans Railway → **service Backend** → **Variables** : ajoute ou modifie **`STRIPE_WEBHOOK_SECRET`** avec cette valeur.

Sans webhook, le paiement peut réussir côté Stripe mais la commande restera « en attente » en base.

### Carte de test

En mode test Stripe (clés `pk_test_...` / `sk_test_...`), tu peux utiliser une **carte de test** :

- **Numéro** : `4242 4242 4242 4242`
- **Date** : une date future (ex. 12/34)
- **CVC** : n’importe quel code 3 chiffres (ex. 123)

Sur le front, configure **`VITE_STRIPE_PUBLISHABLE_KEY`** (clé publique `pk_test_...`) pour afficher le formulaire de paiement par carte. Sans cette variable, seul le bouton « Payer (simulation) » est disponible.

### Difficultés rencontrées et corrections

1. **Formulaire carte ne s’affichait pas**  
   L’app affichait une alerte « Paiement simulé » au lieu du formulaire Stripe. **Cause :** la variable **`VITE_STRIPE_PUBLISHABLE_KEY`** n’était pas définie sur le service frontend Railway (ou le front n’avait pas été redéployé après l’ajout). Les variables `VITE_*` sont injectées **au build**. **Correction :** ajouter `VITE_STRIPE_PUBLISHABLE_KEY` sur le service Frontend puis **redéployer** le front.

2. **Statut de la commande restait « pending » après paiement**  
   Le paiement Stripe réussissait mais la commande restait en attente. **Causes possibles :**  
   - Le webhook Stripe n’était pas configuré ou le secret incorrect.  
   - L’appel à **`POST /payments/confirm-paid`** n’était pas fait ou échouait.  
   - Au **retour après 3DS**, la page se chargeait et l’appel à `confirm-paid` partait **avant** que le token d’authentification soit restauré → requête sans `Authorization` → 401, la commande n’était pas mise à jour.  
   **Corrections :**  
   - Endpoint **`/payments/confirm-paid`** : le backend vérifie le statut du PaymentIntent chez Stripe et met la commande en `paid`.  
   - Le front appelle `confirm-paid` après un paiement réussi (CheckoutPage) et aussi au retour 3DS (App), mais **uniquement quand l’auth est prête** (`loading === false`), avec un `useRef` pour ne pas appeler plusieurs fois.  
   - Côté backend : si Stripe renvoie le PaymentIntent en `processing` (cas possible juste après 3DS), on attend 2 secondes, on re-récupère le PaymentIntent puis on revérifie avant de mettre à jour le statut.

3. **Résumé**  
   Pour que le flux soit fiable : configurer le webhook Stripe (recommandé) **et** utiliser `confirm-paid` côté front après succès (y compris au retour 3DS, une fois l’auth chargée). Les deux mécanismes peuvent coexister.

Voir aussi **`docs/CHANGELOG.md`** (sections 11, 12, 13) pour le détail des problèmes et des références de code.

---

## Récap

| Élément | Où | À retenir |
|--------|-----|------------|
| Base de données | Service PostgreSQL | `DATABASE_URL` pour le backend |
| API | Service Backend (root `server`) | URL publique → à mettre dans `VITE_API_URL` (front) et dans `CORS_ORIGINS` (back) |
| Frontend | Service Frontend (root `client`) | URL publique → à mettre dans `CORS_ORIGINS` (back) |
| Variables front | Service Frontend | `VITE_API_URL` = URL du backend ; `VITE_STRIPE_PUBLISHABLE_KEY` = clé publique Stripe (optionnel) |
| Variables back | Service Backend | `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` (= URL du front), Stripe |

Une fois ces étapes faites, back et front sont déployés sur Railway et le front utilise bien l’API en ligne.
