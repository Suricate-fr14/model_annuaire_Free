// Compléments éditoriaux des catégories les plus recherchées (formats de questions observés dans les recherches réelles :
// « combien coûte… », « X ou Y », « … ouvert actuellement », « est-ce remboursé », spécialités recherchées localement).
// Aucun tarif chiffré : seulement le fonctionnement des prix et des repères établis.

export interface CategoryExtra {
  /** Spécialités ou recherches associées, pour couvrir le vocabulaire des internautes. */
  subs?: string[];
  /** Comparaison fréquente : [question, réponse]. */
  vs?: [string, string];
  /** Comment se forme le prix. */
  cost?: string;
  /** Conseil en cas d'urgence ou de besoin immédiat. */
  urgent?: string;
  /** Formulations de la question « besoin immédiat » ({one} = « un plombier », {place} = « à <ville> et alentour »). */
  urgentQ?: string[];
  /** Prise en charge, remboursement. */
  refund?: string;
}

export const CATEGORY_EXTRAS: Record<string, CategoryExtra> = {
  plombiers: {
    subs: ['dépannage de fuite', 'débouchage', 'chauffe-eau', 'salle de bains', 'recherche de fuite'],
    cost: "Le prix dépend du déplacement, du temps passé et des pièces. Pour un dépannage, faites-vous annoncer le tarif avant l'intervention ; pour des travaux, un devis écrit est obligatoire au-delà d'un certain montant et toujours recommandé.",
    urgent: "En cas de fuite, coupez l'arrivée d'eau générale avant l'arrivée du plombier. Privilégiez un artisan local identifiable (adresse, SIRET) plutôt qu'un numéro trouvé sur un prospectus.",
  },
  electriciens: {
    subs: ['dépannage électrique', 'mise aux normes', 'tableau électrique', 'borne de recharge', 'domotique'],
    cost: "Le prix varie selon le diagnostic, la main-d'œuvre et le matériel. Demandez un devis détaillé, et pour une mise aux normes, l'attestation de conformité délivrée à la fin des travaux.",
    urgent: "En cas de panne, coupez le disjoncteur général et ne touchez pas aux fils dénudés. Les fiches de l'annuaire indiquent les horaires d'ouverture de chaque entreprise.",
  },
  serruriers: {
    subs: ['ouverture de porte', 'changement de serrure', 'porte blindée', 'reproduction de clés', 'coffre-fort'],
    cost: "Une ouverture de porte se facture selon le déplacement, l'heure (majoration la nuit et le week-end) et la technique utilisée. Demandez le prix total avant que le serrurier se déplace et refusez tout devis imprécis.",
    urgent: "Porte claquée ou clés perdues : contactez un serrurier local avec une adresse vérifiable, faites-vous confirmer le tarif par écrit (SMS ou email) et vérifiez la facture avant de payer.",
  },
  chauffagistes: {
    subs: ['pompe à chaleur', 'chaudière', 'climatisation', 'entretien annuel', 'plancher chauffant'],
    vs: ['Pompe à chaleur ou chaudière : que choisir ?', "Le choix dépend de l'isolation du logement, de la surface et du système existant. Un chauffagiste RGE peut réaliser une étude et vous orienter vers les aides disponibles pour les équipements les plus performants."],
    cost: "Le prix d'une installation dépend de la puissance, de l'équipement et des travaux annexes ; l'entretien annuel d'une chaudière est généralement proposé sous forme de contrat. Comparez plusieurs devis.",
  },
  couvreurs: { subs: ['réfection de toiture', 'zinguerie', 'démoussage', 'charpente', 'isolation des combles'] },
  peintres: { subs: ['peinture intérieure', 'ravalement de façade', 'papier peint', 'enduits décoratifs'] },
  menuisiers: { subs: ['fenêtres', 'portes', 'escaliers', 'placards sur mesure', 'agencement'] },
  renovation: {
    subs: ['rénovation complète', 'rénovation énergétique', 'salle de bains', 'cuisine', 'aménagement de combles'],
    vs: ['Entreprise générale ou artisans séparés ?', "Une entreprise générale coordonne tous les corps de métier et reste votre interlocuteur unique ; faire appel à des artisans séparés peut coûter moins cher mais demande de coordonner vous-même le chantier et les délais."],
  },
  'agences-immobilieres': {
    subs: ['vente de maison', 'appartement à vendre', 'location', 'estimation', 'gestion locative'],
    vs: ['Vendre par une agence ou par un notaire ?', "Une agence prend en charge la promotion, les visites et la négociation ; certains notaires proposent aussi un service de négociation immobilière. Dans les deux cas, comparez les honoraires et les services inclus."],
    cost: "Les honoraires d'agence sont libres mais doivent être affichés en vitrine et sur le site de l'agence ; ils sont généralement exprimés en pourcentage du prix de vente.",
  },
  notaires: {
    subs: ['achat immobilier', 'succession', 'donation', 'testament', 'contrat de mariage', 'PACS'],
    vs: ['PACS : notaire ou mairie ?', "Le PACS peut être enregistré gratuitement en mairie, ou chez un notaire qui rédige alors une convention sur mesure, moyennant des frais. Le notaire est utile si vous souhaitez organiser précisément la gestion de vos biens."],
    cost: "Les « frais de notaire » d'un achat immobilier comprennent surtout des taxes reversées à l'État ; la rémunération du notaire pour les actes courants est fixée par un tarif réglementé.",
  },
  avocats: {
    subs: ['droit de la famille', 'divorce', 'droit du travail', 'droit pénal', 'droit immobilier', 'droit des affaires'],
    cost: "Les honoraires sont libres et fixés dans une convention d'honoraires écrite : au temps passé, au forfait, parfois avec un complément de résultat. Votre assurance (protection juridique) peut prendre en charge une partie des frais.",
    refund: "Selon vos ressources, l'aide juridictionnelle peut prendre en charge tout ou partie des honoraires ; des consultations gratuites sont aussi proposées dans les points-justice.",
  },
  'experts-comptables': {
    vs: ['Comptable ou expert-comptable ?', "Seul un expert-comptable inscrit à l'Ordre peut tenir et présenter les comptes d'une entreprise en toute indépendance ; un comptable salarié travaille au sein d'une entreprise ou d'un cabinet."],
    cost: "Les honoraires dépendent du volume d'écritures, de la forme juridique et des missions (comptabilité, social, juridique) ; ils sont précisés dans la lettre de mission.",
  },
  garages: {
    subs: ['entretien et vidange', 'freinage', 'pneus', 'diagnostic électronique', 'climatisation auto', 'contrôle technique'],
    cost: "Le prix d'une réparation dépend des pièces et du temps de main-d'œuvre, souvent calculé selon un barème constructeur. Demandez un devis avant les réparations importantes.",
  },
  carrosseries: { subs: ['débosselage', 'peinture automobile', 'remplacement de pare-brise', 'réparation après sinistre'] },
  'auto-ecoles': {
    subs: ['permis B', 'conduite accompagnée', 'permis moto', 'code de la route', 'boîte automatique'],
    cost: "Le prix dépend du forfait (code, nombre d'heures de conduite) et du tarif de l'heure supplémentaire. Le permis peut être financé en partie par le CPF si l'auto-école est certifiée.",
  },
  'taxis-vtc': { subs: ['transport vers la gare', "transfert vers l'aéroport", 'transport médical conventionné', 'trajets longue distance'], urgentQ: ['Comment réserver un taxi {place} ?', 'Taxi ou VTC pour la gare ou l\'aéroport : comment s\'organiser ?'], urgent: "Pour un départ tôt le matin ou un trajet vers une gare ou un aéroport, réservez la veille ; un taxi applique un tarif réglementé, un VTC annonce son prix à la réservation." },
  medecins: {
    subs: ['médecin généraliste', 'dermatologue', 'ophtalmologue', 'cardiologue', 'gynécologue', 'pédiatre', 'ORL'],
    refund: "Les consultations sont remboursées par l'Assurance maladie dans le parcours de soins coordonnés (via le médecin traitant) ; les dépassements d'honoraires du secteur 2 peuvent être pris en charge par votre complémentaire santé.",
    urgent: "En dehors des heures d'ouverture des cabinets, appelez la permanence de soins ou le 15 en cas d'urgence vitale.",
  },
  dentistes: {
    subs: ['soins dentaires', 'orthodontie', 'implants', 'blanchiment', 'urgence dentaire'],
    vs: ['Dent de sagesse : dentiste ou stomatologue ?', "Un dentiste peut extraire la plupart des dents de sagesse ; il oriente vers un stomatologue ou un chirurgien maxillo-facial pour les extractions complexes."],
    urgent: "Dent cassée ou douleur intense : appelez votre dentiste, qui réserve souvent des créneaux d'urgence ; le week-end, une permanence dentaire est organisée dans le département.",
    refund: "Les soins courants sont remboursés par l'Assurance maladie ; pour les prothèses, l'offre « 100 % Santé » permet un reste à charge nul sur une sélection de couronnes et de bridges.",
  },
  kinesitherapeutes: {
    subs: ['rééducation', 'kiné du sport', 'kiné respiratoire', 'kiné à domicile', 'drainage'],
    vs: ['Kiné ou ostéopathe ?', "Le kinésithérapeute rééduque sur prescription médicale, avec des séances remboursées ; l'ostéopathe intervient sans prescription, en séances généralement non remboursées par l'Assurance maladie. Pour une douleur persistante, consultez d'abord votre médecin."],
    refund: "Les séances prescrites par un médecin sont remboursées par l'Assurance maladie, le complément par votre mutuelle.",
  },
  osteopathes: {
    vs: ['Ostéopathe ou chiropracteur ?', "Les deux titres sont réglementés et prennent en charge les troubles fonctionnels de l'appareil locomoteur, avec des techniques différentes. Dans les deux cas, les séances ne sont pas remboursées par l'Assurance maladie, mais souvent par les complémentaires santé."],
    refund: "Les séances d'ostéopathie ne sont pas remboursées par l'Assurance maladie ; de nombreuses mutuelles prennent en charge un nombre de séances par an.",
  },
  psychologues: {
    subs: ['thérapie individuelle', 'thérapie de couple', 'psychologue pour enfant', 'thérapie cognitive et comportementale', 'bilan psychologique'],
    vs: ['Psychologue ou psychiatre ?', "Le psychiatre est un médecin : il pose un diagnostic médical, peut prescrire des médicaments et ses consultations sont remboursées. Le psychologue accompagne par la parole et des thérapies, sans prescription."],
    refund: "Le dispositif national permet un remboursement de séances chez un psychologue partenaire, sur orientation d'un médecin ; certaines mutuelles remboursent aussi des consultations.",
  },
  pharmacies: {
    subs: ['pharmacie de garde', 'parapharmacie', 'orthopédie', 'vaccination', 'matériel médical'],
    urgentQ: ['Comment trouver une pharmacie de garde {place} ?', 'Quelle pharmacie est ouverte aujourd\'hui {place} ?'],
    urgent: "La nuit, le dimanche et les jours fériés, une pharmacie de garde est assurée dans chaque secteur : le service de garde (numéro 3237 ou site dédié) vous indique la plus proche. En journée, vérifiez les horaires sur la fiche de chaque officine.",
  },
  opticiens: {
    subs: ['lunettes de vue', 'lentilles', 'verres progressifs', 'lunettes de soleil', 'aides auditives'],
    vs: ['Un opticien peut-il adapter ma correction ?', "Un opticien peut, sous conditions, renouveler et adapter des lunettes à partir d'une ordonnance en cours de validité ; un examen chez l'ophtalmologiste reste nécessaire pour un premier équipement ou en cas de gêne."],
    refund: "L'offre « 100 % Santé » permet d'obtenir des lunettes et des aides auditives sans reste à charge sur une sélection d'équipements ; pour les autres, le remboursement dépend de votre complémentaire.",
  },
  veterinaires: {
    subs: ['chiens et chats', 'NAC', 'chirurgie', 'vaccination', 'urgences vétérinaires'],
    urgent: "En dehors des horaires, les cliniques vétérinaires organisent une garde : appelez votre vétérinaire, son répondeur indique le numéro d'urgence.",
    cost: "Les tarifs vétérinaires sont libres ; demandez un devis pour une chirurgie, et renseignez-vous sur les assurances santé animale.",
  },
  coiffeurs: { subs: ['coupe femme', 'coupe homme', 'coloration', 'balayage', 'coiffure de mariage', 'coiffeur à domicile'] },
  barbiers: { subs: ['taille de barbe', 'rasage traditionnel', 'dégradé', 'soins de la barbe'] },
  spas: {
    subs: ['massage relaxant', 'head spa', 'hammam', 'sauna', 'soin du visage', 'spa en duo'],
    vs: ['Massage bien-être ou kinésithérapie ?', "Un massage de bien-être vise la détente, sans visée thérapeutique ; un massage médical relève du kinésithérapeute, sur prescription."],
  },
  instituts: { subs: ['épilation', 'soin du visage', 'manucure', 'beauté du regard', 'soins du corps'] },
  restaurants: {
    subs: ['pizzerias', 'brunchs', 'crêperies', 'restaurants italiens', 'cuisine asiatique', 'restaurants gastronomiques', 'cuisine régionale'],
    urgentQ: ['Comment trouver {one} ouvert ce soir {place} ?', 'Comment savoir si {one} est ouvert maintenant ?'],
    urgent: "Pour trouver une table ce soir, vérifiez sur chaque fiche l'indication « ouvert maintenant » et les horaires de service, puis réservez par téléphone.",
  },
  'fast-food': { subs: ['kebabs', 'burgers', 'tacos', 'pizzas à emporter', 'sandwicheries', 'livraison'] },
  'bars-cafes': { subs: ['bars à cocktails', 'cafés avec terrasse', 'pubs', 'salons de thé', 'brunchs'] },
  boulangeries: {
    subs: ['pain au levain', 'pâtisseries', 'viennoiseries', 'gâteaux sur commande', 'boulangerie bio'],
    urgentQ: ['Quelles boulangeries sont ouvertes le dimanche {place} ?', 'Comment trouver une boulangerie ouverte maintenant {place} ?'],
    urgent: "Le dimanche et pendant les congés d'été, toutes les boulangeries ne sont pas ouvertes : vérifiez l'indication « ouvert maintenant » sur chaque fiche avant de vous déplacer.",
  },
  traiteurs: { subs: ['mariage', 'buffet', "repas d'entreprise", 'cocktail dînatoire', 'chef à domicile'] },
  fleuristes: { subs: ['bouquets', 'fleurs de mariage', 'compositions de deuil', 'livraison de fleurs', 'plantes'] },
  'depot-vente': { subs: ['friperies', 'vêtements de seconde main', 'meubles d’occasion', 'dépôt-vente enfant', 'brocante'] },
  hotels: { subs: ['hôtel en centre-ville', 'hôtel près de la gare', 'hôtel avec parking', 'hôtel près des sites touristiques', 'séjour d’affaires'] },
  campings: { subs: ['camping en bord de mer', 'mobil-homes', 'emplacements', 'camping avec piscine'] },
  guides: { subs: ['visites guidées de la ville', 'sites historiques', 'circuits dans la région', 'visites privées', 'activités en famille'] },
  'escape-games': { subs: ['escape game en équipe', 'jeux immersifs', 'anniversaire', 'team building'] },
  'karting-bowling': { subs: ['karting', 'bowling', 'laser game', 'anniversaire enfant', 'sortie entre amis'] },
  'location-vehicules': { subs: ['location de voiture', 'location utilitaire', 'location à la gare', 'location longue durée'] },
  demenageurs: {
    vs: ['Déménageur ou location de camion ?', "Un déménageur prend en charge l'emballage, le transport et l'assurance des biens ; la location d'un utilitaire coûte moins cher mais tout repose sur vous. Une formule intermédiaire existe souvent (transport seul, avec chargement par vos soins)."],
    cost: "Le prix dépend du volume, de la distance, des accès (étages, ascenseur, stationnement) et des services choisis : un devis après visite est le plus fiable.",
  },
  'salles-de-sport': { subs: ['musculation', 'cours collectifs', 'cross-training', 'salle ouverte 7j/7', 'coaching'] },
  creches: {
    vs: ['Crèche ou assistante maternelle ?', "La crèche accueille les enfants en collectivité avec une équipe de professionnels ; l'assistante maternelle agréée garde quelques enfants à son domicile, avec plus de souplesse d'horaires. Les deux ouvrent droit à des aides de la CAF."],
  },
  'pompes-funebres': {
    subs: ['organisation des obsèques', 'contrat obsèques', 'transport du défunt', 'crémation', 'marbrerie'],
    cost: "Les pompes funèbres doivent remettre un devis au format normalisé : comparez-en plusieurs, vous êtes libre de choisir l'opérateur.",
  },
  'agences-de-voyages': { subs: ['séjours', 'circuits', 'voyages de noces', 'voyages de groupe', 'billetterie'] },
  photographes: { subs: ['photographe de mariage', 'portrait', 'photo corporate', 'packshot', 'shooting famille'] },
  'organismes-formation': { subs: ['formation éligible au CPF', 'formation en alternance', 'formations certifiantes', 'formation à distance'] },
  'aide-domicile': { subs: ['aide aux seniors', 'ménage à domicile', 'aide aux repas', 'accompagnement', 'garde de nuit'] },
};
