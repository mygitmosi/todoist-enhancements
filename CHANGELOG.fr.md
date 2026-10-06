# Journal des modifications

La traduction française de [CHANGELOG.md](CHANGELOG.md), lue par la fenêtre
« Nouveautés » de l'app quand elle est en français. Seules les versions
traduites ici y apparaissent en français ; les autres s'affichent en anglais.
Chaque ligne est marquée :
- 🆕 ce que l'app ne faisait pas avant,
- 🎨 ce qui existait et a été redessiné ou reformulé,
- 🐛 un bug ou une régression corrigés.

## 1.20.0

Choisissez où stocker les estimations et prévisualisez leur conversion entre étiquettes et durées Todoist.

🆕 **Choisissez les étiquettes ou les durées Todoist dans les Réglages.** Les étiquettes restent le choix par défaut et préservent l’indépendance des blocs du calendrier. Le mode durée utilise le champ Todoist, retire les étiquettes d’estimation et modifie le bloc des tâches avec une heure. Les comptes gratuits utilisent les étiquettes, car Todoist ne conserve pas leurs durées. Chaque écriture de durée est contrôlée auprès de Todoist ; si elle est refusée ou perdue, l’estimation est récupérée en étiquette et un message explique le changement. Les abonnements inconnus sont autorisés avec le même contrôle.

🆕 **Convertissez les estimations existantes avec une prévisualisation dans les Réglages.** L’aperçu compte les tâches ouvertes et les sous-tâches, identifie celles avec une heure et liste les exclusions : étiquettes invalides, estimations différentes et durées en jours. La conversion vers les étiquettes conserve les blocs horaires et efface les durées sans heure. Les tâches terminées et les étiquettes du compte sont préservées. Le bilan liste les tâches en échec ou indique les changements en attente de connexion.

🆕 **Réglez les estimations différentes dans les Conflits en mode durée.** Conservez la durée et retirez son étiquette d’estimation, ou utilisez l’étiquette comme durée. Ce second choix avertit lorsqu’un bloc du calendrier va changer. Les totaux et les Analyses privilégient la source choisie et utilisent l’autre en secours. Les comptes existants choisissent après les fenêtres de démarrage ; les nouveaux comptes choisissent pendant la configuration.

🆕 **Estimez plusieurs tâches sélectionnées ensemble.** Sélectionnez les tâches, ouvrez Estimation dans la barre du bas et saisissez des minutes ou des heures comme 25, 1h15 ou 90 min pour appliquer une valeur commune, ou retirez leurs estimations. Le mode de stockage choisi s’applique à toute la sélection.

🐛 **Créez une étiquette manquante partout où vous choisissez les étiquettes.** Recherchez son nom et choisissez Créer dans une tâche, le formulaire de création ou la sélection groupée pour la créer et l’attacher. Les filtres d’affichage proposent aussi la création.

🐛 **Un clic sur le fond de la page efface la sélection de tâches.** Les lignes, les commandes groupées et les fenêtres ouvertes conservent leurs interactions.

## 1.19.0

Un filtre de temps pour les minutes dont vous disposez, un groupe Elles prennent la poussière dans Un jour, le groupe Rapide sur toutes les listes, et une visite de ce que chaque mise à jour apporte.

🆕 **Faire ce qui tient dans le temps dont vous disposez avec le nouveau bouton « J'ai du temps ».** Une pastille après la charge dans Cette semaine, les projets, les étiquettes, la boîte de réception et Un jour ouvre un panneau à droite. Choisissez 5, 10, 15 ou 30 minutes ou une heure, ou tapez une durée, et il liste les tâches qui tiennent, groupées en retard, aujourd'hui, demain, cette semaine et sans date, chacune avec son sous-total. Cherchez dans la page où vous êtes ou partout. Une tâche sans estimation n'est jamais devinée : le panneau les compte et propose de les estimer. La page derrière reste telle quelle, rien n'est modifié et rien n'est retenu après un rechargement. Ouvrir les Analyses le ferme.

