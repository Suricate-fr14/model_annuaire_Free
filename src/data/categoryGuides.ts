// Guides éditoriaux des catégories les plus consultées : règles, usages et repères établis (réglementation, labels,
// appellations). Aucun tarif ni chiffre local : ceux-ci sont calculés sur les fiches.
// Chaque entrée : [intertitre, paragraphe]. Le conseil de choix (categoryTips) ouvre toujours le guide.

export const CATEGORY_GUIDES: Record<string, [string, string][]> = {
  restaurants: [
    ['Ce que le restaurant doit vous indiquer', "Les prix des menus et de la carte doivent être affichés à l'extérieur pendant le service. Le restaurant doit pouvoir vous renseigner sur la présence des 14 allergènes majeurs dans chaque plat, et la mention « fait maison » signale les plats cuisinés sur place à partir de produits bruts."],
    ['Bon à savoir', "Une carafe d'eau est servie gratuitement avec un repas. Vous pouvez demander à emporter ce que vous n'avez pas terminé : les restaurants doivent fournir un contenant sur demande. Le week-end et pendant les grands événements, la réservation reste le moyen le plus sûr d'avoir une table."],
  ],
  'fast-food': [
    ['Sur place, à emporter ou livré', "Les fiches précisent quand l'établissement propose la vente à emporter ou la livraison. Pour un repas rapide le midi, l'indication « ouvert maintenant » et les horaires détaillés évitent de trouver porte close entre deux services."],
    ['Allergènes et composition', "Comme tout établissement de restauration, la restauration rapide doit pouvoir vous informer sur les 14 allergènes majeurs présents dans ses produits. N'hésitez pas à demander la composition d'un plat en cas d'allergie ou de régime particulier."],
    ['Titres-restaurant', "Beaucoup d'établissements acceptent les titres-restaurant, en papier ou en carte. Les conditions d'acceptation restent propres à chaque commerce : vérifiez-les avant de commander."],
  ],
  'bars-cafes': [
    ['Règles à connaître', "La vente d'alcool est interdite aux mineurs. Pendant les « happy hours », l'établissement doit aussi proposer des boissons sans alcool à prix réduit. Il est interdit de fumer à l'intérieur ; certains bars disposent d'une terrasse, signalée sur leur fiche."],
    ['Pour quel moment ?', "Café du matin, déjeuner rapide, apéritif ou soirée : les horaires d'ouverture varient beaucoup d'un établissement à l'autre. Les fiches indiquent l'heure de fermeture et l'ouverture le dimanche, quand elles sont connues."],
  ],
  boulangeries: [
    ['Boulanger : une appellation protégée', "Seul un professionnel qui pétrit, façonne et cuit son pain sur place peut utiliser l'appellation « boulanger » ou l'enseigne « boulangerie ». Le « pain de tradition française » est fabriqué sans additif et sans surgélation."],
    ['Ouverture le dimanche et jour de fermeture', "Beaucoup de boulangeries ferment un jour par semaine, souvent différent d'un quartier à l'autre, et certaines ouvrent le dimanche matin. Les repères chiffrés de cette page, calculés sur les horaires renseignés, vous aident à trouver celle qui est ouverte."],
    ['Commandes', "Pour une pièce montée, un gâteau d'anniversaire ou une grande quantité de pain, commandez quelques jours à l'avance, et plus tôt encore à l'approche des fêtes et pour les galettes des rois en janvier."],
  ],
  mode: [
    ['Échanges et remboursements', "En magasin, l'échange ou le remboursement d'un article qui ne vous convient pas n'est pas une obligation légale : c'est un geste commercial, dont les conditions doivent être affichées. Gardez votre ticket. En ligne, vous disposez en revanche d'un délai de rétractation de 14 jours."],
    ['Soldes et promotions', "Les soldes ont lieu deux fois par an, en hiver et en été, à des dates fixées nationalement. Un prix barré doit faire référence au prix le plus bas pratiqué dans les 30 jours précédant la réduction."],
    ['Seconde main', "Pour des vêtements de seconde main ou des pièces vintage, consultez aussi la catégorie dépôts-ventes et friperies de l'annuaire."],
  ],
  coiffeurs: [
    ['Prix et prestations', "Le salon doit afficher les prix TTC de ses principales prestations, à l'extérieur comme à l'intérieur. Faites préciser le tarif d'une coloration, d'un balayage ou d'un soin selon la longueur de vos cheveux avant de commencer."],
    ['Un métier réglementé', "Pour ouvrir et diriger un salon de coiffure, il faut un diplôme de coiffure de niveau brevet professionnel, ou la présence d'un coiffeur qualifié dans l'équipe. Les coiffeurs à domicile doivent eux aussi être qualifiés."],
    ['Colorations', "Les fabricants recommandent un test de tolérance avant toute coloration, surtout pour une première fois : signalez toute réaction passée à votre coiffeur."],
  ],
  barbiers: [
    ['Un métier de la coiffure', "Le barbier exerce un métier réglementé, rattaché à la coiffure : la direction du salon suppose une qualification professionnelle. Les prix des prestations doivent être affichés."],
    ['Sur rendez-vous ou sans ?', "Certains barbiers travaillent uniquement sur rendez-vous, d'autres acceptent les clients sans réservation : la fiche et les horaires vous évitent une attente inutile, notamment le samedi."],
  ],
  instituts: [
    ['Une profession qualifiée', "L'exploitation d'un institut de beauté suppose une qualification en esthétique (au minimum un CAP) ou la présence d'une personne qualifiée. Les tarifs des soins doivent être affichés."],
    ['Avant un soin', "Signalez vos allergies, une grossesse ou un traitement en cours ; pour une épilation définitive ou un soin technique, demandez quel appareil est utilisé et par qui."],
  ],
  pharmacies: [
    ['Pharmacie de garde', "La nuit, le dimanche et les jours fériés, une pharmacie de garde assure le service : le numéro 3237 ou le site 3237.fr indiquent la plus proche. Une ordonnance peut être demandée pour les délivrances de nuit."],
    ['Ce que la pharmacie peut faire', "En plus de la délivrance de médicaments, de nombreuses pharmacies proposent la vaccination, des tests de dépistage et des entretiens de suivi. Avec la carte Vitale et une complémentaire, vous n'avancez généralement pas les frais des médicaments remboursables."],
  ],
  medecins: [
    ['Médecin traitant', "Déclarer un médecin traitant auprès de l'Assurance maladie vous garantit un meilleur remboursement des consultations et un suivi coordonné. Le choix est libre et peut être modifié."],
    ['Secteur et dépassements', "Un médecin conventionné de secteur 1 applique les tarifs de l'Assurance maladie ; en secteur 2, il peut pratiquer des dépassements d'honoraires, qui doivent être affichés dans la salle d'attente."],
    ['Le soir et le week-end', "En dehors des heures d'ouverture des cabinets, appelez le 15 : le régulateur vous oriente vers un médecin de garde ou les urgences. En cas d'urgence vitale, appelez directement le 15 ou le 112."],
  ],
  dentistes: [
    ['Devis et remboursements', "Les soins courants (consultation, détartrage, carie) sont remboursés par l'Assurance maladie. Pour une prothèse, le dentiste doit vous remettre un devis ; l'offre « 100 % santé » propose des couronnes et des prothèses sans reste à charge avec une complémentaire responsable."],
    ['Urgence dentaire', "Le week-end et les jours fériés, un chirurgien-dentiste de garde peut être joint : appelez le 15, qui vous orientera."],
  ],
  kinesitherapeutes: [
    ['Prescription et prise en charge', "Sur prescription médicale, les séances de kinésithérapie sont prises en charge par l'Assurance maladie et votre complémentaire. Vérifiez si le praticien est conventionné et s'il pratique des dépassements."],
    ['Spécialités', "Rééducation après une opération ou une blessure sportive, kinésithérapie respiratoire, rééducation périnéale, drainage : les fiches précisent souvent les spécialités et le déplacement à domicile."],
  ],
  opticiens: [
    ['Ordonnance et renouvellement', "Pour être remboursé, il faut une ordonnance en cours de validité. L'opticien peut, sous conditions, adapter la correction de vos lunettes à partir d'une ordonnance récente, sans nouveau rendez-vous chez l'ophtalmologiste."],
    ['100 % santé', "Tout opticien doit proposer une offre de lunettes « 100 % santé », sans reste à charge avec une complémentaire responsable, et vous remettre un devis détaillé avant l'achat."],
  ],
  garages: [
    ['Libre choix du garage', "Même pendant la garantie constructeur, vous pouvez faire entretenir votre véhicule dans le garage de votre choix, à condition de respecter le carnet d'entretien et d'utiliser des pièces de qualité équivalente."],
    ['Devis, pièces et facture', "Demandez un devis avant les réparations importantes. Le garagiste doit vous proposer des pièces de réemploi pour certaines réparations et vous remettre une facture détaillée, pièces et main-d'œuvre séparées."],
  ],
  'agences-immobilieres': [
    ['Carte professionnelle', "Une agence immobilière doit détenir une carte professionnelle délivrée par la CCI (mention « transaction » pour la vente, « gestion » pour la location et la gestion), dont le numéro figure sur ses documents."],
    ['Honoraires', "Le barème des honoraires doit être affiché en vitrine et sur le site de l'agence. En location, les frais facturés au locataire sont plafonnés par la loi."],
  ],
  supermarches: [
    ['Ouverture le dimanche', "Les commerces alimentaires peuvent ouvrir le dimanche jusqu'à 13 heures ; au-delà, l'ouverture dépend de dérogations. Les horaires du dimanche sont indiqués sur les fiches quand ils sont connus."],
    ['Drive et livraison', "De nombreux magasins proposent le retrait de commandes passées en ligne ou la livraison à domicile : consultez les services signalés sur chaque fiche."],
  ],
  fleuristes: [
    ["Commander à l'avance", "Pour un mariage, un deuil, la Saint-Valentin, la fête des mères ou la Toussaint, commandez plusieurs jours à l'avance : la demande est très forte ces jours-là."],
    ['Livraison', "La plupart des fleuristes livrent localement ; pour un envoi dans une autre ville, demandez s'ils travaillent avec un réseau de transmission florale."],
  ],
  hotels: [
    ['Classement et taxe de séjour', "Le classement de 1 à 5 étoiles est attribué selon un référentiel national ; il porte sur les équipements et les services. Une taxe de séjour, fixée par la collectivité, s'ajoute au prix de la chambre."],
    ['Réserver', "Réservez tôt en haute saison et pendant les grands événements, et comparez les conditions d'annulation."],
  ],
  boucheries: [
    ['Origine des viandes', "L'origine de la viande bovine doit être affichée en boutique. Les labels (Label rouge, AOP, IGP) garantissent un mode d'élevage ou une provenance."],
  ],
  cavistes: [
    ['Règles', "La vente d'alcool est interdite aux mineurs. Beaucoup de cavistes organisent des dégustations et préparent des coffrets cadeaux sur commande."],
  ],
  primeurs: [
    ['Origine et saison', "L'origine des fruits et légumes doit être indiquée sur l'étiquette. Acheter de saison et auprès de producteurs proches garantit fraîcheur et goût."],
  ],
  veterinaires: [
    ['Urgences', "En dehors des horaires d'ouverture, un service de garde vétérinaire prend le relais : le répondeur de votre clinique indique généralement le numéro à joindre. Repérez-le avant d'en avoir besoin."],
    ['Obligations', "L'identification des chiens et des chats (puce électronique) est obligatoire. Pour voyager à l'étranger avec votre animal, la vaccination contre la rage et un passeport européen sont exigés."],
  ],
  'tabac-presse': [
    ['Services de proximité', "Au-delà du tabac et de la presse, de nombreux buralistes proposent les jeux, le relais colis, la recharge de cartes et le paiement de proximité (impôts, amendes, factures publiques)."],
    ['Règles', "La vente de tabac et de produits du vapotage est interdite aux mineurs."],
  ],
  librairies: [
    ['Prix unique du livre', "Le prix d'un livre neuf est fixé par l'éditeur : il est le même en librairie, en grande surface et en ligne, avec une remise maximale de 5 %. Commander en librairie ne coûte donc pas plus cher."],
    ['Commandes et conseils', "Une librairie peut commander tout livre disponible, souvent en quelques jours. Rencontres d'auteurs et dédicaces y sont fréquentes."],
  ],
  'salles-de-sport': [
    ["Avant de s'abonner", "Demandez une séance d'essai, lisez la durée d'engagement et les conditions de résiliation. Un abonnement souscrit en ligne doit pouvoir être résilié en ligne, en quelques clics."],
    ['Encadrement', "Les coachs qui encadrent contre rémunération doivent être titulaires d'un diplôme ou d'une certification reconnus. Demandez les créneaux de cours collectifs et les horaires d'affluence."],
  ],
  'auto-ecoles': [
    ['Comparer les auto-écoles', "Demandez le prix de l'heure de conduite, le forfait proposé et le délai moyen pour passer l'examen. Le label « qualité des formations au sein des écoles de conduite » distingue les établissements engagés dans une démarche qualité."],
    ['Financer son permis', "Le permis B peut être financé avec le CPF dans une auto-école enregistrée ; la conduite accompagnée est possible dès 15 ans."],
  ],
  bijouteries: [
    ['Garanties', "Les bijoux en or, en argent et en platine portent un poinçon qui garantit le titre du métal. Demandez une facture détaillée (métal, poids, pierres) pour l'assurance et une éventuelle revente."],
    ['Réparations', "Mise à taille, changement de pile, nettoyage, réparation de chaîne : beaucoup de bijouteries et d'horlogeries assurent ces travaux en atelier."],
  ],
};
