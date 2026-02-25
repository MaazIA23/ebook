# Changelog – Ebook Store

Toutes les modifications notables du projet sont documentées ici. Les entrées listent les **problèmes rencontrés** et les **solutions** appliquées, en particulier lors du déploiement sur Railway.

---

## [1.0.0] – 2026-02-24

### Déploiement Railway – Problèmes et solutions

#### 1. Variable `PORT` non définie → erreur 502 / "Application failed to respond"

**Problème :**  
Sur Railway, le backend est démarré avec une commande du type `uvicorn ... --port $PORT`. La variable `$PORT` est injectée par Railway au moment du run. Si la commande est exécutée **sans shell** (forme exec du CMD Docker), `$PORT` n’est pas développée et uvicorn reçoit littéralement la chaîne `"$PORT"`, ce qui provoque :

- `Error: Invalid value for '--port': '$PORT' is not a valid integer`
- Puis 502 Bad Gateway car l’application n’écoute pas sur le port attendu par le proxy Railway.

**Solutions appliquées :**

1. **Script shell `start.sh`** : lecture de `PORT` dans un shell puis `exec uvicorn ... --port ${PORT:-8000}`. Problème restant : sur certains environnements la Start Command Railway override le CMD et relance une commande où `$PORT` n’est pas développée.
2. **CMD avec `sh -c`** dans le Dockerfile : `CMD sh -c 'exec uvicorn ... --port ${PORT:-8000}'`. Même risque si Railway override avec une commande personnalisée.
3. **Script Python `run.py` (retenu)** : point d’entrée qui lit `os.environ.get("PORT", "8000")` et lance uvicorn en Python. La variable est lue **au runtime** dans l’environnement du conteneur, sans dépendre du shell.  
   - Fichier : `server/run.py`  
   - Dockerfile : `CMD ["python", "run.py"]`  
   - Sur Railway : **Start Command** laissée **vide** pour utiliser ce CMD.

**Référence :** `server/run.py`, `server/Dockerfile`.

---

#### 2. Redirection 307 vers HTTP → requêtes bloquées (mixed content)

**Problème :**  
FastAPI redirige `/products` vers `/products/`. En production derrière un proxy (Railway), la requête arrive en HTTP. L’en-tête `Location` de la redirection était donc en `http://...`. Le navigateur (front en HTTPS) refusait de suivre une redirection vers HTTP (mixed content), ce qui provoquait des échecs réseau côté front.

**Solution :**  
Middleware **ProxyHeadersMiddleware** qui, si l’en-tête `X-Forwarded-Proto` vaut `https`, force `request.scope["scheme"] = "https"`. Les redirections générées par FastAPI pointent alors vers HTTPS.  
Côté front : appel direct à `/products/` (avec slash) pour éviter la redirection.

**Référence :** `server/src/main.py`, `client/src/pages/cataloguePage.tsx`.

---

#### 3. Frontend appelle localhost au lieu de l’API déployée

**Problème :**  
En production, le front affichait « Impossible de joindre l’API » et « API attendue: https://... ». La variable **`VITE_API_URL`** n’était pas définie (ou le front n’avait pas été redéployé après l’ajout). Vite injecte les variables `VITE_*` **au build** : sans `VITE_API_URL` au moment du build, le client utilisait la valeur par défaut (localhost).

**Solution :**  
Sur le **service frontend** Railway : ajouter la variable **`VITE_API_URL`** = URL publique du backend (sans slash final). Puis **redéployer** le frontend pour que le nouveau build prenne en compte la variable.

**Référence :** `client/src/api/http.ts`, `docs/DEPLOIEMENT-RAILWAY.md`.

---

#### 4. CORS : le navigateur bloque les appels à l’API

**Problème :**  
Les requêtes du front (origine `https://front.up.railway.app`) vers l’API (origine différente) sont soumises à CORS. Si le backend ne renvoie pas `Access-Control-Allow-Origin` avec l’origine du front, le navigateur bloque la réponse.

**Solution :**  
Sur le **service backend** Railway : variable **`CORS_ORIGINS`** = URL exacte du frontend (ex. `https://ebook-production-0946.up.railway.app`), sans slash final. Le backend FastAPI configure `CORSMiddleware` avec cette liste. Plusieurs origines possibles, séparées par des virgules.

**Référence :** `server/src/main.py`, `docs/DEPLOIEMENT-RAILWAY.md`.

---

#### 5. Timeout 15 s au chargement du catalogue (cold start Railway)

**Problème :**  
Sur l’offre gratuite Railway, le backend s’endort après inactivité. Au premier appel, le redémarrage peut prendre 30–60 s. Un timeout frontend de 15 s provoquait « timeout of 15000ms exceeded » avant que le backend ne réponde.