🆕 **Un jour a un nouveau groupe « Elles prennent la poussière » pour les tâches en attente depuis des mois.** Les tâches qui y sont depuis 3 mois ou plus sont réunies en haut, sous Rapide, avec leur ancienneté. Chacune a trois boutons : Cette semaine, Garder et Supprimer. Garder laisse la tâche dans Un jour et ne la fait revenir qu'après un nouveau délai complet ; c'est retenu sur cet appareil seulement, et rien n'est écrit dans Todoist. Les Réglages ont un interrupteur pour le groupe et le délai (1, 2, 3, 6 ou 12 mois), compté depuis la création de la tâche car Todoist ne dit pas quand elle est arrivée dans Un jour. ⇧K garde la tâche sous le curseur.

🆕 **Les tâches rapides ouvrent maintenant chaque projet, étiquette, la boîte de réception et Un jour.** Les projets, les étiquettes, la boîte de réception et Un jour commencent maintenant par les tâches rapides en retard, dues aujourd'hui ou sans date, et chaque ligne dit de quelle section ou de quel projet elle vient. Une tâche rapide due demain ou plus tard reste à sa place, aucune tâche n'est listée deux fois, et un tableau commence par une colonne Rapide bleue, à regarder et non pour y déposer des tâches (aussi dans Cette semaine, où déposer une tâche la rendait rapide). L'interrupteur Rapide des Réglages le coupe partout.

🆕 **Un bouton « Me montrer » dans les Nouveautés fait visiter ce qu'une mise à jour apporte.** Les Nouveautés ont un bouton Me montrer qui lance la visite uniquement sur ce que la mise à jour apporte, et la visite a une nouvelle étape pour J'ai du temps.

🆕 **Une durée définie dans Todoist compte maintenant comme estimation de la tâche.** Une tâche qui a une durée dans le champ propre à Todoist est maintenant comptée dans les totaux, la charge, la liste des tâches sans estimation et les Analyses, même sans étiquette d'estimation. Quand une tâche a les deux, la durée l'emporte ; une durée en jours est ignorée. L'app écrit toujours les estimations en étiquettes.

## 1.18.0

Coller une liste pour créer plusieurs tâches, un menu de date qui commence par les raccourcis, des sous-tâches qui montrent leur avancement, et tout passer à aujourd'hui qui est instantané.

🆕 **Coller une liste pour créer plusieurs tâches.** Collez des lignes de texte, avec ou sans puces, dans le champ nom de la fenêtre de nouvelle tâche : l'app demande « Est-ce que vous voulez créer les 3 tâches ? » avant de créer une tâche séparée par ligne. Chaque ligne est lue comme un titre à part, donc `(25)`, une date ou `#Projet` dans une ligne s'applique à cette tâche. Annuler garde ce que vous avez collé.

🆕 **Donnez une estimation à une nouvelle sous-tâche en la terminant par (5) ou (1h15).** Terminez une sous-tâche par son estimation entre parenthèses, comme `Faire le plan (5)` ou `Recherches (1h15)`, dans la fenêtre de nouvelle tâche ou en ajoutant une sous-tâche à une tâche ouverte, et elle est créée avec cette estimation. L'estimation est surlignée pendant la saisie, comme dans le nom d'une tâche. Des parenthèses qui ne sont pas une durée, comme `(peut-être)`, restent dans le titre.

🎨 **Le menu de date commence par les raccourcis.** Aujourd'hui, Demain, La semaine prochaine, Cette semaine et Un jour d'abord, puis Passer à la prochaine occurrence (avec la date où elle va, quand elle est sûre) et Retirer la date ; le calendrier ne s'ouvre que si vous choisissez Choisir une date. Échap ou le lien de retour ramène aux raccourcis sans rien changer. Le même menu sert sur une ligne, dans la fenêtre de nouvelle tâche, le panneau de tâche et la barre pour plusieurs tâches.

🎨 **La case d'une tâche terminée est remplie de la couleur de sa priorité.** Une tâche ou sous-tâche terminée est remplie de la couleur de sa priorité (gris pour P4) au lieu du vert.

🎨 **Un anneau à côté de « 1/3 » montre où en sont les sous-tâches d'une tâche.** À côté de « 1/3 », un petit anneau se remplit à mesure que les sous-tâches sont faites, dans les listes et dans le panneau de tâche, et passe au vert quand elles le sont toutes.

🎨 **« Tout passer à aujourd'hui » vide En retard instantanément.** Dans Cette semaine, le bloc En retard se vide dès que vous confirmez, tout part en une fois, et le message dit combien de tâches ont été déplacées, avec Annuler.

