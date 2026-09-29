# Journal des modifications

La traduction française de [CHANGELOG.md](CHANGELOG.md), lue par la fenêtre
« Nouveautés » de l'app quand elle est en français. Seules les versions
traduites ici y apparaissent en français ; les autres s'affichent en anglais.
Chaque ligne est marquée :
- 🆕 ce que l'app ne faisait pas avant,
- 🎨 ce qui existait et a été redessiné ou reformulé,
- 🐛 un bug ou une régression corrigés.

## 1.17.1

Insights compte de nouveau les bons jours, et la fenêtre Nouveautés s'ouvre maintenant après chaque mise à jour, avec les changements les plus visibles en premier.

🎨 **Les Nouveautés s'ouvrent après chaque mise à jour.** Elles ne s'ouvraient que lorsqu'une version apportait du nouveau. Maintenant chaque version les ouvre une fois, et ses lignes sont classées du plus visible au moins visible : les nouveautés, puis les changements d'apparence, puis les corrections.

🐛 **Insights affiche les bons jours.** La vue Jour n'affichait rien, le dernier jour de chaque période était oublié, et un jour manquait entre les parties d'un trimestre ou d'une année. Une tâche terminée dans les premières heures d'une période, en France avant 2 h du matin, était aussi manquée. Chaque jour de la période choisie est maintenant compté.

## 1.17.0

Une série de corrections : l'heure tapée avec une date est conservée, plus rien n'est créé en double, les liens restent des liens, et l'app supporte mieux les mauvaises connexions et les navigateurs qui bloquent le stockage.

🐛 **Une heure tapée avec une date est conservée.** Taper « demain à 14h30 » dans la date d'une tâche enregistre maintenant 14:30, dans la fenêtre de nouvelle tâche, le panneau de tâche, le menu date d'une ligne et la barre pour plusieurs tâches. Une échéance reste un jour, et le dit quand vous y tapez une heure.

🐛 **Ajouter une tâche deux fois en double-cliquant.** La fenêtre de nouvelle tâche n'accepte plus qu'un enregistrement à la fois, au bouton comme au clavier. Deux tâches au même nom créées volontairement restent deux tâches.

🐛 **Un lien ne change plus votre tâche.** `https://example.com/p1` rendait la tâche P1, et un lien finissant par `/daily` la rendait récurrente. Les liens sont lus comme des liens, et ce que vous tapez à côté fonctionne toujours.

