// Guides éditoriaux des pages univers : règles, droits et repères établis, valables partout en France.
// Ajoutez ici des repères propres à votre ville (marchés, lieux de sortie, sites à visiter…), vérifiés.
// Aucun tarif ni chiffre local : les chiffres de la page sont calculés sur les fiches. Chaque entrée : [intertitre, paragraphe].

export const UNIVERSE_GUIDES: Record<string, [string, string][]> = {
  gastronomie: [
    ['Ce que les restaurants doivent afficher', "Les prix doivent être affichés à l'extérieur pendant le service ; l'information sur les 14 allergènes majeurs est obligatoire ; la mention « fait maison » signale les plats cuisinés sur place à partir de produits bruts. Une carafe d'eau est gratuite avec un repas, et vous pouvez demander à emporter vos restes."],
    ['Circuits courts', "Les producteurs, fromagers, primeurs et marchés référencés dans l'annuaire permettent d'acheter local, de saison et au plus près des producteurs."],
  ],
  commerce: [
    ['Vos droits en magasin', "Un article neuf acheté à un professionnel bénéficie de la garantie légale de conformité pendant 2 ans ; un article d'occasion vendu par un professionnel est lui aussi couvert. En boutique, l'échange ou le remboursement d'un article qui vous plaît moins n'est pas obligatoire : c'est un geste commercial dont les conditions doivent être affichées. Achat en ligne : 14 jours pour vous rétracter."],
    ['Prix et promotions', "Un prix barré doit se référer au prix le plus bas pratiqué dans les 30 jours précédant la réduction. Les soldes ont lieu deux fois par an, en hiver et en été, à des dates fixées nationalement."],
    ['Ouverture le dimanche', "Les commerces alimentaires peuvent ouvrir le dimanche jusqu'à 13 heures ; pour les autres, l'ouverture dépend de dérogations. Les horaires du dimanche sont indiqués sur les fiches quand ils sont connus, et les repères ci-dessus montrent qui ouvre ce jour-là."],
    ['Réparer plutôt que racheter', "L'indice de réparabilité affiché sur de nombreux appareils aide à comparer, et le bonus réparation réduit la facture chez les réparateurs labellisés QualiRépar. Cordonniers, dépôts-ventes et boutiques de seconde main de l'annuaire prolongent aussi la vie des objets."],
  ],
  beaute: [
    ['Des métiers qualifiés', "Ouvrir un salon de coiffure ou un institut de beauté suppose un diplôme professionnel (brevet professionnel en coiffure, CAP au minimum en esthétique) ou la présence d'une personne qualifiée. Les prix des principales prestations doivent être affichés, à l'extérieur comme à l'intérieur."],
    ['Avant un soin ou une coloration', "Signalez allergies, grossesse ou traitement en cours. Les fabricants recommandent un test de tolérance avant une coloration, et un tatoueur doit respecter des règles d'hygiène et de formation spécifiques : n'hésitez pas à poser la question."],
    ['Réserver', "Le samedi est souvent le jour le plus demandé : réservez à l'avance, et consultez sur les fiches les jours de fermeture, fréquents le lundi dans ces métiers."],
  ],
  sante: [
    ['Urgences et gardes', "Urgence vitale : 15 (Samu) ou 112 ; 114 par SMS pour les personnes sourdes ou malentendantes. Le soir et le week-end, le 15 oriente vers le médecin de garde. Pour trouver une pharmacie de garde, appelez le 3237."],
    ['Remboursement', "Déclarer un médecin traitant améliore le remboursement des consultations. En secteur 1, le praticien applique les tarifs de l'Assurance maladie ; en secteur 2, il peut pratiquer des dépassements, affichés en salle d'attente. Kinésithérapie et la plupart des soins paramédicaux sont pris en charge sur prescription."],
    ['Médecines douces', "Naturopathie, sophrologie ou réflexologie ne sont pas des professions de santé réglementées et ne sont pas remboursées par l'Assurance maladie ; certaines complémentaires les prennent partiellement en charge. Elles ne remplacent pas un avis médical."],
  ],
  batiment: [
    ['Avant de signer', "Demandez au moins deux devis détaillés (matériaux, main-d'œuvre, délais) et l'attestation d'assurance décennale en cours de validité. Un contrat signé chez vous, après démarchage, peut être annulé sous 14 jours."],
    ['Rénovation énergétique', "Pour bénéficier de MaPrimeRénov' et des certificats d'économies d'énergie, l'entreprise doit être qualifiée RGE pour les travaux concernés. Le démarchage téléphonique pour la rénovation énergétique est interdit : méfiez-vous des appels qui se présentent comme « mandatés par l'État »."],
    ['Dépannage', "Plomberie, serrurerie, électricité : faites-vous annoncer le prix avant l'intervention, préférez un artisan local identifiable (adresse, SIRET) et exigez une facture détaillée."],
  ],
  maison: [
    ['Services à domicile', "Ménage, jardinage, petits travaux : les services à la personne ouvrent droit à un crédit d'impôt de 50 % des sommes versées, dans la limite d'un plafond annuel, si le prestataire est déclaré pour ces activités."],
    ['Aménagement et décoration', "Pour une cuisine, une salle de bains ou du mobilier sur mesure, faites préciser dans le devis la fourniture, la pose, les délais de fabrication et les garanties. Demandez à voir des réalisations récentes."],
  ],
  auto: [
    ['Entretien et réparation', "Vous pouvez faire entretenir votre véhicule dans le garage de votre choix, même pendant la garantie constructeur, en respectant le carnet d'entretien. Le garagiste doit proposer des pièces de réemploi pour certaines réparations et remettre une facture détaillée."],
    ['Contrôle technique', "Une voiture passe son premier contrôle technique dans les 6 mois précédant ses 4 ans, puis tous les 2 ans. Les deux-roues motorisés y sont désormais soumis eux aussi."],
    ['Permis de conduire', "Le permis B peut être financé avec le CPF dans une auto-école enregistrée ; la conduite accompagnée est possible dès 15 ans."],
  ],
  immobilier: [
    ['Agences et honoraires', "Une agence doit détenir une carte professionnelle (« transaction » pour la vente, « gestion » pour la location) et afficher son barème d'honoraires en vitrine et en ligne. En location, les frais facturés au locataire sont plafonnés."],
    ['Diagnostics et performance énergétique', "Vente comme location exigent un dossier de diagnostics, dont le DPE. Les logements classés G ne peuvent plus être proposés à la location dans un nouveau bail depuis le 1er janvier 2025, et le calendrier se poursuit pour la classe F."],
  ],
  sport: [
    ['Choisir une activité', "Demandez une séance d'essai, renseignez-vous sur l'encadrement (les éducateurs rémunérés doivent être diplômés ou certifiés) et sur les créneaux. Les jeunes éligibles peuvent bénéficier du Pass'Sport, aide de l'État pour l'inscription en club."],
    ['Abonnements', "Lisez la durée d'engagement et les conditions de résiliation : un abonnement souscrit en ligne doit pouvoir être résilié en ligne, en quelques clics."],
  ],
  tourisme: [
    ['Réserver', "Réservez tôt en été et pendant les grands événements de la ville. Le classement en étoiles porte sur les équipements et services ; une taxe de séjour fixée par la collectivité s'ajoute au prix de la nuitée."],
  ],
  sorties: [
    ['Avant de sortir', "Vérifiez les horaires, notamment tard le soir, et réservez les activités de groupe (escape game, bowling, karting) le week-end et pendant les vacances scolaires."],
  ],
  famille: [
    ['Garde d\'enfants', "Les assistantes maternelles sont agréées par le service de PMI du Département. Les frais de garde d'un enfant de moins de 6 ans hors du domicile ouvrent droit à un crédit d'impôt, et la CAF verse sous conditions le complément de libre choix du mode de garde."],
    ['Seniors', "L'allocation personnalisée d'autonomie (APA), versée par le Département, aide à financer l'aide à domicile ou l'hébergement en établissement. Les services à la personne déclarés ouvrent droit au crédit d'impôt de 50 %."],
  ],
  animaux: [
    ['Obligations', "L'identification des chiens et des chats est obligatoire ; pour voyager à l'étranger, vaccination antirabique et passeport européen sont exigés. Une pension ou un éducateur doivent justifier des qualifications requises pour accueillir des animaux."],
    ['Urgences', "Repérez à l'avance le service de garde de votre vétérinaire : le répondeur de la clinique indique en général le numéro à appeler la nuit et le week-end."],
  ],
  'droit-finance': [
    ['Avocats, notaires, commissaires de justice', "Un avocat doit conclure une convention d'honoraires écrite. Les tarifs des notaires et des commissaires de justice sont réglementés pour la plupart de leurs actes. Des consultations juridiques gratuites existent dans les points-justice et maisons de justice et du droit."],
    ['Assurance, crédit, patrimoine', "Courtiers et conseillers doivent être immatriculés à l'ORIAS (registre consultable en ligne). Comparez les offres et demandez par écrit le mode de rémunération du conseiller."],
  ],
  evenementiel: [
    ['Organiser un événement', "Pour un mariage ou une fête, réservez la salle et les prestataires principaux longtemps à l'avance, surtout pour les samedis de mai à septembre. Demandez des devis détaillés (prestations incluses, horaires, acompte, conditions d'annulation) et visitez les lieux."],
  ],
};