**Solution :**  
- Timeout axios porté à **60 s** dans `client/src/api/http.ts`.  
- Message d’erreur dédié en cas de timeout (invitation à réessayer après réveil du serveur).

**Référence :** `client/src/api/http.ts`, `client/src/pages/cataloguePage.tsx`.

---

#### 6. Build frontend Railway : `npm ci` et `package-lock.json` désynchronisés

**Problème :**  
Railway exécute `npm ci`, qui exige que `package-lock.json` soit aligné avec `package.json`. La dépendance **`serve`** avait été ajoutée dans `package.json` sans mettre à jour le lock file, d’où l’erreur « Missing: serve@... from lock file ».

**Solution :**  
Exécuter **`npm install`** dans `client/` pour régénérer `package-lock.json`, puis committer et pousser le fichier.

**Référence :** `client/package.json`, `client/package-lock.json`.

---

#### 7. Backend : exécutable `npx` introuvable

**Problème :**  
Le **service backend** (image Python/Dockerfile) était configuré avec une **Start Command** qui utilisait **`npx`** (commande Node). L’image backend ne contient pas Node, d’où « The executable `npx` could not be found » et le conteneur ne démarrait pas.

**Solution :**  
Sur le service **backend** Railway : **Start Command** laissée **vide** (ou explicitement `./start.sh` puis `python run.py` selon la config) pour que le **CMD du Dockerfile** soit utilisé (Python/uvicorn), et jamais une commande Node.

**Référence :** `server/Dockerfile`, `docs/DEPLOIEMENT-RAILWAY.md`.

---

#### 8. Catalogue vide après déploiement

**Problème :**  
L’API répond (plus d’erreur réseau), mais la section catalogue reste vide. Aucun produit n’est renvoyé par `GET /products/`.

**Solution :**  
La base PostgreSQL de production n’avait jamais été initialisée avec les produits. Exécuter **une fois** le script de seed :  
`python seed_products.py` en pointant **`DATABASE_URL`** vers la base Railway (utiliser **`DATABASE_PUBLIC_URL`** si l’exécution se fait depuis la machine locale).

**Référence :** `server/seed_products.py`, `docs/DEPLOIEMENT-RAILWAY.md` (section Seed).

---

#### 9. Pydantic : avertissement `orm_mode` renommé en `from_attributes`

**Problème :**  
En Python 3.12 avec Pydantic v2, l’option `orm_mode = True` dans les modèles est dépréciée au profit de `from_attributes = True`. Les logs Railway affichaient des warnings.

**Solution :**  
Remplacement de **`orm_mode = True`** par **`from_attributes = True`** dans tous les modèles Pydantic (auth, orders, products).

**Référence :** `server/src/routes/auth.py`, `server/src/routes/orders.py`, `server/src/routes/products.py`.

---

#### 10. Conteneur backend qui s’arrête après ~10 secondes

**Problème :**  
Les logs montraient « Uvicorn running » puis rapidement « Shutting down » / « Finished server process ». Le conteneur redémarrait en boucle, d’où 502 ou « Application failed to respond » lors des requêtes.

**Solution :**  
Vérifier dans **Settings** du service backend la configuration du **Health Check** (path `/health` ou `/`, délai initial suffisant, ex. 30 s) ou le désactiver temporairement pour tester. S’assurer que la **Start Command** est vide pour utiliser le CMD du Dockerfile (run.py).

**Référence :** `docs/DEPLOIEMENT-RAILWAY.md` (section Dépannage).

---

### Intégration Stripe – Paiement par carte et statut « paid »

#### 11. Formulaire carte Stripe ne s’affiche pas (alerte « Paiement simulé »)

**Problème :**  
Sur l’app déployée, après avoir cliqué sur « Payer », une alerte affichait « Paiement simulé ! » avec un `client_secret` au lieu du formulaire de saisie de carte (Stripe Payment Element). Impossible d’entrer la carte test ou les informations client.

**Cause :**  
La clé **publique** Stripe (`pk_test_...`) doit être connue du **frontend** au moment du **build**. Elle est injectée via la variable d’environnement **`VITE_STRIPE_PUBLISHABLE_KEY`**. Sans cette variable sur le **service frontend** Railway (ou sans redéploiement après l’avoir ajoutée), le front utilise le mode « simulation » (bouton qui appelle uniquement `mock-confirm` sans formulaire carte).

**Solution :**  
1. Récupérer la **Publishable key** sur [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys).  
2. Sur Railway → **service Frontend** → **Variables** : ajouter **`VITE_STRIPE_PUBLISHABLE_KEY`** = `pk_test_...`.  
3. **Redéployer** le frontend (les variables `VITE_*` sont prises en compte au build).  