🐛 **Une sous-tâche terminée apparaît maintenant cochée dans le panneau de tâche.** Sa case restait vide alors que son titre était barré. Les deux montrent maintenant qu'elle est faite.

## 1.17.1

Insights compte de nouveau les bons jours, et la fenêtre Nouveautés s'ouvre maintenant après chaque mise à jour, avec les changements les plus visibles en premier.

🎨 **Les Nouveautés s'ouvrent maintenant une fois après chaque mise à jour, les plus gros changements d'abord.** Elles ne s'ouvraient que lorsqu'une version apportait du nouveau. Maintenant chaque version les ouvre une fois, et ses lignes sont classées du plus visible au moins visible : les nouveautés, puis les changements d'apparence, puis les corrections.

🐛 **Insights compte maintenant chaque jour de la période choisie.** La vue Jour n'affichait rien, le dernier jour de chaque période était oublié, et un jour manquait entre les parties d'un trimestre ou d'une année. Une tâche terminée dans les premières heures d'une période, en France avant 2 h du matin, était aussi manquée. Chaque jour de la période choisie est maintenant compté.

## 1.17.0

Une série de corrections : l'heure tapée avec une date est conservée, plus rien n'est créé en double, les liens restent des liens, et l'app supporte mieux les mauvaises connexions et les navigateurs qui bloquent le stockage.

🐛 **Taper une heure avec une date, comme « demain à 14:30 », garde maintenant l'heure.** Taper « demain à 14h30 » dans la date d'une tâche enregistre maintenant 14:30, dans la fenêtre de nouvelle tâche, le panneau de tâche, le menu date d'une ligne et la barre pour plusieurs tâches. Une échéance reste un jour, et le dit quand vous y tapez une heure.

🐛 **Double-cliquer sur Ajouter une tâche ne crée plus la tâche deux fois.** La fenêtre de nouvelle tâche n'accepte plus qu'un enregistrement à la fois, au bouton comme au clavier. Deux tâches au même nom créées volontairement restent deux tâches.

🐛 **Un lien dans le nom d'une tâche ne change plus sa priorité ni sa répétition.** `https://example.com/p1` rendait la tâche P1, et un lien finissant par `/daily` la rendait récurrente. Les liens sont lus comme des liens, et ce que vous tapez à côté fonctionne toujours.

