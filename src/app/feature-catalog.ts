export interface GameFeature {
  id: number;
  category: string;
  title: string;
  description: string;
}

const categories: Array<[string, Array<[string, string]>]> = [
  ['Partie', [
    ['Mots de 4 lettres','Sélection et grille adaptées aux mots de quatre lettres.'],
    ['Mots de 5 lettres','Sélection et grille adaptées aux mots de cinq lettres.'],
    ['Mots de 6 lettres','Sélection et grille adaptées aux mots de six lettres.'],
    ['Mots de 7 lettres','Sélection et grille adaptées aux mots de sept lettres.'],
    ['Mots de 8 lettres','Sélection et grille adaptées aux mots de huit lettres.'],
    ['Longueur surprise','La longueur est choisie aléatoirement entre 4 et 8.'],
    ['Mode aléatoire','Une réponse inédite est tirée dans la banque locale.'],
    ['Défi quotidien','Le même défi est proposé pendant toute une journée.'],
    ['Mode chrono','Une limite de temps active la défaite automatique.'],
    ['Mode zen','La partie se joue sans pression temporelle.'],
    ['Difficulté détente','Huit essais sont disponibles.'],
    ['Difficulté normale','Six essais sont disponibles.'],
    ['Difficulté difficile','Le mode strict est imposé.'],
    ['Difficulté expert','Cinq essais et contraintes renforcées.'],
    ['Nouvelle partie manuelle','Le joueur choisit quand relancer une manche.'],
    ['Abandon contrôlé','Une manche peut être abandonnée explicitement.'],
    ['Pause du chrono','Le mode chrono peut être mis en pause.'],
    ['Reprise de partie','Une partie en session survit au rechargement.'],
    ['Nouvelle visite, nouveau mot','Fermer la session provoque un nouveau tirage.'],
    ['Réponses sans répétition','Les réponses déjà tirées sont mémorisées.']
  ]],
  ['Validation', [
    ['Dictionnaire français hors ligne','Hunspell valide les propositions françaises.'],
    ['Normalisation des accents','É et E sont comparés de manière cohérente.'],
    ['Normalisation de la casse','Les saisies sont converties en majuscules.'],
    ['Longueur obligatoire','Une proposition incomplète est refusée.'],
    ['Mot français obligatoire','Les suites non reconnues sont rejetées.'],
    ['Proposition unique','Le même mot ne peut pas être envoyé deux fois.'],
    ['Validation des doublons','Les occurrences multiples sont comptées précisément.'],
    ['Priorité aux lettres exactes','Les verts sont attribués avant les oranges.'],
    ['Limitation des oranges','Une occurrence ne peut pas être utilisée deux fois.'],
    ['Fin après victoire','La grille devient inactive dès que le mot est trouvé.'],
    ['Fin après essais','La partie se termine au dernier essai autorisé.'],
    ['Fin après chrono','Le temps écoulé provoque une défaite.'],
    ['Premier mot expert varié','Quatre lettres distinctes minimum au premier essai.'],
    ['Message de dictionnaire','Le chargement du dictionnaire est annoncé.'],
    ['Erreur détaillée','Chaque refus explique précisément la contrainte.']
  ]],
  ['Mode strict', [
    ['Conservation des verts','Toute lettre exacte reste à sa position.'],
    ['Réutilisation des oranges','Toute lettre présente doit être rejouée.'],
    ['Déplacement des oranges','Une orange ne revient pas à sa position incorrecte.'],
    ['Interdiction des gris','Une lettre totalement absente ne peut plus être jouée.'],
    ['Minimum de doublons','Le nombre minimal révélé doit être respecté.'],
    ['Contraintes cumulatives','Tous les essais précédents restent contraignants.'],
    ['Activation permanente possible','Le réglage strict est mémorisé.'],
    ['Activation forcée en expert','Le niveau expert réactive le strict.'],
    ['Contrôle avant consommation','Un essai invalide ne consomme aucune ligne.'],
    ['Positions interdites mémorisées','Chaque mauvaise position orange est conservée.']
  ]],
  ['Aides', [
    ['Trois indices maximum','Le budget d’aide est limité par manche.'],
    ['Indice lettre','Révèle une lettre appartenant à la réponse.'],
    ['Indice voyelle','Révèle une voyelle encore inconnue.'],
    ['Indice position','Révèle une lettre à sa position exacte.'],
    ['Positions déjà révélées exclues','Un indice ne révèle pas deux fois la même case.'],
    ['Aides bloquées en expert','Le mode expert interdit toute assistance.'],
    ['Compteur d’indices','Le solde restant est toujours affiché.'],
    ['Pénalité d’XP','Utiliser une aide réduit la récompense.'],
    ['Statistique d’aides','Le nombre total d’indices est enregistré.'],
    ['Message d’indice accessible','Le résultat est annoncé dans la zone dynamique.']
  ]],
  ['Progression', [
    ['Points d’expérience','Chaque partie attribue de l’XP.'],
    ['Bonus de victoire','Une victoire rapporte davantage qu’une défaite.'],
    ['Bonus expert','La difficulté expert augmente la récompense.'],
    ['Bonus de rapidité indirect','Moins d’essais conserve davantage de points.'],
    ['Niveaux de joueur','Un niveau est calculé tous les 500 XP.'],
    ['Barre de niveau','La progression vers le prochain niveau est visible.'],
    ['XP restante','Le nombre exact de points manquants est affiché.'],
    ['Série actuelle','Les victoires consécutives sont comptées.'],
    ['Meilleure série','Le record personnel est conservé.'],
    ['Premier essai','Les solutions immédiates sont comptabilisées.']
  ]],
  ['Statistiques', [
    ['Parties jouées','Toutes les manches terminées sont comptées.'],
    ['Victoires','Le total des manches gagnées est enregistré.'],
    ['Défaites déductibles','Jouées moins gagnées donne les défaites.'],
    ['Taux de victoire','Le pourcentage est calculé automatiquement.'],
    ['Essais moyens','La moyenne des essais gagnants est affichée.'],
    ['Temps moyen','Le temps moyen par partie est calculé.'],
    ['Distribution 1 à 8','Les victoires sont réparties par nombre d’essais.'],
    ['Historique de 100 parties','Les cent dernières manches sont conservées.'],
    ['Date de chaque partie','Chaque entrée possède un horodatage.'],
    ['Mode enregistré','L’historique indique le mode joué.'],
    ['Difficulté enregistrée','L’historique indique la difficulté.'],
    ['Mot final enregistré','Le mot de chaque manche est conservé localement.'],
    ['Durée enregistrée','Le temps de chaque manche est mémorisé.'],
    ['Réinitialisation centrée','Les statistiques peuvent être effacées clairement.'],
    ['Export JSON','Les données peuvent être téléchargées.']
  ]],
  ['Succès', [
    ['Première victoire','Badge débloqué à la première victoire.'],
    ['Dix victoires','Badge débloqué après dix victoires.'],
    ['Cinquante victoires','Badge débloqué après cinquante victoires.'],
    ['Série de cinq','Badge pour cinq victoires consécutives.'],
    ['Série de dix','Badge pour dix victoires consécutives.'],
    ['Coup de génie','Badge pour une victoire au premier essai.'],
    ['Éclair','Badge pour une victoire en moins de trente secondes.'],
    ['Sans assistance','Badge pour une victoire sans indice.'],
    ['Expert','Badge pour une victoire en difficulté expert.'],
    ['Contre-la-montre','Badge pour une victoire en mode chrono.'],
    ['Niveau cinq','Badge lié à la progression générale.'],
    ['Centenaire','Badge pour cent parties jouées.']
  ]],
  ['Interface et accessibilité', [
    ['Clavier AZERTY','Disposition française tactile disponible.'],
    ['Clavier QWERTY','Disposition alternative disponible.'],
    ['Clavier physique','Les touches du clavier réel sont prises en charge.'],
    ['Clavier tactile ultra-responsive','Les touches et la grille s’adaptent jusqu’à 320 px.'],
    ['Thèmes clair et sombre','Les deux apparences sont disponibles et mémorisées.'],
    ['Options d’accessibilité','Daltonisme, contraste, grand texte et animations réduites.'],
    ['Retours configurables','Le son et les vibrations peuvent être activés séparément.'],
    ['Partage sans spoiler','Le résultat est converti en carrés colorés.']
  ]]
];

export const FEATURE_CATALOG: GameFeature[] = categories.flatMap(([category, items]) =>
  items.map(([title, description]) => ({ id: 0, category, title, description }))
).map((feature, index) => ({ ...feature, id: index + 1 }));

if (FEATURE_CATALOG.length !== 100) {
  throw new Error(`Le catalogue doit contenir exactement 100 éléments (actuellement ${FEATURE_CATALOG.length}).`);
}
