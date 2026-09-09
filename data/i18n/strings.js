/* String catalogue for the sector map.
 *
 * Adding a new key:
 *   1. Add it here with sv/en values.
 *   2. Use t('key') in code or via a body's `key` field.
 *
 * Missing keys render as ⟨key⟩ so gaps are visible on-page.
 * A key without a translation for the current LANG falls back to sv → en → ⟨key⟩.
 */

export const STRINGS = {



  /* --------------- crew ------------------------------------------------- */
  'crew.button':   { sv: 'Besättning', en: 'Crew' },
  'crew.title':    { sv: 'Besättning', en: 'Crew' },
  'crew.hint':     { sv: 'Rollpersoner sparas lokalt i din webbläsare.',
                     en: 'Characters are stored locally in your browser.' },
  'crew.add':      { sv: 'Ny rollperson', en: 'New character' },
  'crew.empty':    { sv: 'Inga rollpersoner än.', en: 'No characters yet.' },
  'crew.name':     { sv: 'Namn',        en: 'Name' },
  'crew.playbook': { sv: 'Arketyp',     en: 'Playbook' },
  'crew.delete':   { sv: 'Ta bort',     en: 'Delete' },
  'crew.confirmDelete': { sv: 'Ta bort %s? Detta kan inte ångras.',
                          en: 'Delete %s? This cannot be undone.' },

  /* --------------- player fleet ----------------------------------------- */
  'fleet.button':  { sv: 'Flotta',      en: 'Fleet' },
  'fleet.title':   { sv: 'Flotta',      en: 'Fleet' },
  'fleet.hint':    { sv: 'Välj ett skepp, tryck M och klicka i systemet för att flytta det.',
                     en: 'Select a ship, press M, then click in the system to move it.' },
  'fleet.add':     { sv: 'Nytt skepp',  en: 'New ship' },
  'fleet.empty':   { sv: 'Inga skepp än. Lägg till ett för att sätta det på kartan.',
                     en: 'No ships yet. Add one to put it on the chart.' },
  'fleet.name':    { sv: 'Namn',        en: 'Name' },
  'fleet.sprite':  { sv: 'Bild',        en: 'Sprite' },
  'fleet.place':   { sv: 'Placera',     en: 'Place' },
  'fleet.hold':    { sv: 'fri bana',    en: 'free orbit' },
  'fleet.gate':    { sv: 'Porten',      en: 'Gate' },
  'fleet.vessel':  { sv: 'Spelarskepp', en: 'Player vessel' },
  'fleet.hintMove':{ sv: 'M för att flytta · klicka igen för att gå ombord · Esc för att avmarkera',
                     en: 'M to move · click again to board · Esc to deselect' },
  'fleet.hintJump':{ sv: 'J för att hoppa genom porten · M för att flytta · klicka igen för att gå ombord',
                     en: 'J to jump through the gate · M to move · click again to board' },
  'fleet.select':  { sv: 'Visa & flytta', en: 'Show & move' },
  'fleet.delete':  { sv: 'Ta bort',     en: 'Delete' },
  'fleet.confirmDelete': { sv: 'Ta bort %s? Detta kan inte ångras.',
                           en: 'Delete %s? This cannot be undone.' },
  'fleet.unplaced':{ sv: 'Inte utplacerad', en: 'Not placed' },
  'fleet.moving':  { sv: 'Klicka på ett mål i systemet', en: 'Click a destination in the system' },

  /* --------------- systems ---------------------------------------------- */
  'sys.rin.name':   { sv: 'Rin',   en: 'Rin' },
  'sys.rin.tag':    { sv: 'Inkörsport · Förvaltning',   en: 'Gateway · Administration' },
  'sys.rin.blurb':  {
    sv: 'Inkörsporten till sektorn. Förvaltning, Gillet och guvernören — och Ashtarimolnet ute i systemets utkant.',
    en: 'Gateway to the sector. Administration, the Guild, and the governor — plus the Ashtari Cloud at the system rim.'
  },

  'sys.holt.name':  { sv: 'Holt',  en: 'Holt' },
  'sys.holt.tag':   { sv: 'Utkant · Smugglare',         en: 'Frontier · Smugglers' },
  'sys.holt.blurb': {
    sv: 'Andra systemet som koloniserades. Avskum, pirater och den förseglade Hantuporten.',
    en: 'Procyon\'s second colonised system. Scum, pirates, and the sealed Hantu Gate.'
  },

  'sys.iota.name':  { sv: 'Iota',  en: 'Iota' },
  'sys.iota.tag':   { sv: 'Industri · Varv',            en: 'Industry · Shipyards' },
  'sys.iota.blurb': {
    sv: 'Dubbelstjärna och sektorns verkstad. Stjärnsmedernas varv och legionärer. Mellan portarna löper en Strålådra — en strömning där motorer får mer skjuts, en fördel för den som känner till den.',
    en: 'Binary star system, workshop of the sector. Starsmiths shipyards and Legion presence. Between the gates runs a Way Line — a current where engines get more thrust, a boon for those who know the way.'
  },

  'sys.brekk.name': { sv: 'Brekk', en: 'Brekk' },
  'sys.brekk.tag':  { sv: 'Kultur · Akademier',         en: 'Culture · Academia' },
  'sys.brekk.blurb':{
    sv: 'Procyons kulturella huvudstad. Neonljus, akademier och jaktmarker.',
    en: 'Procyon\'s cultural capital. Neon light, academies, and hunting grounds.'
  },

  /* --------------- bodies (name + tag per body) ------------------------- */

  /* Rin */
  'body.aleph.name':      { sv: 'Aleph',           en: 'Aleph' },
  'body.aleph.tag':       { sv: 'Giftig · Mineralrik', en: 'Toxic · Mineral-rich' },
  'body.warren.name':     { sv: 'Grytet',          en: 'Warren' },
  'body.warren.tag':      { sv: 'Huvudstad · Ekumenopolis', en: 'Capital · Ecumenopolis' },
  'body.sb176.name':      { sv: 'SB-176',          en: 'SB-176' },
  'body.sb176.tag':       { sv: 'Gillestation · Resursnav', en: 'Guild Station · Resource Hub' },
  'body.vet.name':        { sv: 'Vet',             en: 'Vet' },
  'body.vet.tag':         { sv: 'Gasjätte · Borriggar',    en: 'Gas Giant · Drill Rigs' },
  'body.baftoma.name':    { sv: 'Baftoma',         en: 'Baftoma' },
  'body.baftoma.tag':     { sv: '”Skalet” · Utvunnen',    en: '"The Husk" · Stripped' },
  'body.straylight.name': { sv: 'Irrblosset',  en: 'The Straylight' },
  'body.straylight.tag':  { sv: 'Flytande klubb',         en: 'Floating Club' },
  'body.ashtari.name':    { sv: 'Ashtarimolnet',   en: 'Ashtari Cloud' },
  'body.ashtari.tag':     { sv: 'Nebulosa · Malström',    en: 'Nebula · Maelstrom' },
  'body.the-cove.name':   { sv: 'Lyan',        en: 'The Cove' },
  'body.the-cove.tag':    { sv: 'Malströms hem · Skrotstation', en: 'Maelstrom\'s home · Scrap station' },

  /* Holt */
  'body.omega.name':      { sv: 'Omega',           en: 'Omega' },
  'body.omega.tag':       { sv: 'Karantän · Legionen · Livsform i Ur-ruiner',
                            en: 'Quarantine · Legion · Lifeform in Ur ruins' },
  'body.mem.name':        { sv: 'Mem',             en: 'Mem' },
  'body.mem.tag':         { sv: 'Oceanisk · Xenohem', en: 'Oceanic · Xeno Homeworld' },
  'body.sonhandra.name':  { sv: 'Sonhandra',       en: 'Sonhandra' },
  'body.sonhandra.tag':   { sv: 'Tidvattenlåst · Frihamn', en: 'Tidally Locked · Free Port' },
  'body.vos.name':        { sv: 'Vos',             en: 'Vos' },
  'body.vos.tag':         { sv: '”Glimmer” · Bevakad',    en: '"Glimmer" · Monitored' },
  'body.jerec.name':      { sv: 'Jerrys skrot',    en: 'Jerec\'s Junkyard' },
  'body.jerec.tag':       { sv: 'Skepp och delar · Prutar hårt', en: 'Ships and parts · Canny haggler' },
  'body.auto4.name':      { sv: 'Handelsplattform Auto #4', en: 'Trade Platform Auto #4' },
  'body.auto4.tag':       { sv: 'Automatiserad · Beväpnad · Bränsle',
                            en: 'Automated · Armed · Fuel' },
  'body.isotropa.name':   { sv: 'Isotropa Max',    en: 'Isotropa Max Secure' },
  'body.isotropa.tag':    { sv: 'Fängelse · Malkläs säkraste',
                            en: 'Prison · Malklaith\'s tightest' },

  /* Iota */
  'body.indri.name':      { sv: 'Indri',           en: 'Indri' },
  'body.indri.tag':       { sv: 'Industrialiserad · Förorenad', en: 'Industrialised · Polluted' },
  'body.amerath.name':    { sv: 'Amerath',         en: 'Amerath' },
  'body.amerath.tag':     { sv: 'Frodig · Forskning', en: 'Lush · Research' },
  'body.lithios.name':    { sv: 'Lithios',         en: 'Lithios' },
  'body.lithios.tag':     { sv: 'Frusen · Forntida palats', en: 'Frozen · Ancient Palaces' },
  'body.shipyards.name':  { sv: 'Varven',          en: 'Shipyards' },
  'body.shipyards.tag':   { sv: 'Stjärnsmederna',      en: 'Starsmiths' },
  'body.zx1138.name':     { sv: 'ZX-1138',         en: 'ZX-1138' },
  'body.zx1138.tag':      { sv: 'Långperiodisk komet · Ny bana',
                            en: 'Long-period comet · New trajectory' },

  /* Brekk */
  'body.shimaya.name':    { sv: 'Shimaya',         en: 'Shimaya' },
  'body.shimaya.tag':     { sv: 'Öken · Akademi', en: 'Desert · Academy' },
  'body.nightfall.name':  { sv: 'Skymningen',      en: 'Nightfall' },
  'body.nightfall.tag':   { sv: 'Kulturcentrum · 13 månar',
                            en: 'Cultural Centre · 13 moons' },
  'body.todav.name':      { sv: 'Todav',           en: 'Todav' },
  'body.todav.tag':       { sv: 'Måne · Ur-tempel Dendara',
                            en: 'Moon · Ur temple Dendara' },
  'body.aketi.name':      { sv: 'Aketi',           en: 'Aketi' },
  'body.aketi.tag':       { sv: 'Djungel · Fientlig',     en: 'Jungle · Hostile' },
  'body.brightwind.name': { sv: 'Glödbrisen',     en: 'Bright Wind' },
  'body.brightwind.tag':  { sv: 'Gasmoln · Illegala kapplöpningar',
                            en: 'Gas cloud · Illegal racing' },
  'body.blackstarr.name': { sv: 'Svartstjärnan',      en: 'Blackstarr' },
  'body.blackstarr.tag':  { sv: 'Nattmälarnas skepp · Mörklagt',
                            en: 'Nightspeaker ship · Dark' },


  /* --------------- gates ------------------------------------------------- */
  'gate.rin.label':   { sv: 'Rin',        en: 'Rin' },
  'gate.holt.label':  { sv: 'Holt',       en: 'Holt' },
  'gate.iota.label':  { sv: 'Iota',       en: 'Iota' },
  'gate.brekk.label': { sv: 'Brekk',      en: 'Brekk' },
  'gate.core.label':  { sv: 'Kärnan',    en: 'The Core' },
  'gate.hantu.label': { sv: 'Hantu',      en: 'Hantu' },
  'gate.tooltip':     { sv: 'Port mot {name}', en: 'Gate toward {name}' },
  'gate.hantu.blurb': {
    sv: 'Hegemonin har aldrig lyckats aktivera denna port. Jämfört med de fungerande portarna verkar den sakna små men avgörande delar. Föregångarna tros ha låst porten och gömt nycklarna — varför, vet ingen.',
    en: 'The Hegemony has never been able to activate this gate. Compared to the working gates it appears to be missing small but critical components. The Precursors are believed to have locked the gate and hidden the keys — no one knows why.'
  },
  'gate.hantu.tag':   { sv: 'Förseglad port', en: 'Sealed gate' },

  /* --------------- star surface entries (star-<id> psuedo-body) --------- */
  'star.suffix':     { sv: '-stjärnan',           en: ' star' },  /* appended to system name */


  /* --------------- gate lanes (sector view) ----------------------------- */
  'lane.rin-holt':    { sv: 'Rin–Holt',        en: 'Rin–Holt' },
  'lane.rin-iota':    { sv: 'Rin–Iota',        en: 'Rin–Iota' },
  'lane.iota-brekk':  { sv: 'Iota–Brekk',      en: 'Iota–Brekk' },
  'lane.rin-core':    { sv: 'Rin–Kärnan',      en: 'Rin–Ecliptis' },
  'lane.holt-hantu':  { sv: 'Hantuporten',     en: 'The Hantu Gate' },


  /* --------------- body blurbs + details (from corpus, cleaned) --------- */


  /* --------------- body blurbs + details (clean) --------------- */
  'body.aketi.blurb':   { sv: 'En otämjd djungelvärld i Brekk.', en: 'An untamed jungle world in Brekk.' },
  'body.aketi.details': { sv: 'En otämjd djungelvärld i Brekk. I stort sett outforskad. Gömmer dem som flyr lagen; lockar de rika på jakt efter farligt villebråd. Vad som äter jägarna när det går fel är ingen riktigt säker på — bärgningsteamen kommer inte heller alltid tillbaka.', en: 'An untamed jungle world in Brekk. Largely unexplored. Hides those fleeing from the law; entices the rich on hunts for dangerous game. What eats the hunters when things go wrong, nobody\'s quite sure — the recovery teams don\'t always come back either.' },
  'body.aleph.blurb':   { sv: 'En grönblå, gasomhöljd och giftig planet; den innersta planetbanan i Rinsystemet.', en: 'A greenish-blue, gas-covered, toxic planet; the deepest planetary orbit within the Rin System.' },
  'body.aleph.details': { sv: 'En grönblå, gasomhöljd och giftig planet; den innersta planetbanan i Rinsystemet.\n \nMellan de giftiga gaserna och den tektoniska instabiliteten vore Aleph en planet att undvika om det inte vore för dess mineralfyndigheter. Det mesta av rikedomen som grävs upp ur planeten beskattas hårt av guvernör Ritam al\'Malklä, vilket håller missnöjet ständigt pyrande bland gruvarbetarna, kolonisterna och Kobaltsyndikatet .\n \nMånar: Grytet, Hock och Batter.\n\nGeografi\n\nAleph är en klippig, karg värld av stup, öknar, stenutsprång och bågar. Vacker på sitt eget vis, men kombinationen av dödligt giftig atmosfär, storskalig gruvdrift och en farlig inflygning gör att skönheten till stor del sällan får någon beskådare.\n\nLokala fenomen\n\n”Gasstormar” är atmosfäriska förhållanden som regelbundet sveper över planeten och drar giftiga gasmoln över ytan. Dessa stormar är mycket farliga för piloter, vare sig de är människor, xenos eller Ur-botar.\n\nNaturresurser\n\nAlephs yta är rik på mineraltillgångar som bryts och bearbetas genom officiella koncessioner från Hegemonin.', en: 'A greenish-blue, gas-covered, toxic planet; the deepest planetary orbit within the Rin System.\n \nBetween the poisonous gases and tectonic instability, Aleph would be a planet to avoid if it weren\'t for its mineral stores. Most of the wealth dug from the planet is taxed heavily by Governor Ritam al\'Malklaith, leading to frequent unrest among the miners, the colonists, and the Cobalt Syndicate .\n \nMoons: Warren, Hock, and Batter.\n\nGeography\n\nAleph is a rocky, barren world of cliffs, deserts, stony outcroppings and arches. Beautiful in its own way, but the combination of a deadly toxic atmosphere, mass mining concerns, and a dangerous approach mean its beauty goes largely overlooked.\n\nLocalized Phenomena\n\n"Gas storms" are atmospheric conditions which routinely sweep across the planet, carrying poisonous clouds of gas to rake the surface. These storms are very dangerous to pilots, be they human, xeno, or urbot.\n\nNatural Resources\n\nAleph\'s surface is rich in mineral resources which are mined and quarried by official charters to the Hegemony.' },
  'body.amerath.blurb':   { sv: 'Ett populärt semestermål för välbärgade familjer.', en: 'A popular vacation spot for well-off families.' },
  'body.amerath.details': { sv: 'Ett populärt semestermål för välbärgade familjer. Rustikt och lantligt på ytan med "charmiga" Ur-ruiner, men med tillräcklig kontroll och teknik under ytan för att bära verklig lyx. Forskningslaboratorier arbetar diskret mellan lantställena.', en: 'A popular vacation spot for well-off families. Seemingly rustic and rural with "charming" Ur ruins, but with enough Guild control and tech underneath to support real luxury. Research labs quietly do their work between the country estates.' },
  'body.ashtari.blurb':   { sv: 'En uråldrig, skadad rest av ett väldigt Ur-skepp driver i rymden och alstrar en nebulosa inne i systemet.', en: 'An ancient damaged remnant of a massive Ur-ship lies in space, generating an in-system nebula.' },
  'body.ashtari.details': { sv: 'En uråldrig, skadad rest av ett väldigt Ur-skepp driver i rymden och alstrar en nebulosa inne i systemet. Inuti molnet fungerar normal framdrivning bara begränsat och navigationssystemen är opålitliga. Ryktet säger att piratflottan Malström har lärt sig att navigera genom molnet och gjort det till sin bas. Frekvensen av Malströms attacker i Rinsystemet ger teorin viss tyngd, även om både Ingenjörsgillet och de hegemoniska kulterna hävdar att det inte kan låta sig göras utan Föregångarnas teknologi eller ett flagrant missbruk av Ådern.', en: 'An ancient damaged remnant of a massive Ur-ship lies in space, generating an in-system nebula. Within the Cloud, normal propulsion is limited and nav systems are dodgy. Rumor states that the pirate fleet known as Maelstrom  has learned how to navigate through the Cloud, and have made it their base of operations. The frequency of Maelstrom attacks in the Rin System lend credence to this theory, though both the Guild of Engineers and the Hegemonic Cults insist that it could not be done without Precursor technology or a blatant misuse of The Way.' },
  'body.auto4.blurb':   { sv: 'Gillet har upprättat en automatiserad plattform för bränsleförsäljning, täckt av försvarssystem för att avskräcka från stölder.', en: 'The Guild set up an automated platform for selling fuel, covered in defensive systems to deter theft.' },
  'body.auto4.details': { sv: 'Gillet har upprättat en automatiserad plattform för bränsleförsäljning, täckt av försvarssystem för att avskräcka från stölder. Därför förlägger vissa parter sina förhandlingar hit just för att hålla nere risken för upptrappning. Vad som hände med de tre första plattformarna är det ingen som vet.', en: 'The Guild set up an automated platform for selling fuel, covered in defensive systems to deter theft. Because of this, some parties conduct negotiations here to discourage escalation. Nobody knows what happened to the first three platforms.' },
  'body.baftoma.blurb':   { sv: 'Även kallad ”Skalet”.', en: 'AKA "The Husk." Resource exploitation by the Hegemony is comprehensive, and planets incapable of sustaining life are stripped to the core.' },
  'body.baftoma.details': { sv: 'Även kallad ”Skalet”. Hegemonins resursutvinning är genomgripande, och planeter som inte kan uppbära liv skalas ända in till kärnan. Baftoma är ett praktexempel — kvar finns bara ett skelett av berg och kvarlämnad, sönderrostad utrustning, och dess sargade kropp används numera bara av rymdfarare som gömmer sig eller ligger lågt tills det svalnat.', en: 'AKA "The Husk." Resource exploitation by the Hegemony is comprehensive, and planets incapable of sustaining life are stripped to the core. Baftoma is a prime example - only scaffolding of rock and left-behind broken-down equipment remains, its shattered form only used by spacers in hiding or dodging heat.' },
  'body.blackstarr.blurb':   { sv: 'Nattviskarnas väldiga och till största delen tomma skepp, där invigda tränar under sitt första år.', en: 'The vast and largely empty Nightspeaker ship where initiates train for their first year.' },
  'body.blackstarr.details': { sv: 'Nattviskarnas väldiga och till största delen tomma skepp, där invigda tränar under sitt första år. Skeppet ligger släckt och byter rutinmässigt position för att inte upptäckas. Besökare tas sällan emot, men undantag görs för dem som står på god fot med kulten.', en: 'The vast and largely empty Nightspeaker ship where initiates train for their first year. The ship is unlit and moves routinely to prevent discovery. It does not often receive visitors, but exceptions are made for those that have a favorable relationship to the Cult.' },
  'body.brightwind.blurb':   { sv: 'Ett stort gasmoln utslungat av stjärnan, numera racerbana åt Ekovågsryttarna.', en: 'A large gas cloud ejected by the star, now used as racing grounds by the Echo Wave Riders.' },
  'body.brightwind.details': { sv: 'Ett stort gasmoln utslungat av stjärnan, numera racerbana åt Ekovågsryttarna. Även om det är både dödligt och olagligt tävlar racerförare från hela sektorn här om cred och ryktbarhet. Inbjudningarna till loppen är exklusiva och kräver att man först kvalificerar sig under lika farliga förhållanden.', en: 'A large gas cloud ejected by the star, now used as racing grounds by the Echo Wave Riders. Despite it being both lethal and illegal, racers from all over the sector compete for cred and fame. Invitations to the races are exclusive and require qualifying in equally hazardous conditions.' },
  'body.indri.blurb':   { sv: 'Iotas industrialiserade innersta värld.', en: 'Iota\'s industrialised inner world.' },
  'body.indri.details': { sv: 'Iotas industrialiserade innersta värld. Raffinaderier och slaggfält täcker skorpan; ett brunt permanent dis suddar horisonten. Allt av värde skeppas upp till omloppsstationerna. Ingen plats att vara fattig på.', en: 'Iota\'s industrialised inner world. Refineries and slag fields cover the crust; a permanent brown haze blurs the horizon. Everything of value is shipped up to the orbital transfer stations. Not a place to be poor.' },
  'body.isotropa.blurb':   { sv: 'Isotropa kretsar nära stjärnan och är Procyons mest ökända fängelse.', en: 'Orbiting near the star, Isotropa is the most notorious prison in Procyon.' },
  'body.isotropa.details': { sv: 'Isotropa kretsar nära stjärnan och är Procyons mest ökända fängelse. Fångvaktarna förmedlar audienser med fångarna och beviljar strafflindringar åt de mäktiga och rika. De rapporterar till Malklä, men fängelset sköter i stort sett sig självt.', en: 'Orbiting near the star, Isotropa is the most notorious prison in Procyon. Wardens broker audiences with prisoners and grant commutations for the powerful and wealthy. They report to Malklaith but the prison largely runs itself.' },
  'body.jerec.blurb':   { sv: 'En fritt drivande massa av skepp och delar, hopkopplad med kablar och magnetism.', en: 'A free-floating mass of ships and parts, connected via magnetism and cabling.' },
  'body.jerec.details': { sv: 'En fritt drivande massa av skepp och delar, hopkopplad med kablar och magnetism. Letar du efter billig utrustning är Skrotgården rätt plats, även om det troligen fattas delar och all form av tillförlitlighet. Jerry köper också — men han är en slug kanalje när det gäller priset.', en: 'A free-floating mass of ships and parts, connected via magnetism and cabling. If you\'re looking for equipment on the cheap, the Junkyard is your place, though it will likely be missing a piece or unreliable. Jerec also buys, but is a canny haggler.' },
  'body.lithios.blurb':   { sv: 'En frusen värld av isslätter och djupa glaciärkanjoner.', en: 'A frozen world of ice plains and deep glacial canyons.' },
  'body.lithios.details': { sv: 'En frusen värld av isslätter och djupa glaciärkanjoner. Halvt begravda under isen: forntida palats av okänt ursprung, cyklopiska och precisa. Utgrävningsteam kommer och går. De flesta lämnar med tomma händer. Några återvänder förändrade.', en: 'A frozen world of ice plains and deep glacial canyons. Half-buried beneath the ice: ancient palaces of unknown origin, cyclopean and precise. Excavation crews come and go. Most leave with nothing. A few come back changed.' },
  'body.mem.blurb':   { sv: 'Denna oceanplanet hade koloniserats av Hegemonin i nästan hundra år innan djuphavslevande akvatiska xenos gav sig — och sina anspråk på planeten — till känna.', en: 'This ocean planet was colonized by the Hegemony for almost one hundred years before deep-water aquatic xenos made themselves (and their planetary claims) known.' },
  'body.mem.details': { sv: 'Denna oceanplanet hade koloniserats av Hegemonin i nästan hundra år innan djuphavslevande akvatiska xenos gav sig — och sina anspråk på planeten — till känna. Hegemoniska styrkor krossade den memiska militären och införlivade den i Hegemonin. Utforskningen av Mem har visat sig svår på grund av de fristående gravitationsbrunnarna djupt under vågorna.\n• -- Folk och platser\n• Bok-Dar är en uråldrig memisk stad djupt under havsytan.\n• Espa Nurär en memisk arbetsledare, med ärr fyllda av djuphavets bioluminiscens.\n• Juvelen är en exklusiv klubb. Medlemskapet är både slutet och dyrt, och betraktas som ett tecken på utsökt smak bland societeten och Adelshusen.\n• Mantabasen är en forskningsstation på en ö, driven av Sökarnas kult. Den övervakas av den memiske forskaren Qulocct.\n• Victor Kromyl är planetguvernör och färdas aldrig utan sina livvakter ur Legionen.\n• Wyndam Taru Zahn: En biologiforskare med flera publicerade men artiklar som ingen tar på allvar som söker ett samband mellan memierna och annat liv på planeten.', en: 'This ocean planet was colonized by the Hegemony for almost one hundred years before deep-water aquatic xenos made themselves (and their planetary claims) known. Hegemonic forces broke the Memish military and incorporated them into the Hegemony. Exploration of Mem has proven difficult due to the free-standing gravity wells deep beneath the waves.\n• -- People and Places\n• Bok-Dar is an ancient Memish city located deep beneath the ocean.\n• Espa Nuris a Memish labor boss, his scars packed with deep-ocean bioluminescence.\n• The Jewel is an upscale club. Membership is both exclusive and expensive, and considered a mark of exquisite taste by members of high society and Noble Houses.\n• Manta Base is an island research station run by the Cult of the Seekers. Overseen by the Memish researcher Qulocct.\n• Victor Kromyl is the Planetary Governor, never traveling without his Legion bodyguards.\n• Wyndam Taru Zahn: A biology researcher with several published but widely scorned articles seeking a connection between the Mem and other planetary life.' },
  'body.nightfall.blurb':   { sv: 'Brekks kulturella huvudstad.', en: 'Brekk\'s cultural capital.' },
  'body.nightfall.details': { sv: 'Brekks kulturella huvudstad. Neonlysta boulevarder på en värld i evig skymning, omgiven av tretton månar. Teatrar, gallerier, exklusiva restauranger. Vill du lämna in papper, göra upp affärer eller umgås med sektorns elit, är det hit du kommer.', en: 'Brekk\'s cultural capital. Neon-lit boulevards on a permanent-twilight world, encircled by thirteen moons. Theatres, galleries, exclusive restaurants. If you\'re looking to file paperwork, strike deals, or mingle with the sector\'s elite, this is where you go.' },
  'body.omega.blurb':   { sv: 'Tre kartläggningsbesättningar och en militär expedition har försvunnit på Omega innan Hegemonin satte planeten i karantän.', en: 'Three survey crews and one military expedition have vanished on Omega before the Hegemony quarantined this planet.' },
  'body.omega.details': { sv: 'Tre kartläggningsbesättningar och en militär expedition har försvunnit på Omega innan Hegemonin satte planeten i karantän. Den vimlar av en dödlig livsform som bygger bo i Ur-ruiner och kan stå emot kärnvapen från omloppsbana.', en: 'Three survey crews and one military expedition have vanished on Omega before the Hegemony quarantined this planet. It\'s overrun with a deadly lifeform that nests in Ur ruins and can resist nukes from orbit.' },
  'body.sb176.blurb':   { sv: 'Man behöver ingen planet för att bryta malm.', en: 'You don\'t need a planet in order to mine.' },
  'body.sb176.details': { sv: 'Man behöver ingen planet för att bryta malm. Eller åtminstone behöver man ingen mark. Denna kombinerade gruvplattform och rymdkoloni ansvarar för utvinningen av resurser ur Vet, den ringförsedda gasjätte den kretsar kring. Borriggarna i atmosfären, till största delen bemannade av Ur-botar, skickar sina laster till detta centralnav. Det mesta packas sedan och skjuts iväg mot Rin-Ecliptis-porten.\n \nStationen är hårt kontrollerad och övervakad av Hegemonins Ingenjörsgille.\n• -- Folk och platser:\n• Yast Jor: Gillets chef för utposten. Känd för att leverera, även om han ibland måste tänja på någon annans regler. Också känd som en adrenalinjägare med ett racerskepp uppgraderat av Gillet för sina sällsynta lediga dagar.\n• Kasumi Ortcutt: En mystiker som påstår sig höra Vets röst — gasjätten som SB-176 kretsar kring. Hon lever på att handla med information och är specialiserad på esoterika om Ur och Föregångarna.\n• Espa ”Bolt” Wu: En facklig organisatör som arbetar för att förbättra arbetsvillkoren för Gillets gruvarbetare. En eldsjäl och orosstiftare, älskad av arbetarna och fängslad otaliga gånger.', en: 'You don\'t need a planet in order to mine. Or at least, you don\'t need ground. This combination mining platform and space colony is responsible for extracting resources from Vet, the ringed gas giant which it orbits. The mining rigs in the atmosphere, mostly manned by Urbots, send their goods to this central hub. Most of those are then packaged and fired toward the Rin-Ecliptis Gate.\n \nThe station is heavily controlled and monitored by the Hegemonic Guild of Engineers.\n• -- People and Places:\n• Yast Jor: Guilder head of the outpost. Known for getting things done, even if it may bend someone\'s rules. Also known as a thrill-seeker who keeps a Guild-enhanced racing ship for rare days off.\n• Kasumi Ortcutt: A mystic who claims to hear the Voice of Vet - the gas giant SB-176 orbits. Survives by trading in information, specializing in esoterica on the Ur and Precursors.\n• Espa "Bolt" Wu: A labor organizer working to enhance the working conditions of the Guild miners. A passionate rabble-rouser beloved by the workers, has been incarcerated numerous times.' },
  'body.shimaya.blurb':   { sv: 'Brekks öken- och akademivärld.', en: 'Brekk\'s desert academy world.' },
  'body.shimaya.details': { sv: 'Brekks öken- och akademivärld. Vidsträckta ökensjöar korsade av kanjonsystem; Khaludakademin är uthuggen i en kanjonvägg — sandstensterrasser, skuggade gårdar, studenter i mantel. Vill du bedriva seriös forskning i Procyon kommer du hit.', en: 'Brekk\'s desert academy world. Vast dune seas cut by canyon systems; the Khalud Academy is carved into one canyon wall — sandstone terraces, shaded courtyards, students in robes. If you want to do serious research in Procyon, you come here.' },
  'body.shipyards.blurb':   { sv: 'Stjärnsmedernas varv — Procyons största rymdvarv i omloppsbana.', en: 'The Starsmiths shipyards — Procyon\'s largest orbital shipbuilding facility.' },
  'body.shipyards.details': { sv: 'Stjärnsmedernas varv — Procyons största rymdvarv i omloppsbana. Gillet äger torrdockorna; Legionen patrullerar dem. Varje skrov som byggs i sektorn passerar här. Även många som skulle skrotats, tyst.', en: 'The Starsmiths shipyards — Procyon\'s largest orbital shipbuilding facility. The Guild owns the drydocks; the Legion patrols them. Every hull built in the sector passes through here. Also: many that were meant to be scrapped, quietly.' },
  'body.sonhandra.blurb':   { sv: 'Denna planet är bunden i tidvattenlås — samma sida vänds ständigt mot stjärnan.', en: 'This planet is tidally locked - the same side of the planet faces the star at all times.' },
  'body.sonhandra.details': { sv: 'Denna planet är bunden i tidvattenlås — samma sida vänds ständigt mot stjärnan. Dagsidan är brännhet, och märkligt nog slocknar alla ljuskällor omkring en kilometer in på Nattsidan. De flesta bosättningarna ligger längs den skymningsbelysta gränszonen, däribland huvudstaden Ugar. Känd för slappa regler kring handel är planeten ett förstahandsval för smugglare och hälare.\n• -- Folk och platser:\n• Abra Drake är fixare och auktionsutropare — mot rätt betalning. Kan hon inte få tag i det, eller sälja det, känner hon någon som kan.\n• Del Hex är efterlyst i flera system. En fredlös revolverman med uppenbara cybernetiska implantat, och ryktet säger att han håller sig gömd djupt inne på Dagsidan.\n• Graalen är en bar med tillhåll bland de unga adelsmän och idealister som utgör Hegemonens Concordiatriddare.\n• Rost är ett auktionshus i Ugar som aldrig tycks stänga.\n• Tank Marak är en legosoldat som blivit bonde. Hans namn dyker upp då och då i kriminella kretsar som en lokal kontakt på Nattsidan.\n• De tre solarna är Ugars största lokala sylta och därtill en spelhåla. Den drivs av exlegionären Osha Pen.\n• Wildside är en exklusiv och välbevakad societetsklubb undangömd inne i själva Ugar.', en: 'This planet is tidally locked - the same side of the planet faces the star at all times. The Dayside is blistering, and, oddly, all light sources extinguish themselves about one kilometer into the Nightside. Most of the settlements are along the twilit border zone, including the capital of Ugar. Known for lax policies regarding trade, it\'s a choice destination for smugglers and fences alike.\n• -- People and Places:\n• Abra Drake is a fixer for hire and auctioneer. If she can\'t find it, or sell it, she knows someone who can.\n• Del Hex is wanted across several systems. An outlaw gunslinger with obvious cybernetic enhancements, it\'s rumored he hides out deep in the Dayside.\n• The Grail is a bar frequented by the young nobles and idealists who make up The Concordiat Knights of the Hegemon.\n• Rust is an auction house in Ugar which never seems to close.\n• Tank Marak is a mercenary-turned-farmer. His name comes up now and again in criminal circles as a local contact in the Nightside.\n• The Three Suns is Ugar\'s biggest local dive, and a gambling den to boot. It\'s run by ex-Legionnaire Osha Pen.\n• Wildside is an upscale and well-guarded society club secreted away within Ugar proper.' },
  'body.straylight.blurb':   { sv: 'Senaste modeflugan.', en: 'The latest fad, the Straylight is an upscale club and cocktail bar where elites can wine and dine.' },
  'body.straylight.details': { sv: 'Senaste modeflugan. Irrblosset är en exklusiv klubb och cocktailbar där societeten kan äta och dricka gott. Den kretsar vanligen kring Aleph, men kan förflytta sig till andra planeter och månar i systemet. Ägaren, Chance, håller hårt i tyglarna ... men saker kan alltid spåra ur.', en: 'The latest fad, the Straylight is an upscale club and cocktail bar where elites can wine and dine. It usually orbits Aleph, though it can move to other planets and moons within the system. Its owner, Chance, runs a tight establishment ... but things can always get out of hand.' },
  'body.the-cove.blurb':   { sv: 'Malströms pirater har byggt en station av havererade fraktskepp, lastcontainrar och stulet skrot.', en: 'The Maelstrom pirates have made a station out of derelict freighters, cargo containers, and stolen scrap metal.' },
  'body.the-cove.details': { sv: 'Malströms pirater har byggt en station av havererade fraktskepp, lastcontainrar och stulet skrot. Detta hem kallar de "Lyan". Företagsamma individer kan lista ut var det ligger om de har envisheten eller kontakterna som krävs — även om det flyttar sig runt inom Ashtarimolnet. Endast piraternas närmaste vänner kan få tillgång till stormdrivor för att lättare navigera dit.\n\nRegel\n\nKonflikter vid Lyan är utbredda, men på Banshees befallning är mord förbjudet. De som behöver göra upp blodsfejder får ta till kidnappning och döda folk utanför Molnet.\n\nScen\n\nSnabba vad läggs på ett handgemäng mellan två kaptener över förolämpningar. Blåvita gnistor från underhållsarbetare som svetsar på ett nytt skepp. Färskvatten som duggar över rader av hydroponikodlingar. En stationsövergripande sändning om Banshees senaste erövring, följd av jubel genom hallarna.\n\nFramstående\n• Piratdrottning Alanda "The Banshee" Ryle — Malströms ledare, större än livet, hatar Hegemonin.\n• Praxis Ivanov — köpman med en flera hundra år lång tatuerad historia.\n• Kai Quag — mellanchef i Kobaltsyndikatet, ordnar beskydd åt smuggelfärder.', en: 'The Maelstrom pirates have made a station out of derelict freighters, cargo containers, and stolen scrap metal. They call this home "the Cove." Enterprising individuals can discover where it is located if they have the tenacity or contacts — though it moves about within the Ashtari Cloud. Only the best friends of pirates might be granted storm drives to better navigate with.\n\nRule\n\nConflicts at the Cove are rampant, but by Banshee\'s decree no murder is allowed. Those needing to settle blood feuds resort to kidnapping and killing folks outside the Cloud.\n\nScene\n\nQuick bets taken on an open brawl between two captains over slights. Bluewhite sparks of maintenance workers welding on a new ship. Fresh water misting over rows of hydroponics. A station-wide broadcast of the Banshee\'s latest conquest, followed by cheers throughout the halls.\n\nNotables\n• Pirate Queen Alanda "The Banshee" Ryle — Maelstrom\'s leader, larger-than-life, hates the Hegemony.\n• Praxis Ivanov — merchant with a centuries-long tattooed history.\n• Kai Quag — Cobalt Syndicate mid-boss, arranges protection for smuggling runs.' },
  'body.todav.blurb':   { sv: 'Todav är Skymningens femte måne.', en: 'Todav is the fifth moon of Nightfall.' },
  'body.todav.details': { sv: 'Todav är Skymningens femte måne. På ytan ligger Dendara — ett uråldrigt tempel. Somliga säger att det är ett Ur-tempel, andra att det är resterna av en bortglömd mystikerkult. Dess övergivna korridorer är svåra att ta sig fram i, dels eftersom månen saknar atmosfär, dels för att den får drivsystem och elektronik att glappa.', en: 'Todav is the fifth moon of Nightfall. On its surface sits Dendara — an ancient temple. Some say it\'s an Ur temple, others that it\'s the remains of a forgotten mystic Cult. Its derelict corridors are tough to tour due to the moon\'s lack of atmosphere and the glitching effect it has on drives and electronics.' },
  'body.vet.blurb':   { sv: 'Den ringförsedda gasjätte som SB-176 kretsar kring.', en: 'The ringed gas giant that SB-176 orbits.' },
  'body.vet.details': { sv: 'Den ringförsedda gasjätte som SB-176 kretsar kring. I Vets övre atmosfär hänger Gillets borriggar — automatiserade borrplattformar på vajrar som utvinner resurser för stationen ovanför. Man landar aldrig egentligen; man förtöjer vid en rigg.', en: 'The ringed gas giant that SB-176 orbits. Vet\'s upper atmosphere hosts the Guild\'s "borriggar" — automated drill rigs suspended on cables, harvesting resources for the station overhead. You never really land here; you moor at a rig.' },
  'body.vos.blurb':   { sv: 'Känd i hela Procyon under smeknamnet ”Glimmer”.', en: 'Known throughout Procyon by its nickname "Glimmer," the surface of this enormous planet is made of carbon compounuds such as graphite and diamond.' },
  'body.vos.details': { sv: 'Känd i hela Procyon under smeknamnet ”Glimmer”. Ytan på denna väldiga planet består av kolföreningar som grafit och diamant. Om natten glöder de största kristallformationerna med ett överjordiskt ljus — en egenskap som många av kristallerna behåller även efter slipning. Man måste docka vid Gillestation IA-23 i omloppsbana och ta skyttel ner för att göra affärer på ytan.\n\nFolk och platser:\n• Gillestation IA-23: Den enda lagliga hamnen på Vos, hårt styrd och övervakad av Gillet.\n• Impera Evazan: Högt uppsatt logistikofficer i Gillet med ansvar för kristallbrytningen, och med ingående kunskap om stora delar av Gillets försörjningskedja.\n• Morek och RA-NA: Procyons mest fruktade prisjägare och hans AI-partner. Kontrakterade för att spåra upp var och en som sätter sig upp mot Gillet.\n• Yola Sprekk: Juvelerare känd för att utnyttja de säregna egenskaperna hos Vos kristaller. Hennes skapelser är kanske de mest konstfulla föremålen i hela Procyon. Ett smycke av Sprekk kan öppna dörrar till de allra finaste kretsarna.', en: 'Known throughout Procyon by its nickname "Glimmer," the surface of this enormous planet is made of carbon compounuds such as graphite and diamond. At night, the largest crystal formations glow with unearthly light - a property many of the crystals retain after being cut. One must dock at Guild Station IA-23 in orbit, and shuttle down to do any business on the surface.\n\nPeople and Places:\n• Guild Station IA-23: The only legal port on Vos, heavily run and monitored by the Guild.\n• Impera Evazan: High-ranking Guild logistics officer responsible for crystal mining, with in-depth knowledge of much of the Guild\'s supply chain structure.\n• Morek and RA-NA: The most feared bounty hunter in Procyon and his AI partner. On retainer to hunt down anyone who crosses the Guild.\n• Yola Sprekk: Jeweler known for using the unique properties of Vos crystals. Her creations may be the most artful pieces in Procyon. A Sprekk piece can open doors to the most elite circles.' },
  'body.warren.blurb':   { sv: 'Grytet är en av Alephs månar och hyser en ekumenopolis — en stad som täcker hela månens yta.', en: 'Warren is one of the moons of Aleph and the home to an ecumenopolis - a city spanning the entire surface of the moon.' },
  'body.warren.details': { sv: 'Grytet är en av Alephs månar och hyser en ekumenopolis — en stad som täcker hela månens yta. Det är systemets huvudstad, och guvernör Ritam al\'Malklä har sin residens här. På Grytet kan du hitta vad du än behöver ... för rätt pris. Höghusen är fulla av legitima affärer — på gatorna är det betydligt tunnare med legitimiteten.\n\nFolk och platser\n• Blinda tigern är en illegal spelhåla specialiserad på burfäktning, driven av Pasha Qu\'Olin.\n• Guvernörspalatset är det välbevakade och tungt säkrade hemmet för guvernör Ritam al\'Malklä\n• Lock Luna är den mest ökända baren i understaden, driven av Liara Uria.\n• Spegellabyrinten är en exklusiv klubb. Medlemskapet är både slutet och dyrt, och betraktas som ett tecken på utsökt smak bland societeten och Adelshusen.\n\nTurism\n\nGrytets specialitet är gatumat som äts med fingrarna, mestadels avsedd att ätas i farten eller utsträckt i en soffa, utan bestick eller tallrikar. Rullar som till största delen består av svamp, ris och proteintartar.', en: 'Warren is one of the moons of Aleph and the home to an ecumenopolis - a city spanning the entire surface of the moon. It\'s the capitol of the system, and Governor Ritam al\'Malklaith makes his residence here. On Warren, you can find anything you need ... for a price. Its high-rises are full of legitimate business dealings, and its streets full of far less legitimacy.\n\nPeople and Places\n• The Blind Tiger is an underground gambling house, specializing in pit fighting, run by Pasha Qu\'Olin.\n• The Governor\'s Mansion is the well-guarded and heavily secured home to Governor Ritam al\'Malklaith\n• The Lock Luna is the most infamous bar in the undercity, run by Liara Uria.\n• The Mirror Maze is an upscale club. Membership is both exclusive and expensive, and considered a mark of exquisite taste by members of high society and Noble Houses.\n\nTourism\n\nThe specialty cuisine of Warren is hand-food, mostly made to be eaten on the go or lounging, with no need for cutlery or plates. Rolls consisting mostly of mushrooms, rice, and protein tartare.' },
  'body.zx1138.blurb':   { sv: 'En komet med lång omloppsperiod har nyligen vikit av från sin bana och tar sig nu betydligt närmare Indri.', en: 'A long-period comet has recently diverged from its course, taking it much closer to Indri.' },
  'body.zx1138.details': { sv: 'En komet med lång omloppsperiod har nyligen vikit av från sin bana och tar sig nu betydligt närmare Indri. Vad som ligger bakom kursändringen är oklart, men lokalbefolkningen har bett guvernören utreda saken. Mystiker hävdar att förändringen har rubbat systemets Strålådror, så att Ådern ibland uppför sig oberäkneligt.', en: 'A long-period comet has recently diverged from its course, taking it much closer to Indri. Reasons for the course change are unclear, but locals have requested the Governor investigate. Mystics claim that this has shifted the system Way lines, making the Way sometimes act unpredictably.' },

  /* --------------- factions --------------------------------------------- */
  'faction.malklaith.name': { sv: 'Hus Malklä', en: 'House Malklaith' },
  'faction.malklaith.blurb': { sv: 'Sektorns styrande adelshus. Guvernör Ritam al\'Malklä har säte på Grytet.', en: 'The sector\'s ruling Noble House. Governor Ritam al\'Malklaith is seated on Warren.' },
  'faction.guild.name': { sv: 'Ingenjörsgillet', en: 'Guild of Engineers' },
  'faction.guild.blurb': { sv: 'Utvinning, cybernetik, Ur-tech. Hårda mot arbetare, kompromisslösa i sitt intresse.', en: 'Extraction, cybernetics, Ur tech. Ruthless with workers, uncompromising about their interests.' },
  'faction.cobalt.name': { sv: 'Kobaltsyndikatet', en: 'Cobalt Syndicate' },
  'faction.cobalt.blurb': { sv: 'En före detta arbetarfackförening — nu smuggling och utpressning. Kajer på Grytet.', en: 'Once a labor union, now smuggling and extortion. Docks on Warren.' },
  'faction.maelstrom.name': { sv: 'Malström', en: 'Maelstrom' },
  'faction.maelstrom.blurb': { sv: 'Piratflottan som slår till från Ashtarimolnet. Leds av Banshee Ryle från Lyan.', en: 'The pirate fleet that strikes from the Ashtari Cloud. Led by Banshee Ryle from The Cove.' },
  'faction.turner.name': { sv: 'Turnarsällskapet', en: 'Turner Society' },
  'faction.turner.blurb': { sv: 'Löst nätverk av societetshus och exklusiva klubbar. Diskretion mot betalning.', en: 'Loose network of society houses and exclusive clubs. Discretion for a price.' },
  'faction.seekers.name': { sv: 'Sökarnas kult', en: 'Cult of the Seekers' },
  'faction.seekers.blurb': { sv: 'Vandrande mystiker som söker Föregångarnas artefakter. Vill öppna Hantuporten.', en: 'Wandering mystics seeking Precursor artefacts. Want to open the Hantu Gate.' },
  'faction.nightspeakers.name': { sv: 'Nattviskarna', en: 'Nightspeakers' },
  'faction.nightspeakers.blurb': { sv: 'Mystikkult vars invigda tränar på det mörka skeppet Svartstjärnan.', en: 'Mystery cult whose initiates train aboard the dark ship Blackstarr.' },
  'faction.legion.name': { sv: 'Legionen', en: 'The Legion' },
  'faction.legion.blurb': { sv: 'Hegemonins militär. Tung närvaro vid Stjärnsmedernas varv i Iota.', en: 'The Hegemony\'s military. Heavy presence at the Starsmiths shipyards in Iota.' },
  'faction.borniko.name': { sv: 'Bornikosyndikatet', en: 'Borniko Syndicate' },
  'faction.borniko.blurb': { sv: 'Tekniktjuvar. Specialiserade på högteknologiska varor. Guld hatar dem.', en: 'Tech thieves specialising in high-end technological supplies. The Guild hates them.' },
  'faction.echo.name': { sv: 'Ekovågsryttarna', en: 'Echo Wave Riders' },
  'faction.echo.blurb': { sv: 'Illegala racingpiloter som tävlar genom Glödbrisen. Elitistiska, dödsföraktande.', en: 'Illegal racing pilots competing through Bright Wind. Elitist, death-defying.' },
  'panel.factions.title': { sv: 'FRAKTIONER', en: 'FACTIONS' },

  /* --------------- HUD chrome ------------------------------------------- */
  'hud.title':       { sv: 'PROCYONSEKTORN',      en: 'PROCYON SECTOR' },
  'hud.subtitle':    { sv: 'IE-21 · HEGEMONINS UTKANT', en: 'IE-21 · HEGEMONY OUTSKIRTS' },
  'hud.hint':        {
    sv: 'Klicka på ett system för att zooma in · Esc för att backa',
    en: 'Click a system to zoom in · Esc to back out'
  },
  'crumb.sector':    { sv: 'Sektorn',              en: 'Sector' },
  'crumb.place':     { sv: 'Plats',                en: 'Location' },
  'index.head.rin':  { sv: 'RIN',                  en: 'RIN' },
  'index.head.holt': { sv: 'HOLT',                 en: 'HOLT' },
  'index.head.iota': { sv: 'IOTA',                 en: 'IOTA' },
  'index.head.brekk':{ sv: 'BREKK',                en: 'BREKK' },

  'loc.details':     { sv: 'Läs mer',       en: 'Details' },
  'loc.close':       { sv: 'Stäng',         en: 'Close' },
  'loc.link':        { sv: 'Läs artikeln →',      en: 'Read the article →' },
  'loc.placeholder': { sv: 'bild saknas — {id}',   en: 'image missing — {id}' },

  'lang.sv':         { sv: 'SV', en: 'SV' },
  'lang.en':         { sv: 'EN', en: 'EN' },
  'lang.debug':      { sv: '⚙',  en: '⚙' },
  'lang.tooltip':    { sv: 'Byt språk', en: 'Change language' },

  // Faction panel chrome. Section labels key off the English section names
  // used in factions-data.js, which are identifiers rather than prose.
  'panel.factions.wide':          { sv: 'HELA SEKTORN', en: 'SECTOR-WIDE' },
  'faction.tier':                 { sv: 'Nivå', en: 'Tier' },
  'faction.elsewhere':            { sv: 'Även aktiva i', en: 'Also active in' },
  'faction.sec.Current Objective':{ sv: 'Mål just nu', en: 'Current objective' },
  'faction.sec.Situation':        { sv: 'Läget', en: 'Situation' },
  'faction.sec.Turf':             { sv: 'Revir', en: 'Turf' },
  'faction.sec.NPCs':             { sv: 'Personer', en: 'People' },
  'faction.sec.Notable Assets':   { sv: 'Tillgångar', en: 'Notable assets' },
  'faction.sec.Quirks':           { sv: 'Egenheter', en: 'Quirks' },
  'faction.sec.Allies':           { sv: 'Allierade', en: 'Allies' },
  'faction.sec.Enemies':          { sv: 'Fiender', en: 'Enemies' },

  // About panel — credits for the material this map is built from.
  'about.button':   { sv: 'Om', en: 'About' },
  'about.title':    { sv: 'Om den här kartan', en: 'About this map' },
  'about.intro':    {
    sv: 'En navigerbar karta över Procyonsektorn, byggd som spelhjälpmedel för ett hemmabord. Ideellt och utan vinstsyfte.',
    en: 'A navigable map of the Procyon Sector, built as a play aid for a home table. Non-commercial and unofficial.' },
  'about.sources':  { sv: 'Källor', en: 'Sources' },
  'about.sb':       {
    sv: '**Scum and Villainy** (Off Guard Games) — Procyonsektorns kapitel. Platser, fraktioner och systembeskrivningar är hämtade därifrån.',
    en: '**Scum and Villainy** (Off Guard Games) — the Procyon Sector chapter. Locations, factions and system descriptions are drawn from it.' },
  'about.wa':       {
    sv: '**World Anvil** — kompletterande material om sektorn, hämtat från två publika wikis:',
    en: '**World Anvil** — supplementary sector material, taken from two public wikis:' },
  // Rendered as links; the label is the world's own title.
  'about.wa1.label': { sv: 'Procyon Sector IE-21 (ivangames)',
                       en: 'Procyon Sector IE-21 (ivangames)' },
  'about.wa1.url':   { sv: 'https://www.worldanvil.com/w/procyon-sector-ie-21-ivangames',
                       en: 'https://www.worldanvil.com/w/procyon-sector-ie-21-ivangames' },
  'about.wa2.label': { sv: 'The Procyon Sector (Marius D\'jaed\'r)',
                       en: 'The Procyon Sector (Marius D\'jaed\'r)' },
  'about.wa2.url':   { sv: 'https://whitelabel.worldanvil.com/w/the-procyon-sector-marius-d-jaed-r',
                       en: 'https://whitelabel.worldanvil.com/w/the-procyon-sector-marius-d-jaed-r' },
  'about.art':      {
    sv: '**Bilderna** är genererade för det här projektet i svartvitt serietuschmanér, efter källbokens stil.',
    en: '**The artwork** was generated for this project in black-and-white comic inking, following the sourcebook\'s style.' },
  'about.translation': {
    sv: '**Översättningen** är min egen och inte ordagrann. Flera namn och begrepp är valda för klangens skull snarare än för exakthet — *the Way* har blivit **Ådern**, *Warren* har blivit **Grytet**, och så vidare.',
    en: '**The Swedish translation** is my own and not literal. Several names and terms were chosen for how they sound rather than for accuracy — *the Way* became **Ådern**, *Warren* became **Grytet**, and so on.' },
  'about.rights':   {
    sv: 'Scum and Villainy och Procyonsektorn tillhör sina upphovspersoner. Den här kartan gör inga anspråk på dem.',
    en: 'Scum and Villainy and the Procyon Sector belong to their creators. This map makes no claim to them.' },
};
