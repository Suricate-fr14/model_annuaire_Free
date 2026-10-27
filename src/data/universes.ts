// Arborescence de l'annuaire : univers → catégories.
// Les slugs de catégorie sont uniques sur tout le site : un profil référence directement le sien (`category`).

export interface Category { slug: string; name: string }
export interface Universe { slug: string; name: string; description: string; hue: number; categories: Category[] }

const c = (slug: string, name: string): Category => ({ slug, name });

export const universes: Universe[] = [
  {
    slug: 'batiment', name: 'Artisans du bâtiment', hue: 25,
    description: 'Plombiers, électriciens, menuisiers, couvreurs : les artisans pour construire, rénover et dépanner.',
    categories: [
      c('plombiers', 'Plombiers'), c('electriciens', 'Électriciens'), c('chauffagistes', 'Chauffagistes et climatisation'),
      c('menuisiers', 'Menuisiers et ébénistes'), c('macons', 'Maçons'), c('couvreurs', 'Couvreurs et charpentiers'),
      c('peintres', 'Peintres en bâtiment'), c('serruriers', 'Serruriers'), c('carreleurs', 'Carreleurs et poseurs de sols'),
      c('renovation', 'Entreprises de rénovation'),
      c('architectes', "Architectes et maîtres d'œuvre"),
    ],
  },
  {
    slug: 'maison', name: 'Maison, décoration et jardin', hue: 95,
    description: "Décorateurs, paysagistes, cuisinistes et services pour l'intérieur comme l'extérieur.",
    categories: [
      c('architectes-interieur', "Architectes d'intérieur"), c('decoration', 'Décoration et ameublement'),
      c('paysagistes', 'Paysagistes et jardiniers'), c('cuisinistes', 'Cuisinistes et salles de bain'),
      c('piscines', 'Piscines et spas'), c('demenageurs', 'Déménageurs'), c('nettoyage', 'Nettoyage et ménage'),
      c('bricolage', 'Bricolage et quincaillerie'), c('jardineries', 'Jardineries'), c('pressing', 'Pressings et laveries'),
    ],
  },
  {
    slug: 'immobilier', name: 'Immobilier', hue: 210,
    description: 'Agences, gestion locative, diagnostics et promoteurs pour acheter, vendre ou louer.',
    categories: [
      c('agences-immobilieres', 'Agences immobilières'), c('chasseurs-immobiliers', 'Chasseurs immobiliers'),
      c('gestion-locative', 'Gestion locative'), c('syndics', 'Syndics de copropriété'),
      c('diagnostiqueurs', 'Diagnostiqueurs immobiliers'), c('promoteurs', 'Promoteurs et constructeurs'),
    ],
  },
  {
    slug: 'auto', name: 'Auto, moto et transports', hue: 0,
    description: 'Garages, carrosseries, auto-écoles et solutions de transport du quotidien.',
    categories: [
      c('garages', 'Garages et mécaniciens'), c('carrosseries', 'Carrosseries'), c('concessionnaires', 'Concessionnaires'),
      c('controle-technique', 'Contrôle technique'), c('auto-ecoles', 'Auto-écoles'),
      c('location-vehicules', 'Location de véhicules'), c('taxis-vtc', 'Taxis et VTC'), c('velos', 'Vélos et mobilité douce'),
      c('transports', 'Transports en commun et covoiturage'), c('aviation-nautisme', 'Aviation et nautisme'),
    ],
  },
  {
    slug: 'sante', name: 'Santé et bien-être', hue: 160,
    description: 'Professionnels de santé, thérapeutes et praticiens du bien-être près de chez vous.',
    categories: [
      c('medecins', 'Médecins généralistes et spécialistes'), c('dentistes', 'Dentistes et orthodontistes'),
      c('kinesitherapeutes', 'Kinésithérapeutes'), c('osteopathes', 'Ostéopathes'), c('psychologues', 'Psychologues et psychothérapeutes'),
      c('infirmiers', 'Infirmiers'), c('pharmacies', 'Pharmacies'), c('opticiens', 'Opticiens et audioprothésistes'),
      c('naturopathes', 'Naturopathes et sophrologues'), c('dieteticiens', 'Diététiciens et nutritionnistes'),
      c('laboratoires-analyses', "Laboratoires d'analyses médicales"), c('cliniques', 'Cliniques et centres de santé'),
    ],
  },
  {
    slug: 'beaute', name: 'Beauté et soins', hue: 330,
    description: 'Coiffeurs, instituts, barbiers et spas pour prendre soin de soi.',
    categories: [
      c('coiffeurs', 'Coiffeurs'), c('barbiers', 'Barbiers'), c('instituts', 'Instituts de beauté'),
      c('esthetique', 'Onglerie et maquillage'), c('spas', 'Spas et massages'), c('tatoueurs', 'Tatoueurs et pierceurs'),
    ],
  },
  {
    slug: 'sport', name: 'Sport et remise en forme', hue: 140,
    description: 'Coachs, salles, clubs et activités pour bouger, progresser et se dépasser.',
    categories: [
      c('coachs-sportifs', 'Coachs sportifs'), c('salles-de-sport', 'Salles de sport'), c('clubs-sportifs', 'Clubs et associations sportives'),
      c('yoga-pilates', 'Yoga et pilates'), c('danse', 'Écoles de danse'), c('plein-air', 'Activités de plein air'),
      c('arts-martiaux', 'Arts martiaux et sports de combat'),
    ],
  },
  {
    slug: 'gastronomie', name: 'Cuisine, vins et gastronomie', hue: 15,
    description: 'Restaurants, traiteurs, artisans des métiers de bouche et producteurs locaux.',
    categories: [
      c('restaurants', 'Restaurants'), c('fast-food', 'Restauration rapide'), c('bars-cafes', 'Bars et cafés'), c('traiteurs', 'Traiteurs et chefs à domicile'),
      c('boulangeries', 'Boulangeries et pâtisseries'), c('boucheries', 'Boucheries et charcuteries'),
      c('cavistes', 'Cavistes et domaines viticoles'), c('epiceries-fines', 'Épiceries fines'),
      c('producteurs', 'Producteurs locaux'),
      c('chocolatiers', 'Chocolatiers et confiseurs'), c('glaciers', 'Glaciers'), c('primeurs', 'Primeurs et fromagers'), c('blogs-cuisine', 'Blogs et recettes'),
    ],
  },
  {
    slug: 'commerce', name: 'Commerces et boutiques', hue: 45,
    description: 'Boutiques physiques et e-commerces : mode, cadeaux, fleurs, livres et high-tech.',
    categories: [
      c('mode', 'Mode et accessoires'), c('bijouteries', 'Bijouteries et horlogeries'), c('fleuristes', 'Fleuristes'),
      c('librairies', 'Librairies et papeteries'), c('high-tech', 'High-tech et électroménager'),
      c('jouets', 'Jouets et puériculture'), c('animaleries', 'Animaleries'), c('e-commerce', 'Boutiques en ligne'),
      c('supermarches', 'Supermarchés et alimentation'), c('tabac-presse', 'Tabac, presse et vape'),
      c('sport-boutiques', 'Articles de sport'), c('cadeaux', 'Cadeaux et souvenirs'), c('cosmetiques', 'Parfumeries et cosmétiques'),
      c('bazars', 'Bazars et discount'), c('depot-vente', 'Dépôts-vente et seconde main'), c('cordonniers', 'Cordonniers et clés minute'),
    ],
  },
  {
    slug: 'tourisme', name: 'Tourisme et hébergement', hue: 190,
    description: 'Où dormir, quoi visiter, avec qui partir : hôtels, gîtes, guides et agences.',
    categories: [
      c('hotels', 'Hôtels'), c('gites', "Gîtes et chambres d'hôtes"), c('campings', 'Campings'),
      c('locations-saisonnieres', 'Locations saisonnières'), c('agences-de-voyages', 'Agences de voyages'),
      c('guides', 'Guides et activités touristiques'), c('offices-tourisme', 'Offices de tourisme'),
    ],
  },
  {
    slug: 'droit-finance', name: 'Droit, finance et assurance', hue: 230,
    description: 'Avocats, notaires, experts-comptables, banques et assureurs.',
    categories: [
      c('avocats', 'Avocats'), c('notaires', 'Notaires'), c('commissaires-justice', 'Commissaires de justice'),
      c('experts-comptables', 'Experts-comptables'), c('banques', 'Banques et courtiers'), c('assurances', 'Assurances et mutuelles'),
      c('patrimoine', 'Conseillers en gestion de patrimoine'),
    ],
  },
  {
    slug: 'conseil', name: 'Conseil et services aux entreprises', hue: 260,
    description: 'Stratégie, RH, RSE, traduction et services pour faire tourner une entreprise.',
    categories: [
      c('conseil-strategie', 'Conseil en stratégie et management'), c('rh-recrutement', 'RH et recrutement'),
      c('conseil-rse', 'Conseil RSE et environnement'), c('coworking', 'Coworking et domiciliation'),
      c('traduction', 'Traduction et interprétariat'), c('assistance', 'Secrétariat et assistance'),
      c('securite', 'Sécurité et gardiennage'),
      c('societes', 'Sociétés et bureaux'),
    ],
  },
  {
    slug: 'marketing', name: 'Marketing digital et communication', hue: 285,
    description: "SEO, acquisition, publicité, rédaction : les experts pour se faire connaître et vendre.",
    categories: [
      c('consultants-seo', 'Consultants SEO'), c('agences-seo', 'Agences SEO et GEO'), c('acquisition', 'Marketing digital et acquisition'),
      c('agences-communication', 'Agences de communication et design'), c('redacteurs', 'Rédacteurs et copywriters'),
      c('community-managers', 'Community managers et influence'), c('relations-presse', 'Relations presse'),
      c('imprimeries', 'Imprimeries et signalétique'),
    ],
  },
  {
    slug: 'web', name: 'Web, développement et infrastructure', hue: 250,
    description: 'Agences web, développeurs, designers et hébergeurs pour créer et faire tourner vos sites.',
    categories: [
      c('agences-web', 'Agences web et applications'), c('developpeurs', 'Développeurs et ingénieurs'),
      c('designers-ux', 'Designers UX/UI'), c('hebergement', 'Hébergement et infogérance'), c('cybersecurite', 'Cybersécurité'),
      c('depannage-informatique', 'Dépannage et maintenance informatique'),
      c('ressources-webmaster', 'Ressources pour webmasters'), c('annuaires', 'Annuaires et moteurs de recherche'),
      c('noms-de-domaine', 'Noms de domaine'),
    ],
  },
  {
    slug: 'logiciels', name: 'Logiciels, SaaS et IA', hue: 270,
    description: 'Logiciels, outils en ligne et experts de la data et de l’intelligence artificielle.',
    categories: [
      c('saas', 'Logiciels et SaaS'), c('outils-seo', 'Outils SEO'), c('conseil-ia', 'Conseil et automatisation IA'),
      c('data', 'Data et business intelligence'), c('applications', 'Applications mobiles'),
      c('outils-en-ligne', 'Sites pratiques et outils en ligne'),
    ],
  },
  {
    slug: 'formation', name: 'Formation et enseignement', hue: 55,
    description: 'Écoles, organismes de formation, cours particuliers et apprentissage en ligne.',
    categories: [
      c('ecoles', 'Écoles et universités'), c('organismes-formation', 'Organismes de formation professionnelle'),
      c('soutien-scolaire', 'Soutien scolaire'), c('langues', 'Cours de langues'), c('cours-musique', 'Cours de musique et d’art'),
      c('formations-en-ligne', 'Formations en ligne'),
    ],
  },
  {
    slug: 'creation', name: 'Art, musique et création', hue: 345,
    description: 'Photographes, illustrateurs, artisans d’art, auteurs et musiciens.',
    categories: [
      c('photographes', 'Photographes'), c('videastes', 'Vidéastes et motion designers'), c('illustrateurs', 'Illustrateurs et graphistes'),
      c('artisans-art', "Artisans d'art"), c('auteurs', 'Auteurs et écrivains'), c('musiciens', 'Musiciens et DJ'),
      c('artistes', 'Artistes plasticiens'), c('labels-studios', "Labels et studios d'enregistrement"),
      c('instruments', 'Magasins d’instruments'), c('galeries', "Galeries d'art"),
    ],
  },
  {
    slug: 'medias', name: 'Médias, culture et loisirs', hue: 200,
    description: 'Actualité, magazines, blogs, podcasts, jeux vidéo et patrimoine.',
    categories: [
      c('actualite', 'Actualité, culture et magazines'), c('medias-tech', 'Médias high-tech et numérique'),
      c('medias-ia', 'Médias et veille IA'), c('blogs', 'Blogs et créateurs de contenu'), c('podcasts', 'Podcasts'),
      c('jeux-video', 'Jeux vidéo et streaming'), c('patrimoine-histoire', 'Histoire, patrimoine et généalogie'),
      c('lieux-culturels', 'Musées, cinémas et salles de spectacle'),
    ],
  },
  {
    slug: 'evenementiel', name: 'Événementiel et mariage', hue: 310,
    description: 'Organisateurs, salles, traiteurs et prestataires pour vos événements privés ou pros.',
    categories: [
      c('organisateurs', "Organisateurs d'événements"), c('wedding-planners', 'Wedding planners'),
      c('salles-reception', 'Salles de réception'), c('animateurs', 'Animateurs et DJ événementiels'),
      c('location-materiel', 'Location de matériel'), c('seminaires', 'Séminaires et team building'),
    ],
  },
  {
    slug: 'famille', name: 'Enfance, famille et seniors', hue: 35,
    description: 'Garde d’enfants, aide à domicile et services à la personne.',
    categories: [
      c('creches', 'Crèches et assistantes maternelles'), c('baby-sitting', 'Baby-sitting et garde d’enfants'),
      c('aide-domicile', 'Aide à domicile'), c('residences-seniors', 'Résidences seniors et EHPAD'),
      c('services-personne', 'Services à la personne'),
    ],
  },
  {
    slug: 'animaux', name: 'Animaux', hue: 75,
    description: 'Vétérinaires, toiletteurs, pensions et éducateurs pour vos compagnons.',
    categories: [
      c('veterinaires', 'Vétérinaires'), c('toiletteurs', 'Toiletteurs'), c('pensions-animaux', 'Pensions et garde d’animaux'),
      c('educateurs-canins', 'Éducateurs canins'), c('elevages', 'Élevages'),
    ],
  },
  {
    slug: 'associations', name: 'Associations et institutions', hue: 180,
    description: 'Associations, collectivités, fondations et organisations professionnelles.',
    categories: [
      c('associations', 'Associations'), c('collectivites', 'Mairies et collectivités'), c('ong', 'Fondations et ONG'),
      c('federations', 'Fédérations et syndicats professionnels'),
      c('administrations', 'Administrations et services publics'), c('ambassades', 'Ambassades et consulats'),
    ],
  },
  {
    slug: 'industrie', name: 'Industrie et agriculture', hue: 110,
    description: 'Fabricants, sous-traitants, transporteurs, agriculteurs et viticulteurs.',
    categories: [
      c('fabricants', 'Fabricants et industriels'), c('impression-3d', 'Impression 3D et prototypage'),
      c('transport-logistique', 'Transport et logistique'), c('agriculture', 'Agriculture et viticulture'),
      c('sous-traitance', 'Sous-traitance et usinage'),
    ],
  },
  {
    slug: 'environnement', name: 'Environnement et nature', hue: 120,
    description: 'Énergies renouvelables, recyclage, écoconstruction et protection de la nature.',
    categories: [
      c('energies', 'Énergies renouvelables'), c('recyclage', 'Recyclage et gestion des déchets'),
      c('eco-construction', 'Écoconstruction et rénovation énergétique'), c('bilan-carbone', 'Bilan carbone et audit énergétique'),
      c('protection-nature', 'Protection de la nature'), c('permaculture', 'Jardinage bio et permaculture'),
    ],
  },
  {
    slug: 'emploi', name: 'Emploi et carrière', hue: 220,
    description: "Trouver un job, recruter, se reconvertir : sites d'emploi, intérim et accompagnement.",
    categories: [
      c('sites-emploi', "Sites d'emploi et job boards"), c('interim', "Agences d'intérim"),
      c('coaching-carriere', 'Coaching et bilan de compétences'), c('reconversion', 'Reconversion professionnelle'),
      c('plateformes-freelance', 'Plateformes freelance'), c('stages-alternance', 'Stages et alternance'),
    ],
  },
  {
    slug: 'sciences', name: 'Sciences et recherche', hue: 240,
    description: "Laboratoires, bureaux d'études et sites de vulgarisation scientifique.",
    categories: [
      c('laboratoires', 'Laboratoires et instituts de recherche'), c('bureaux-etudes', "Bureaux d'études et ingénierie"),
      c('vulgarisation', 'Vulgarisation scientifique'), c('astronomie', 'Astronomie et espace'),
      c('sciences-nature', 'Sciences de la nature'), c('sciences-humaines', 'Sciences humaines et sociales'),
    ],
  },
  {
    slug: 'societe', name: 'Société et vie pratique', hue: 20,
    description: 'Démarches, consommation, solidarité, parentalité et spiritualité au quotidien.',
    categories: [
      c('demarches', 'Démarches administratives'), c('consommation', 'Consommation et bons plans'),
      c('solidarite', 'Solidarité et entraide'), c('parentalite', 'Parentalité et éducation'),
      c('citoyennete', 'Droits et citoyenneté'), c('spiritualite', 'Religion et spiritualité'),
      c('pompes-funebres', 'Pompes funèbres'),
    ],
  },
  {
    slug: 'sorties', name: 'Sorties et loisirs', hue: 300,
    description: 'Que faire ce week-end : parcs, escape games, concerts, festivals et soirées.',
    categories: [
      c('parcs-loisirs', "Parcs d'attractions et de loisirs"), c('escape-games', 'Escape games et jeux immersifs'),
      c('karting-bowling', 'Bowling, karting et laser game'), c('concerts-festivals', 'Concerts et festivals'),
      c('agendas', 'Agendas et idées de sorties'), c('discotheques', 'Bars de nuit et discothèques'),
      c('jeux-societe', 'Jeux de société et ludothèques'),
    ],
  },
  {
    slug: 'perso', name: 'Sites personnels et passions', hue: 355,
    description: 'Portfolios, CV en ligne, carnets de voyage et sites de passionnés.',
    categories: [
      c('portfolios', 'CV et portfolios'), c('pages-perso', 'Pages personnelles'), c('passions', 'Passions et collections'),
      c('carnets-voyage', 'Carnets de voyage'), c('humour', 'Humour et divertissement'),
    ],
  },
  {
    slug: 'regional', name: 'Régions et villes', hue: 170,
    description: 'Portails locaux, sites de villes et ressources régionales partout en France.',
    categories: [
      c('auvergne-rhone-alpes', 'Auvergne-Rhône-Alpes'), c('bourgogne-franche-comte', 'Bourgogne-Franche-Comté'),
      c('bretagne', 'Bretagne'), c('centre-val-de-loire', 'Centre-Val de Loire'), c('corse', 'Corse'),
      c('grand-est', 'Grand Est'), c('hauts-de-france', 'Hauts-de-France'), c('ile-de-france', 'Île-de-France'),
      c('normandie', 'Normandie'), c('nouvelle-aquitaine', 'Nouvelle-Aquitaine'), c('occitanie', 'Occitanie'),
      c('pays-de-la-loire', 'Pays de la Loire'), c('paca', "Provence-Alpes-Côte d'Azur"), c('outre-mer', 'Outre-mer'),
    ],
  },
];
