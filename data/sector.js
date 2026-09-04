/* Procyon Sector — map data.
 *
 * Layout mirrors the sector map: Rin lower-left, Holt upper-left,
 * Iota lower-centre-right, Brekk right. Coordinates are percentages of the
 * sector viewport, so the map scales with the window.
 *
 * orbit  = semi-major axis in system-view %, tilt/phase give each body a
 *          distinct starting position so the systems don't look synchronised.
 * period = seconds for one revolution; outer bodies orbit slower.
 * surface= key into IMAGES (see image_prompts/) for the landed view.
 */

export const SECTOR = {
  name: 'Procyon Sector IE-21',
  systems: {
    rin: {
      key: 'sys.rin',
      name: 'Rin',
      tag: 'Gateway · Administration',
      x: 22, y: 62,
      star: { class: 'star-white', r: 46 },
      blurb: 'Inkörsporten till sektorn. Förvaltning, Gillet och guvernören — och Ashtarimolnet ute i systemets utkant.',
      factions: ['malklaith', 'guild', 'cobalt', 'turner', 'maelstrom', 'seekers'],
      article: 'locations/rin-system',
      gates: [
          { to: 'holt', label: 'Holt', bearing: 304.4, status: 'unstable' },
          { to: 'iota', label: 'Iota', bearing: 40.7, status: 'open' },
          { to: 'core', label: 'Kärnan', bearing: 139.4, status: 'core' },
        ],
      bodies: [
        { id: 'aleph', key: 'body.aleph',    name: 'Aleph',     type: 'planet',  orbit: 20, period: 147,  size: 20, phase: 20,
          tag: 'Giftig · Mineralrik', surface: 'aleph', article: 'locations/aleph',
          moons: [ { id: 'warren', key: 'body.warren', name: 'Grytet', name_en: 'Warren', orbit: 11, period: 32, size: 11, phase: 210,
                     tag: 'Huvudstad · Ekumenopolis', surface: 'warren', article: 'locations/warren' } ] },
        { id: 'sb176', key: 'body.sb176',    name: 'SB-176',    type: 'station', orbit: 36, period: 231,  size: 10, phase: 322,
          tag: 'Gillestation · Resursnav', surface: 'sb176', article: 'locations/sb-176' },
        { id: 'vet', key: 'body.vet',      name: 'Vet',       type: 'giant',   orbit: 29, period: 231,  size: 23, phase: 296,
          tag: 'Gasjätte · Borriggar', surface: 'vet', article: null },
        { id: 'baftoma', key: 'body.baftoma',  name: 'Baftoma',   type: 'husk',    orbit: 42, period: 364, size: 15, phase: 128,
          tag: '”Skalet” · Utvunnen', surface: 'baftoma', article: 'locations/baftoma' },
        { id: 'straylight', key: 'body.straylight', name: 'Irrblosset', name_en: 'The Straylight', type: 'ship', orbit: 15, period: 116, size: 7, phase: 95,
          tag: 'Flytande klubb', surface: 'straylight', article: null },
        { id: 'ashtari', key: 'body.ashtari',  name: 'Ashtarimolnet', name_en: 'Ashtari Cloud',
          type: 'nebula', orbit: 52, period: 665, size: 34, phase: 62,
          tag: 'Nebulosa · Malström', surface: 'ashtari', article: 'locations/ashtari-cloud' },
        { id: 'the-cove', key: 'body.the-cove', name: 'Lyan', name_en: 'The Cove', type: 'ship',
          orbit: 50, period: 610, size: 6, phase: 88,
          tag: 'Malströms hem · Skrotstation', surface: 'the-cove', article: 'locations/the-cove' }
      ]
    },

    holt: {
      key: 'sys.holt',
      name: 'Holt',
      tag: 'Frontier · Smugglers',
      x: 34, y: 22,
      star: { class: 'star-gold', r: 44 },
      blurb: 'Andra systemet som koloniserades. Avskum, pirater och den förseglade Hantuporten.',
      factions: ['malklaith', 'guild', 'cobalt', 'maelstrom', 'seekers'],
      article: 'locations/holt-system',
      gates: [
          { to: 'rin', label: 'Rin', bearing: 89.0, status: 'unstable' },
          { to: 'hantu', label: 'Hantu', bearing: 349.6, status: 'sealed' },
        ],
      bodies: [
        { id: 'omega', key: 'body.omega',     name: 'Omega',     type: 'dead',   orbit: 19, period: 133,  size: 15, phase: 155,
          tag: 'Karantän · Legion · Livsform i Ur-ruiner', surface: 'omega', article: null },
        { id: 'jerec', key: 'body.jerec',     name: 'Jerrys skrot', name_en: "Jerec's Junkyard", type: 'ship',
          orbit: 15, period: 92, size: 7, phase: 260,
          tag: 'Skepp och delar · Prutar hårt', surface: 'jerec-junkyard', article: 'locations/jerec-junkyard' },
        { id: 'auto4', key: 'body.auto4',     name: 'Handelsplattform Auto #4', name_en: 'Trade Platform Auto #4', type: 'station',
          orbit: 24, period: 175, size: 8, phase: 65,
          tag: 'Automatiserad · Beväpnad · Bränsle', surface: 'trade-platform-auto-4', article: 'locations/trade-platform-auto-4' },
        { id: 'mem', key: 'body.mem',       name: 'Mem',       type: 'ocean',  orbit: 28, period: 203,  size: 21, phase: 42,
          tag: 'Oceanisk · Xenohem', surface: 'mem', article: 'locations/mem' },
        { id: 'sonhandra', key: 'body.sonhandra', name: 'Sonhandra', type: 'locked', orbit: 38, period: 308,  size: 18, phase: 250,
          tag: 'Tidvattenlåst · Frihamn', surface: 'sonhandra', article: 'locations/sonhandra' },
        { id: 'vos', key: 'body.vos',       name: 'Vos',       type: 'crystal',orbit: 47, period: 427, size: 19, phase: 330,
          tag: '”Glimmer” · Bevakad', surface: 'vos', article: 'locations/vos' }
      ]
    },

    iota: {
      key: 'sys.iota',
      name: 'Iota',
      tag: 'Industry · Shipyards',
      x: 55, y: 76,
      star: { class: 'star-binary', r: 44 },
      blurb: 'Dubbelstjärna och sektorns verkstad. Starsmiths varv och legionärer. Mellan portarna löper en Way Line — en strömning där motorer får mer skjuts, en fördel för den som vet vägen.',
      factions: ['malklaith', 'guild', 'legion', 'borniko'],
      article: 'locations/iota-system',
      gates: [
          { to: 'rin', label: 'Rin', bearing: 185.2, status: 'open' },
          { to: 'brekk', label: 'Brekk', bearing: 319.8, status: 'open' },
        ],
      bodies: [
        { id: 'indri', key: 'body.indri',   name: 'Indri',   type: 'industrial', orbit: 20, period: 140, size: 19, phase: 75,
          tag: 'Industrialiserad · Förorenad', surface: 'indri', article: null },
        { id: 'amerath', key: 'body.amerath', name: 'Amerath', type: 'lush',       orbit: 31, period: 245, size: 20, phase: 200,
          tag: 'Frodig · Forskning', surface: 'amerath', article: null },
        { id: 'lithios', key: 'body.lithios', name: 'Lithios', type: 'ice',        orbit: 43, period: 385, size: 18, phase: 300,
          tag: 'Frusen · Forntida palats', surface: 'lithios', article: null },
        { id: 'shipyards', key: 'body.shipyards', name: 'Varven', name_en: 'Shipyards', type: 'station', orbit: 25, period: 182, size: 9, phase: 168,
          tag: 'Starsmiths', surface: 'shipyards', article: null },
        { id: 'zx1138', key: 'body.zx1138', name: 'ZX-1138', type: 'ship',
          orbit: 34, period: 380, size: 5, phase: 105, ecc: .78, armTilt: 34,
          tag: 'Långperiodisk komet · Ny bana', surface: 'zx-1138', article: 'locations/zx-1138' }
      ]
    },

    brekk: {
      key: 'sys.brekk',
      name: 'Brekk',
      tag: 'Culture · Academia',
      x: 80, y: 36,
      star: { class: 'star-blue', r: 46 },
      blurb: 'Procyons kulturella huvudstad. Neonljus, akademier och jaktmarker.',
      factions: ['malklaith', 'guild', 'turner', 'seekers', 'nightspeakers', 'echo'],
      article: 'locations/brekk-system',
      gates: [
          { to: 'iota', label: 'Iota', bearing: 104.3, status: 'open' },
        ],
      bodies: [
        { id: 'shimaya', key: 'body.shimaya',   name: 'Shimaya',   type: 'desert', orbit: 27, period: 205,  size: 18, phase: 15,
          tag: 'Öken · Akademi', surface: 'shimaya', article: null },
        { id: 'nightfall', key: 'body.nightfall', name: 'Skymningen', name_en: 'Nightfall', type: 'neon',   orbit: 32, period: 259,  size: 21, phase: 190,
          tag: 'Kulturcentrum · 13 månar', surface: 'nightfall', article: null,
          moons: [ { id: 'todav', key: 'body.todav', name: 'Todav', orbit: 8, period: 22, size: 5, phase: 30,
                     tag: 'Månar · Ur-tempel Dendara', surface: 'todav', article: 'locations/todav-dendara' } ] },
        { id: 'aketi', key: 'body.aketi',     name: 'Aketi',     type: 'jungle', orbit: 44, period: 406, size: 20, phase: 285,
          tag: 'Djungel · Fientlig', surface: 'aketi', article: null },
        { id: 'brightwind', key: 'body.brightwind', name: 'Glödbrisen', name_en: 'Bright Wind', type: 'nebula',
          orbit: 17, period: 96, size: 8, phase: 130,
          tag: 'Gasmoln · Illegala kapplöpningar', surface: 'bright-wind', article: 'locations/bright-wind' },
        { id: 'blackstarr', key: 'body.blackstarr', name: 'Svartstjärnan', name_en: 'Blackstarr', type: 'ship',
          orbit: 38, period: 340, size: 7, phase: 245,
          tag: 'Nightspeaker-skepp · Mörklagt', surface: 'blackstarr', article: 'locations/blackstarr' },
        // Isotropa orbits close to the Brekk star (sourcebook p.322 lists it
        // under Brekk's notable places, alongside Blackstarr and Bright Wind).
        { id: 'isotropa', key: 'body.isotropa', name: 'Isotropa Max', type: 'station',
          orbit: 9, period: 42, size: 8, phase: 315,
          tag: 'Fängelse · Malkläs säkraste', surface: 'isotropa-max', article: 'locations/isotropa-max' }
      ]
    }
  },

  /* Sector-level features not bound to a star. (None: the Ashtari Cloud is an
     in-system nebula and lives under Rin.) */
  features: [],

  /* Gate network. Each edge is drawn as a dashed lane; ships travel along it. */
  gates: [
    { from: 'rin',  to: 'holt', key: 'lane.rin-holt',   label: 'Rin–Holt',    status: 'unstable' },
    { from: 'rin',  to: 'iota', key: 'lane.rin-iota',   label: 'Rin–Iota',    status: 'open' },
    { from: 'iota', to: 'brekk',key: 'lane.iota-brekk', label: 'Iota–Brekk',  status: 'open' },
    { from: 'rin',  to: 'core', key: 'lane.rin-core',   label: 'Rin–Ecliptis',status: 'core' },
    { from: 'holt', to: 'hantu',key: 'lane.holt-hantu', label: 'Hantuporten', status: 'sealed' }
  ],

  /* Off-map endpoints for the two lanes that leave the sector. */
  endpoints: {
    core:  { x: 6,  y: 88, label: 'mot Kärnan' },
    hantu: { x: 62, y: 7,  label: 'Hantuporten — förseglad' }
  }
};