🐛 **Les dates avec un nom de mois, comme « 14 juillet », sont maintenant bien lues.** « 14 juillet » est en juillet (c'était juin), « 1er juillet » et « July 1st » sont compris, et des mots comme « 2 maisons » ou « 2 decks » ne sont plus pris pour des dates. Une date comme 12/03 suit Réglages, Format de date.

🐛 **Enregistrer et Annuler sous le titre d'une tâche répondent maintenant à Entrée et Espace.** Entrée et Espace font ce que fait un clic.

🐛 **À venir ajoute le nouveau jour tout seul quand minuit passe.** Laissée ouverte la nuit, la page gagne seule le nouveau dernier jour, et une tâche qui vient d'entrer dans la période ne reste plus cachée jusqu'à ce que vous quittiez la page.

🐛 **Échap et Tab agissent maintenant sur la fenêtre de devant quand il y en a deux.** Échap ne ferme plus que celle de devant, Tab fait le tour des deux boutons d'une confirmation, et le panneau de tâche derrière ne répond plus aux touches.

🐛 **Supprimer une tâche parente avec ses sous-tâches fonctionne maintenant proprement, annulation comprise.** Sélectionner un parent et ses sous-tâches supprime la branche une seule fois, sans faux « Todoist a refusé ceci », et une annulation tardive rend chaque tâche une seule fois.

🐛 **Une couleur d'accent personnalisée suit maintenant votre appareil en mode sombre sans rechargement.** Quand votre appareil passe en sombre app ouverte, les couleurs de l'accent suivent au lieu d'attendre un rechargement.

🐛 **Un nom de tâche contenant « @@link0@@ », ou une adresse e-mail, s'affiche maintenant tel quel.** Il ne devient plus « undefined » dans un titre ou une description, et un @ collé à un mot, comme dans une adresse e-mail, n'est plus pris pour un tag.

🐛 **L'app s'ouvre maintenant même quand votre navigateur bloque le stockage du site.** Elle restait sur « Chargement… ». Si quelque chose plante, un court message et un bouton Recharger remplacent la page blanche.

🐛 **Les modifications faites hors ligne ne sont plus envoyées à un autre compte qui se connecte ensuite.** Les modifications faites hors ligne avec un compte Todoist ne sont plus envoyées à un autre compte qui se connecte ensuite. On vous dit combien ont été laissées de côté.

🐛 **Une modification faite juste avant de fermer l'onglet ou de changer d'app n'est plus perdue.** Changer d'app ou fermer l'onglet juste après une modification ne la perd plus de la copie gardée sur votre appareil.

🐛 **Une connexion lente ou bloquée ne gèle plus la synchronisation.** Un téléchargement qui s'arrête à moitié compte comme un délai dépassé, et un long « réessayer après » de Todoist ne fige plus la synchronisation.

🐛 **Dans la démo, terminer une tâche répétée la fait maintenant passer correctement à sa prochaine date.** Cocher une tâche quotidienne la décale d'un jour en gardant son heure, et « tous les lundis » passe au lundi suivant. Une tâche tapée avec « tous les jours à 15h » affiche Aujourd'hui 15:00.

🆕 **Les messages en bas de l'écran ont un bouton de fermeture et disparaissent plus vite.** Les confirmations restent 3 secondes, les erreurs 6, et la durée d'annulation reste 8. Fermer une notification garde l'annulation disponible avec le raccourci d'annulation.

🆕 **Les lecteurs d'écran lisent maintenant les messages en bas de l'écran.** Les confirmations sont lues poliment, les refus de Todoist tout de suite, et le bouton Annuler dit ce qu'il annule.

🎨 **Les petits textes des listes de tâches, des groupes et du panneau de tâche sont un peu plus grands.** Les tags, les compteurs de groupe, ceux des colonnes de tableau et les petites étiquettes du panneau de tâche passent de 11 à 12 pixels.

## 1.16.0

Après chaque mise à jour, une courte fenêtre vous dit ce qui a changé, la fenêtre de nouvelle tâche se lit plus facilement, et choisir une date se fait de la même façon partout.

🆕 **Une fenêtre vous dit maintenant ce qui a changé après chaque mise à jour.** Quand une nouvelle version apporte du nouveau, une courte fenêtre liste les changements, une seule fois. Vous pouvez la désactiver, et relire toutes les versions, dans Réglages, rubrique À propos.

🆕 **Ajoutez une section directement depuis un tableau avec sa colonne « Ajouter une section ».** En vue Tableau d'un projet, la colonne en pointillés « Ajouter une section », à la fin, crée une nouvelle section, la même que depuis la liste.

🆕 **Choisissez dans Affichage entre un tableau de la largeur de la page ou pleine largeur.** Un tableau garde maintenant la largeur de l'en-tête de la page, comme une liste. Activez Pleine largeur dans Affichage pour utiliser tout l'écran.

🎨 **La fenêtre de nouvelle tâche est mieux disposée : titre, description, puis une ligne de boutons.** Le titre vient d'abord, avec la description juste en dessous. Ensuite la date, l'échéance, le projet, la priorité, l'estimation et les tags tiennent sur une ligne de petits boutons, et ceux qui sont vides s'affichent en « + Échéance ». Les sous-tâches ont leur propre titre avec leur nombre, et les boutons restent en bas.

🎨 **Le même sélecteur de date apparaît maintenant partout où l'on choisit une date.** Le menu date d'une tâche, la barre pour plusieurs tâches sélectionnées, la fenêtre de nouvelle tâche et le panneau de tâche montrent le même sélecteur : tapez une date, choisissez Aujourd'hui, Demain, La semaine prochaine, Cette semaine ou Un jour, ou cliquez sur un jour du mois.

🎨 **Les dates, projets et étiquettes tapés dans un titre se distinguent mieux.** Les surlignages derrière une date, un projet ou un tag que vous tapez gardent l'espace normal entre les mots : plusieurs à la suite ne se confondent plus.

🎨 **Survoler une carte de tableau affiche maintenant ses boutons à l'intérieur de la carte.** Au survol, les boutons d'une carte apparaissent dans son coin supérieur, sur la carte même, alignés avec le titre.

🎨 **Tous les menus avec un champ de recherche ont maintenant le même.** Déplacer une tâche, choisir des tags, un projet ou une date : le champ en haut a le même aspect et marche pareil.

🎨 **Le nombre sur Affichage ne compte plus que les filtres, groupements et tris que vous avez changés.** Son chiffre augmente quand vous filtrez, groupez ou triez une page autrement que par défaut, plus quand vous passez de liste à tableau (ou de matrice à liste).

🐛 **Ouvrir une tâche ne transforme plus des mots de son titre enregistré en date, étiquette ou priorité.** Un titre enregistré comme « Daily review » reste du texte simple. Seul ce que vous tapez ensuite devient une date, un tag ou une priorité.

🐛 **Taper @semaine dans la fenêtre de nouvelle tâche ne crée plus une étiquette par lettre.** Taper « @week » dans la fenêtre de nouvelle tâche enregistrait « w », « we », « wee » et « week ». Maintenant, seul le tag final est enregistré.

🐛 **La revue suit maintenant les changements faits dans le panneau de tâche.** Une tâche terminée ou supprimée depuis le panneau quitte tout de suite l'étape de la revue. L'étape « Sans estimation » dit quelles tâches elle liste, et reprend une tâche créée entre-temps.

🐛 **Les menus date, déplacer et plus d'une tâche sur un tableau ou une liste courte ne sont plus coupés.** Les menus date, déplacer et plus d'une tâche s'ouvrent toujours en entier, sur toute la page.

## 1.15.0

Les dates et les tableaux se pilotent au clavier, les liens s'ouvrent, et vous passez d'une tâche à la suivante sans la fermer.

🆕 **Choisissez une date avec les flèches du clavier partout où l'on en choisit une.** Partout où vous choisissez une date (le bouton date d'une tâche, la barre qui apparaît quand plusieurs tâches sont sélectionnées, la fenêtre de nouvelle tâche, le panneau de tâche), les flèches parcourent les jours du mois. Page préc. et Page suiv. changent de mois, et Entrée choisit le jour.

