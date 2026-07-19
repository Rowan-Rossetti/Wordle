# WORDLE — édition 100 fonctionnalités

Jeu Wordle français réalisé avec Angular 20, jouable sur ordinateur, tablette et téléphone.

## Contenu

Le jeu intègre **exactement 100 fonctionnalités et règles documentées**. Elles sont accessibles directement depuis le bouton **100 fonctions** de l’interface et regroupées en huit catégories :

- Partie et modes de jeu
- Validation du dictionnaire
- Mode strict
- Aides
- Progression
- Statistiques
- Succès
- Interface et accessibilité

Parmi les fonctions principales : mots de 4 à 8 lettres, défi quotidien, chrono, mode zen, quatre difficultés, dictionnaire français Hunspell hors ligne, règles strictes cumulatives, gestion des doublons, indices, XP, niveaux, séries, historique, succès, export JSON, AZERTY/QWERTY, thèmes et options d’accessibilité.

## Installation

```bash
npm install
npm start
```

L’application est ensuite disponible à l’adresse indiquée par Angular, généralement `http://localhost:4200`.

## Compilation de production

```bash
npm run build
```

## Sauvegarde locale

- `sessionStorage` conserve uniquement la partie de la visite actuelle.
- Une nouvelle visite après fermeture de l’onglet reçoit un nouveau mot.
- `localStorage` conserve les statistiques, réglages, succès, historique et mots déjà tirés.
- Les réponses déjà sélectionnées ne reviennent pas avant l’épuisement de la banque.

## Vérifications effectuées

- `npm ci` : réussi
- `npm run build` : réussi
- Audit npm : aucune vulnérabilité signalée lors de la génération de l’archive