En local : définir `VITE_STRIPE_PUBLISHABLE_KEY` dans `client/.env` et redémarrer `npm run dev`.

**Référence :** `client/src/pages/CheckoutPage.tsx`, `docs/DEPLOIEMENT-RAILWAY.md` (section Stripe).

---

#### 12. Commande reste en « pending » après un paiement réussi

**Problème :**  
Le paiement Stripe se termine correctement (carte test acceptée, page de succès affichée), mais dans « Mes achats » le statut de la commande reste **pending**. Le bouton « Télécharger » reste indisponible ou renvoie une erreur.

**Cause :**  
Le passage du statut à **paid** repose sur deux mécanismes :  
- Le **webhook** Stripe (`payment_intent.succeeded`) vers `POST /payments/webhook` — si le webhook n’est pas configuré ou que le secret est incorrect, la commande n’est pas mise à jour.  
- Un appel **frontend** à **`POST /payments/confirm-paid`** après succès du paiement : le backend vérifie auprès de Stripe que le PaymentIntent est en `succeeded` et met la commande à jour.  

Si cet appel n’est pas fait (ou échoue), la commande reste en pending.

**Solutions appliquées :**  

1. **Endpoint `POST /payments/confirm-paid`** (backend) : reçoit `order_id`, vérifie que la commande appartient à l’utilisateur, récupère le PaymentIntent chez Stripe ; si le statut est `succeeded` (ou après un court délai si Stripe renvoie encore `processing`), met `order.status = "paid"`.  
2. **Appel depuis le frontend** :  
   - Dans **CheckoutPage** : après un `stripe.confirmPayment()` réussi (sans redirection 3DS), appel à `confirm-paid` puis affichage de la page de succès.  
   - Lors du **retour après 3DS** : l’utilisateur est redirigé vers l’app avec `?payment_success=1&order_id=...`. L’appel à `confirm-paid` doit être fait **une fois l’authentification prête** (token restauré), sinon la requête part sans `Authorization` et le backend renvoie 401.  
3. **Déclencher `confirm-paid` après auth** : dans `App.tsx`, un `useEffect` appelle `confirm-paid` uniquement quand `loading` (auth) est à `false` et qu’on a un `paymentSuccessOrderId`. Un `useRef` évite les appels en double.  
4. **Stripe renvoie parfois « processing »** : juste après 3DS, le PaymentIntent peut être encore en `processing` avant de passer à `succeeded`. Côté backend, si le statut est `processing`, on attend 2 secondes, on re-récupère le PaymentIntent puis on revérifie ; si c’est `succeeded`, on met la commande à jour.

**Référence :** `server/src/routes/payments.py` (confirm-paid, webhook), `client/src/pages/CheckoutPage.tsx`, `client/src/App.tsx`, `docs/DEPLOIEMENT-RAILWAY.md` (section Stripe).

---

#### 13. Récapitulatif technique Stripe

- **Backend** : `POST /payments/create-intent` (crée le PaymentIntent), `POST /payments/confirm-paid` (vérifie le statut Stripe et met la commande en paid), `POST /payments/webhook` (reçoit `payment_intent.succeeded`, met la commande en paid).  
- **Frontend** : formulaire Stripe (Payment Element) quand `VITE_STRIPE_PUBLISHABLE_KEY` est défini ; après succès, appel à `confirm-paid` ; au retour 3DS, appel à `confirm-paid` une fois l’auth prête.  
- **Variables** : backend = `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ; frontend (build) = `VITE_STRIPE_PUBLISHABLE_KEY`.  
- **Carte test** : 4242 4242 4242 4242, date future, CVC quelconque.

---

### Autres modifications

- **Dockerfile backend** : image Python 3.12-slim, dépendances système pour psycopg2, utilisation de `run.py` pour le port.
- **Frontend** : bouton « Réessayer » sur la page catalogue en cas d’erreur.
- **Backend** : démarrage résilient (création des tables en try/except) pour que `/health` réponde même si la base est temporairement injoignable.
- **Documentation** : `DEPLOIEMENT-RAILWAY.md` (étapes + dépannage), `TECHNIQUE.md` (mise à jour + problèmes/solutions), `CHANGELOG.md` (ce fichier).

---

## Versioning

Le projet suit un versionnement **sémantique** (SemVer) pour les releases :

- **MAJOR** : changements incompatibles (ex. rupture d’API).
- **MINOR** : nouvelles fonctionnalités rétrocompatibles.
- **PATCH** : corrections de bugs et ajustements mineurs.

La version **1.0.0** correspond au premier déploiement fonctionnel (backend + frontend + PostgreSQL + Stripe) sur Railway, avec les correctifs listés ci-dessus.