🆕 **Les tableaux défilent d'une page de colonnes à la fois, sans colonne coupée en deux.** En vue Tableau, les colonnes tiennent toujours dans l'écran : plus de colonne coupée en deux. Les flèches au-dessus du tableau avancent d'une page entière. Glissez une carte au bord du tableau et la page tourne toute seule.

🆕 **Groupez Prochainement par jour, semaine ou mois.** Ouvrez Affichage sur la page Prochainement et choisissez le regroupement, en liste comme en tableau.

🆕 **Les liens dans le titre ou la description d'une tâche s'ouvrent maintenant d'un clic.** Un lien dans le titre ou la description d'une tâche s'ouvre d'un clic, qu'il soit écrit `[texte](adresse)`, en adresse complète `https://`, ou simplement `site.fr`. Il garde la couleur du texte, souligné.

🆕 **Ouvrez une tâche terminée depuis le Journal des Analyses.** Dans Analyses, cliquez sur une tâche terminée du Journal (ou appuyez sur Entrée) pour l'ouvrir dans le panneau de tâche. Les flèches haut et bas parcourent aussi le Journal.

🆕 **Passez à la tâche précédente ou suivante sans fermer le panneau de tâche.** Deux petites flèches en haut du panneau de tâche (ou J / K, ↑ / ↓) ouvrent la tâche précédente ou suivante de la liste d'où vous venez, même après en avoir cochée ou déplacée.

🆕 **Glissez plusieurs tâches sélectionnées d'un coup.** Sélectionnez des tâches avec ⌘-clic, puis glissez-en une : elles partent ensemble en pile avec leur nombre, et arrivent dans l'ordre de votre sélection.

🎨 **Les projets avec un point, une esperluette ou un emoji dans leur nom se choisissent maintenant dans la fenêtre de nouvelle tâche.** Choisir un `#projet` dans la liste marche toujours, même avec un point, une esperluette ou un emoji dans son nom. Un long « projet / section » est raccourci au lieu d'élargir la fenêtre.

🎨 **Des tâches sélectionnées côte à côte forment maintenant un seul bloc.** Comme dans Things, plutôt qu'une pile de pastilles séparées.

🐛 **Le repère du clavier et une tâche sélectionnée sont maintenant différents.** La tâche où se trouve le clavier a un contour, une tâche sélectionnée un fond coloré : vous voyez tout de suite quand vous en désélectionnez une.
