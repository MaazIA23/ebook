## Documentation métier – Vente d’ebooks / PDF

### 1. Contexte

L’application a pour objectif de permettre à un **éditeur** ou à un **auteur** de vendre des ebooks (fichiers PDF) en ligne. 
Les utilisateurs finaux sont des **clients** qui créent un compte, achètent des ebooks, puis les téléchargent.

### 2. Acteurs

- **Visiteur** : personne non connectée qui peut consulter le catalogue.
- **Client** : utilisateur inscrit, authentifié, qui peut acheter et télécharger des ebooks.
- **Administrateur** : utilisateur avec rôle spécial, qui gère le catalogue de produits et éventuellement les commandes.

### 3. Cas d’usage principaux

1. **Consulter le catalogue**
   - En tant que visiteur ou client, je veux voir la liste des ebooks disponibles, avec titre, prix, couverture et résumé.

2. **Créer un compte / se connecter**
   - En tant que visiteur, je veux créer un compte pour pouvoir acheter et retrouver mes ebooks.
   - En tant que client, je veux me connecter / me déconnecter.

3. **Gérer son profil**
   - En tant que client, je peux consulter et modifier mes informations de base (nom, prénom, email).

4. **Ajouter des ebooks au panier**
   - En tant que client, je veux ajouter un ebook à mon panier, voir le contenu du panier, modifier les quantités et supprimer un article.

5. **Payer la commande**
   - En tant que client, je veux payer ma commande en ligne (par carte via Stripe) et être certain que ma commande est enregistrée.

6. **Télécharger les ebooks achetés**
   - En tant que client, je veux pouvoir télécharger les ebooks que j’ai achetés, depuis une page « Mes ebooks » ou depuis le détail d’une commande.

7. **Gérer le catalogue (admin)**
   - En tant qu’administrateur, je veux créer, modifier, désactiver ou supprimer des ebooks (titre, description, prix, fichier PDF associé).

### 4. Règles métier

- Un ebook **inactif** ne doit plus apparaître dans le catalogue public, mais peut rester visible dans l’historique des commandes.
- Un client ne peut **télécharger** un ebook que s’il a au moins **une commande payée** contenant ce produit.
- Les prix sont stockés en **centimes** (entier) pour éviter les problèmes d’arrondi.
- Les paiements sont gérés exclusivement par **Stripe** ; le système ne stocke pas les numéros de carte.
- Après validation par Stripe, la commande passe à l’état **“payée”**, ce qui débloque le téléchargement.

### 5. Parcours utilisateur simplifié

1. Le visiteur arrive sur la page d’accueil, consulte le catalogue.
2. Il crée un compte ou se connecte.
3. Il ajoute un ou plusieurs ebooks au panier.
4. Il passe au paiement (Stripe), règle la commande.
5. Après confirmation, il voit sa commande comme **payée**.
6. Il accède à la page « Mes ebooks » et peut télécharger les PDF.

### 6. Glossaire

- **Ebook** : livre numérique vendu sur la plateforme, sous forme de PDF.
- **Commande** : ensemble d’ebooks achetés en une seule fois.
- **Panier** : liste temporaire des ebooks sélectionnés avant le paiement.
- **Client** : utilisateur qui possède un compte et peut acheter des ebooks.
- **Admin** : utilisateur qui gère le catalogue et les paramètres du site.
- **PaymentIntent (Stripe)** : objet Stripe représentant une intention de paiement.