🐛 **Les mois sont bien lus.** « 14 juillet » est en juillet (c'était juin), « 1er juillet » et « July 1st » sont compris, et des mots comme « 2 maisons » ou « 2 decks » ne sont plus pris pour des dates. Une date comme 12/03 suit Réglages, Format de date.

🐛 **Enregistrer et Annuler sous le titre d'une tâche fonctionnent au clavier.** Entrée et Espace font ce que fait un clic.

🐛 **À venir change de jour à minuit.** Laissée ouverte la nuit, la page gagne seule le nouveau dernier jour, et une tâche qui vient d'entrer dans la période ne reste plus cachée jusqu'à ce que vous quittiez la page.

🐛 **Une fenêtre au-dessus d'une autre.** Échap ne ferme plus que celle de devant, Tab fait le tour des deux boutons d'une confirmation, et le panneau de tâche derrière ne répond plus aux touches.

🐛 **Supprimer une tâche avec ses sous-tâches.** Sélectionner un parent et ses sous-tâches supprime la branche une seule fois, sans faux « Todoist a refusé ceci », et une annulation tardive rend chaque tâche une seule fois.

🐛 **Un accent personnalisé suit le mode sombre.** Quand votre appareil passe en sombre app ouverte, les couleurs de l'accent suivent au lieu d'attendre un rechargement.

🐛 **Le texte « @@link0@@ » s'affiche tel quel.** Il ne devient plus « undefined » dans un titre ou une description, et un @ collé à un mot, comme dans une adresse e-mail, n'est plus pris pour un tag.

🐛 **L'app s'ouvre même quand le navigateur bloque le stockage du site.** Elle restait sur « Chargement… ». Si quelque chose plante, un court message et un bouton Recharger remplacent la page blanche.

🐛 **Les modifications hors ligne vont au bon compte.** Les modifications faites hors ligne avec un compte Todoist ne sont plus envoyées à un autre compte qui se connecte ensuite. On vous dit combien ont été laissées de côté.

🐛 **Une modification faite juste avant de fermer est conservée hors ligne.** Changer d'app ou fermer l'onglet juste après une modification ne la perd plus de la copie gardée sur votre appareil.

🐛 **Une connexion lente ou bloquée se termine proprement.** Un téléchargement qui s'arrête à moitié compte comme un délai dépassé, et un long « réessayer après » de Todoist ne fige plus la synchronisation.

🐛 **La démo répète bien les tâches.** Cocher une tâche quotidienne la décale d'un jour en gardant son heure, et « tous les lundis » passe au lundi suivant. Une tâche tapée avec « tous les jours à 15h » affiche Aujourd'hui 15:00.

🆕 **Les notifications ont un bouton de fermeture et disparaissent plus vite.** Les confirmations restent 3 secondes, les erreurs 6, et la durée d'annulation reste 8. Fermer une notification garde l'annulation disponible avec le raccourci d'annulation.

🆕 **Les lecteurs d'écran annoncent les notifications.** Les confirmations sont lues poliment, les refus de Todoist tout de suite, et le bouton Annuler dit ce qu'il annule.

🎨 **Les listes de tâches se lisent plus facilement.** Les tags, les compteurs de groupe, ceux des colonnes de tableau et les petites étiquettes du panneau de tâche passent de 11 à 12 pixels.

## 1.16.0

Après chaque mise à jour, une courte fenêtre vous dit ce qui a changé, la fenêtre de nouvelle tâche se lit plus facilement, et choisir une date se fait de la même façon partout.

🆕 **Voir les nouveautés après une mise à jour.** Quand une nouvelle version apporte du nouveau, une courte fenêtre liste les changements, une seule fois. Vous pouvez la désactiver, et relire toutes les versions, dans Réglages, rubrique À propos.

🆕 **Ajouter une section depuis un tableau.** En vue Tableau d'un projet, la colonne en pointillés « Ajouter une section », à la fin, crée une nouvelle section, la même que depuis la liste.

🆕 **Choisir la largeur d'un tableau.** Un tableau garde maintenant la largeur de l'en-tête de la page, comme une liste. Activez Pleine largeur dans Affichage pour utiliser tout l'écran.

🎨 **Une fenêtre de nouvelle tâche plus claire.** Le titre vient d'abord, avec la description juste en dessous. Ensuite la date, l'échéance, le projet, la priorité, l'estimation et les tags tiennent sur une ligne de petits boutons, et ceux qui sont vides s'affichent en « + Échéance ». Les sous-tâches ont leur propre titre avec leur nombre, et les boutons restent en bas.

🎨 **Un seul sélecteur de date partout.** Le menu date d'une tâche, la barre pour plusieurs tâches sélectionnées, la fenêtre de nouvelle tâche et le panneau de tâche montrent le même sélecteur : tapez une date, choisissez Aujourd'hui, Demain, La semaine prochaine, Cette semaine ou Un jour, ou cliquez sur un jour du mois.

🎨 **Les mots reconnus dans un titre se distinguent mieux.** Les surlignages derrière une date, un projet ou un tag que vous tapez gardent l'espace normal entre les mots : plusieurs à la suite ne se confondent plus.

🎨 **Les cartes d'un tableau gardent leurs boutons dedans.** Au survol, les boutons d'une carte apparaissent dans son coin supérieur, sur la carte même, alignés avec le titre.

🎨 **Tous les menus où l'on tape ont le même champ de recherche.** Déplacer une tâche, choisir des tags, un projet ou une date : le champ en haut a le même aspect et marche pareil.

🎨 **Le bouton Affichage ne compte que les vrais réglages.** Son chiffre augmente quand vous filtrez, groupez ou triez une page autrement que par défaut, plus quand vous passez de liste à tableau (ou de matrice à liste).

🐛 **Ouvrir une tâche ne relit plus son titre.** Un titre enregistré comme « Daily review » reste du texte simple. Seul ce que vous tapez ensuite devient une date, un tag ou une priorité.

🐛 **Taper un tag créait un tag par lettre.** Taper « @week » dans la fenêtre de nouvelle tâche enregistrait « w », « we », « wee » et « week ». Maintenant, seul le tag final est enregistré.

🐛 **La revue suit le panneau de tâche.** Une tâche terminée ou supprimée depuis le panneau quitte tout de suite l'étape de la revue. L'étape « Sans estimation » dit quelles tâches elle liste, et reprend une tâche créée entre-temps.

🐛 **Les menus d'un tableau ou d'une liste courte ne sont plus coupés.** Les menus date, déplacer et plus d'une tâche s'ouvrent toujours en entier, sur toute la page.

## 1.15.0

Les dates et les tableaux se pilotent au clavier, les liens s'ouvrent, et vous passez d'une tâche à la suivante sans la fermer.

🆕 **Choisir une date sans la souris.** Partout où vous choisissez une date (le bouton date d'une tâche, la barre qui apparaît quand plusieurs tâches sont sélectionnées, la fenêtre de nouvelle tâche, le panneau de tâche), les flèches parcourent les jours du mois. Page préc. et Page suiv. changent de mois, et Entrée choisit le jour.

🆕 **Les tableaux défilent page par page.** En vue Tableau, les colonnes tiennent toujours dans l'écran : plus de colonne coupée en deux. Les flèches au-dessus du tableau avancent d'une page entière. Glissez une carte au bord du tableau et la page tourne toute seule.

🆕 **Prochainement se groupe par jour, semaine ou mois.** Ouvrez Affichage sur la page Prochainement et choisissez le regroupement, en liste comme en tableau.

🆕 **Les liens de vos tâches s'ouvrent.** Un lien dans le titre ou la description d'une tâche s'ouvre d'un clic, qu'il soit écrit `[texte](adresse)`, en adresse complète `https://`, ou simplement `site.fr`. Il garde la couleur du texte, souligné.

🆕 **Ouvrir une tâche terminée depuis le Journal.** Dans Analyses, cliquez sur une tâche terminée du Journal (ou appuyez sur Entrée) pour l'ouvrir dans le panneau de tâche. Les flèches haut et bas parcourent aussi le Journal.

🆕 **Passer à la tâche suivante depuis le panneau.** Deux petites flèches en haut du panneau de tâche (ou J / K, ↑ / ↓) ouvrent la tâche précédente ou suivante de la liste d'où vous venez, même après en avoir cochée ou déplacée.

🆕 **Glisser plusieurs tâches d'un coup.** Sélectionnez des tâches avec ⌘-clic, puis glissez-en une : elles partent ensemble en pile avec leur nombre, et arrivent dans l'ordre de votre sélection.

🎨 **Les projets aux noms particuliers marchent dans la fenêtre de nouvelle tâche.** Choisir un `#projet` dans la liste marche toujours, même avec un point, une esperluette ou un emoji dans son nom. Un long « projet / section » est raccourci au lieu d'élargir la fenêtre.

🎨 **Des tâches sélectionnées côte à côte forment un seul bloc**, comme dans Things, plutôt qu'une pile de pastilles séparées.

🐛 **Le repère du clavier et une tâche sélectionnée ne se ressemblent plus.** La tâche où se trouve le clavier a un contour, une tâche sélectionnée un fond coloré : vous voyez tout de suite quand vous en désélectionnez une.
