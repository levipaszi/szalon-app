/* ==========================================================================
   Bizonyítékokon Alapuló Trichológiai & Kozmetikai Kémiai Hajápolási Tudásbázis
   - Zéró márkanév, zéró weboldal-hivatkozás
   - Zéró káros konyhai DIY tévhit (nincs szódabikarbóna, ecet, citrom, nyers tojás,
     sem olajpakolás zsíros/seborrheás fejbőrre)
   - Lépésről lépésre követhető, közérthető szakmai protokoll minden hajtípusra
   ========================================================================== */

(function (global) {
  'use strict';

  const MANDATORY_DISCLAIMER =
    'Szakmai tájékoztató: Ezek általános szakmai ajánlások, azonban minden haj egyedi működése, környezeti terhelése és az otthon használt anyagok sokfélesége miatt az ideális egyéni ápolás az ajánlottól eltérő is lehet.';

  const POROSITY_GUIDE = {
    title: 'Hogyan állapítsd meg a hajad porozitását otthon?',
    intro:
      'A porozitás azt mutatja meg, mennyire zártak vagy nyitottak a hajszál külső pikkelylemezei (kutikula). Ez határozza meg, hogyan veszi fel és tartja meg a hajad a nedvességet és a hatóanyagokat.',
    methods: [
      {
        name: '1. Tapintásos (csúszás) próba – a legmegbízhatóbb',
        steps:
          'Fogj egy tiszta, száraz hajszálat két ujjad közé, és húzd végig az ujjaidat a hajvégtől felfelé, a hajtő irányába. Ha teljesen simának, üvegszerűnek érzed: alacsony porozitás. Ha enyhén egyenetlen: közepes (normál) porozitás. Ha érdesnek, akadozónak, száraznak érzed: magas porozitás.'
      },
      {
        name: '2. Vízpróba és száradási viselkedés',
        steps:
          'Figyeld meg hajmosás közben: ha a víz eleinte lepereg a hajról, nehezen ázik át, és mosás után nagyon lassan szárad, a porozitás alacsony. Ha egyenletesen ázik át és normál ütemben szárad: közepes. Ha szivacsként azonnal magába szívja a vizet, viszont szárítás nélkül is gyorsan megszárad és könnyen szöszösödik: magas porozitás. (Egy tiszta, termékmentes kihullott hajszál egy pohár szobahőmérsékletű vízben alacsony porozitásnál a felszínen úszik, közepesnél lassan lebeg, magas porozitásnál gyorsan lesüllyed.)'
      }
    ]
  };

  const WIZARD_OPTIONS = {
    textures: [
      { id: 'straight', label: 'Egyenes (1A–1C)', desc: 'Nincs benne természetes hullám, a faggyú könnyebben eljut a hajhosszra.' },
      { id: 'wavy', label: 'Hullámos (2A–2C)', desc: 'S-alakú lágy vagy erősebb hullámok, párás időben hajlamos a szöszösödésre.' },
      { id: 'curly', label: 'Göndör (3A–3C)', desc: 'Határozott loknik és spirálok, természetesen szárazabb hajhossz.' },
      { id: 'coily', label: 'Spirál / Afro (4A–4C)', desc: 'Szoros S- vagy Z-mintázatú fürtök, fokozott nedvesség- és lipidingény.' }
    ],
    thicknesses: [
      { id: 'fine', label: 'Vékony szálú', desc: 'Könnyen elnehezedik, gyorsan elveszíti a tartását.' },
      { id: 'medium', label: 'Normál', desc: 'Kiegyensúlyozott rugalmasság, a legtöbb textúrát jól viseli.' },
      { id: 'coarse', label: 'Vastag szálú', desc: 'Erősebb, merevebb szálak, gazdagabb puhító ápolást igényel.' }
    ],
    porosities: [
      { id: 'low', label: 'Alacsony porozitás', desc: 'Zárt pikkelyréteg, lassan ázik át és lassan szárad, könnyen elnehezedik.' },
      { id: 'medium', label: 'Közepes (normál) porozitás', desc: 'Kiegyensúlyozott vízfelvevő és -megtartó képesség.' },
      { id: 'high', label: 'Magas porozitás', desc: 'Nyitott vagy sérült kutikula, gyorsan felveszi és gyorsan elveszíti a nedvességet.' }
    ],
    maleExtras: [
      { id: 'none', label: 'Csak hajápolás', desc: 'Standard hajszerkezet alapú rutin.' },
      { id: 'short_style', label: 'Rövid haj / Fade formázás is', desc: 'Kiegészítés rövid haj tisztításáról és megfelelő matt/krémes formázásáról.' },
      { id: 'beard_and_short', label: 'Szakállápolás + Rövid haj formázás', desc: 'Teljes férfi rutin: fejbőr, rövid haj formázás és bőrbarát szakállápolás.' }
    ],
    treatments: [
      { id: 'natural', label: 'Natúr (kezeletlen)', desc: 'Nincs festve, szőkítve vagy vegyileg kezelve.' },
      { id: 'colored', label: 'Festett', desc: 'Tartós vagy féltartós hajfestékkel színezett.' },
      { id: 'bleached', label: 'Szőkített / Melírozott / Balayage', desc: 'Világosított haj, emelt porozitással és megnövekedett fehérje- és lipidingénnyel.' },
      { id: 'heat', label: 'Rendszeresen hőformázott', desc: 'Gyakori hajvasalás, göndörítés vagy magas hőfokú szárítás.' }
    ],
    scalps: [
      { id: 'normal', label: 'Normál fejbőr', desc: 'Nem húzódik, nem viszket, 2–4 napig kényelmesen tiszta marad.' },
      { id: 'oily', label: 'Zsírosodó fejbőr', desc: '1–2 napon belül lelapul a hajtő, fokozott faggyútermelés jellemzi.' },
      { id: 'dry', label: 'Száraz, húzódó fejbőr', desc: 'Hajmosás után feszül, száraz tapintású, apró fehér hámlás előfordulhat.' },
      { id: 'seborrheic', label: 'Érzékeny, korpásodó (seborrheás)', desc: 'Viszketés, sárgás vagy tapadó korpa, zsírosodással kísért irritáció.' }
    ],
    concerns: [
      { id: 'breakage', label: 'Töredezés, kettéváló hajvégek' },
      { id: 'color_fade', label: 'Gyors színkopás, fakóság' },
      { id: 'frizz', label: 'Szöszösödés (frizz), szálló szálak' },
      { id: 'no_volume', label: 'Tartás és volumen hiánya' },
      { id: 'hair_loss', label: 'Fokozott hajhullás / ritkulás' },
      { id: 'scalp_inflammation', label: 'Makacs fejbőrgyulladás / erős viszketés' }
    ]
  };

  function buildRedFlag(answers) {
    const hasLoss = answers.concerns.includes('hair_loss');
    const hasInflammation = answers.concerns.includes('scalp_inflammation');
    if (!hasLoss && !hasInflammation) return null;

    const points = [];
    if (hasLoss) {
      points.push(
        'Nagylabor vérvétel javasolt: teljes vérkép, szérum vas és kiemelten a ferritin (vasraktár – a hajhagymák működéséhez gyakran a labor alsó határánál magasabb szint szükséges), D-vitamin (25-OH-D), B12-vitamin, folsav és cink szint ellenőrzése.'
      );
      points.push(
        'Teljes pajzsmirigy panel: nem elég csupán a TSH! Kérj TSH, fT3, fT4 és anti-TPO vizsgálatot, mivel mind a pajzsmirigy-alulműködés, mind a túlműködés vagy autoimmun gyulladás okozhat diffúz hajhullást.'
      );
      points.push(
        'Góckutatás: egy tünetmentes, krónikus gyulladás is fenntarthatja a hajvesztést. Első lépésként fogászati góckutatás (digitális panorámaröntgen) és szükség esetén fül-orr-gégészeti vagy nőgyógyászati/urológiai ellenőrzés javasolt.'
      );
      points.push(
        'Hormonpanel és szakorvosi vizsgálat: ha a ritkulás a választéknál vagy a halántéknál kifejezettebb, bőrgyógyászati / trichológiai vizsgálat (trichoszkópia) és hormonpanel (pl. szabad tesztoszteron, DHEA-S, prolaktin, inzulinrezisztencia vizsgálat) indokolt.'
      );
    }
    if (hasInflammation) {
      points.push(
        'Makacs, fájó, vörös, sebesedő vagy tartósan viszkető fejbőr esetén a kozmetikai samponok önmagukban nem helyettesítik az orvosi diagnózist: bőrgyógyászati vizsgálat szükséges a seborrheás dermatitisz, a fejbőr pikkelysömöre (psoriasis), kontakt allergia vagy gombás/bakteriális gyulladás elkülönítéséhez.'
      );
    }

    return {
      title: 'Orvosi & Góckutatási Figyelmeztetés',
      lead:
        'A fokozott hajhullás, látványos ritkulás vagy makacs fejbőrgyulladás hátterében nagyon gyakran belső gyulladásos folyamat, mikrotápanyag-hiány vagy hormonális/pajzsmirigy-eltérés áll. A külső ápolás ezeket a belső okokat nem tudja megoldani – érdemes az alábbi kivizsgálási lépéseket megtenni:',
      points
    };
  }

  function buildWashingProtocol(answers) {
    const isCurlyOrCoily = answers.texture === 'curly' || answers.texture === 'coily';
    const isWavy = answers.texture === 'wavy';
    const isOilyOrSeb = answers.scalp === 'oily' || answers.scalp === 'seborrheic';
    const isHighPorosity = answers.porosity === 'high' || answers.treatment === 'bleached';
    const isFine = answers.thickness === 'fine';

    // 1. Előkészítés
    const prepSteps = isCurlyOrCoily
      ? [
          'Göndör és spirál hajat NE fésülj ki szárazon kefe segítségével, mert feltöri a fürtöket és mechanikai töredezést okoz. A kibontást mindig hajmosás közben, bő balzsammal átitatott, vizes hajon végezd el ujjaiddal vagy ritka fogú fésűvel, alulról felfelé haladva!',
          'Mosás előtt legalább 40–60 másodpercig alaposan áztasd át a fejbőrödet és a teljes hajhosszt langyos vízzel, hogy a felületi por feloldódjon és a sampon egyenletesen el tudjon oszlani.'
        ]
      : [
          'Hajmosás előtt szárazon, kíméletesen fésüld ki a hajadat: mindig a hajvégeknél kezdd el, apró szakaszokban haladj felfelé a hajtő irányába! Így elkerülöd a vizes állapotban történő gubancolódást és szakadást.',
          'Zuhany alatt először 30–60 másodpercig alaposan nedvesítsd át a teljes fejbőrt és hajhosszt langyos (nem forró!) vízzel, mielőtt bármilyen sampont felviszel.'
        ];

    // 2. Tisztítás (Dupla samponozás)
    const washSteps = [
      'Vízhőmérséklet: Mindig langyos vizet használj! A túl forró víz roncsolja a fejbőr természetes lipidgátját, fokozhatja a szárazságot és a faggyú-kompenzációt, valamint gyorsítja a hajszín kopását.',
      'Felhabosítás tenyérben: Soha ne nyomd a tömény sampont közvetlenül egy pontra a fejbőrödre. Nyomj egy mogyorónyi–diányi mennyiséget a tenyeredbe, adj hozzá kevés vizet, és a két tenyered között dörzsöld habos emulzióvá.',
      'Csak a fejbőrt mosd, ujjbeggyel: A felhabosított sampont több ponton (halánték, fejtető, tarkó) oszlasd el a fejbőrön, majd kizárólag az ujjbegyeiddel, finom körkörös mozdulatokkal masszírozd át 1–2 percig. Soha ne kapard körömmel, és ne dörzsöld össze a hajvégeket – a lecsorgó hab pontosan elég a hajhossz tisztításához!',
      '1. samponozás szerepe: Ez a mosás feloldja a faggyút, a port, az izzadságot és a hajformázó maradványokat. Ilyenkor kevésbé habzik a sampon – ez teljesen normális, ne tegyél rá dupla adagot, inkább öblítsd le alaposan!',
      '2. samponozás szerepe: A tiszta felületen sokkal kevesebb sampon is sűrű, krémes habot képez. Ez a mosás tisztítja meg igazán a pórusok környékét és viszi be a célzott hatóanyagokat (pl. nyugtató, faggyúszabályozó vagy korpásodás elleni összetevőket). Öblítsd ki maradéktalanul!'
    ];

    if (answers.scalp === 'seborrheic') {
      washSteps.push(
        'Seborrheás / korpásodó fejbőr szabály: A második samponozás habját érdemes 2–3 percig a fejbőrön hagyni hatni öblítés előtt, hogy a gombaellenes/nyugtató hatóanyag kifejthesse a hatását. Szigorúan kerüld a házi olajpakolásokat a fejbőrön (a legtöbb növényi olaj zsírsavai táplálják a korpásodást okozó Malassezia élesztőgombát, így rontják a gyulladást)!'
      );
    } else if (answers.scalp === 'oily') {
      washSteps.push(
        'Zsírosodó fejbőr szabály: Ne próbáld „kiszárítani” a fejbőröd alkohollal vagy ritka mosással „leszoktatni” a zsírosodásról – a faggyútermelés hormonálisan szabályozott. Moss hajat olyan gyakran (akár 1–2 naponta), amilyen gyakran a fejbőröd igényli, kíméletes, fejbőrbarát samponnal.'
      );
    } else if (answers.scalp === 'dry') {
      washSteps.push(
        'Száraz, húzódó fejbőr szabály: Kerüld az erős szulfátokat (SLS/SLES), válassz kíméletes amfoter/glükozid alapú sampont, és a hajmosás végén ne használj forró vizet vagy forró hajszárítót közvetlenül a fejbőrön.'
      );
    }

    // 3. Kondicionálás & Pakolás mikéntje
    const condSteps = [
      'A felesleges víz kinyomkodása (kulcslépés!): Mielőtt balzsamot vagy hajpakolást vinnél fel, a tenyereid között kíméletesen nyomkodd ki a felesleges vizet a hajhosszból (ne csavard erővel!). A csuromvizes hajon a hatóanyag felhígul és azonnal lecsúszik, így alig fejti ki a hatását.',
      'Hová kerüljön: A balzsamot és a maszkot kizárólag a fül vonalától lefelé, a hajhosszra és a hajvégekre vidd fel – a fejbőrt hagyd ki, hogy a hajtő ne nehezedjen el és ne tömődjenek el a tüszők.',
      'Pakolás vs. Balzsam helyes sorrendje: Ha hajpakolást (maszkot) használsz (heti 1 alkalommal), a sorrend: 1) Dupla samponozás → 2) Víz kinyomkodása → 3) Hajpakolás (5–15 perc hatóidő, típusa szerint) → alapos öblítés → 4) Hajbalzsam (1–3 perc) → öblítés. Miért? A maszk kisebb molekulájú, mélyebb ápoló anyagokat juttat a hajba, míg a savasabb pH-jú balzsam kationos összetevői simítják és zárják le a külső pikkelyréteget (kutikulát) a folyamat végén.',
      isHighPorosity
        ? 'Magas porozitás / szőkített haj tipp: A hajhossz könnyen veszíti a vizet és sérült a lipidrétege, ezért heti 1x használj aminosavakat/hidrolizált fehérjét ÉS lipideket (pl. ceramid, zsíralkoholok) is tartalmazó pakolást, majd zárd le balzsammal és öblítésmentes (leave-in) ápolóval.'
        : isFine
          ? 'Vékony szálú haj tipp: Könnyű, folyékonyabb állagú balzsamot válassz, kis mennyiségben, és alaposan öblítsd ki, hogy megmaradjon a hajad természetes volumene.'
          : 'Normál / vastag haj tipp: A balzsamot vizes fésüléssel vagy ujjaiddal egyenletesen oszlasd el a tincseken, hagyd hatni 2–3 percig, majd langyos vízzel öblítsd ki.'
    ];

    // 4. Szárítás & Hővédelem
    const drySteps = [
      'Törölközés dörzsölés nélkül: Soha ne dörzsöld durván frottír törölközővel a vizes hajat (a nedves hajszál rugalmassága megváltozik, könnyen sérül a kutikula és szöszösödik). Finom nyomkodó-itató mozdulatokkal itasd fel a vizet mikroszálas törölközővel vagy puha pamutpólóval.',
      'Hővédő felvitele: Hajszárítás előtt a törölközőszáraz hajhosszra mindig vigyél fel hővédő készítményt (spray vagy könnyű krém formájában), és egyenletesen oszlasd el rajta.',
      isCurlyOrCoily || isWavy
        ? 'Szárítási technika hullámos/göndör hajra: A hajtövet mindenképp szárítsd meg alacsony–közepes hőfokon (a nedves, befülledt fejbőr kedvez a gombás irritációnak!). A hajhosszt diffúzorral, alacsony légárammal és közepes/alacsony hőfokon szárítsd (lásd a lenti CGM blokkot).'
        : 'Szárítási irány és hőfok: Használj szűkítő fejet a hajszárítón, és a levegőt mindig felülről lefelé, a hajszálak szálirányában fújd (a hajtőtől a hajvégek felé)! Ez kisimítja a pikkelylemezeket és természetes fényt ad. Maradj közepes hőfokon, a végén pedig egy rövid langyos/hűvös levegős átfújással rögzítsd a formát.',
      'Vizes hajjal alvás kerülése: Lehetőleg ne feküdj le teljesen vizes hajjal, mert a párnához való dörzsölődés mechanikailag töri a nedves szálakat, a hosszan nedves fejbőr pedig irritációt okozhat.'
    ];

    if (isOilyOrSeb) {
      drySteps.push(
        'Fejbőr-higiéniai plusz: Zsírosodó vagy seborrheás fejbőrnél különösen fontos, hogy a hajtövet mosás után mindig szárítsd meg langyos levegővel, ne hagyd órákig nedvesen pállani.'
      );
    }

    return [
      { title: '1. Előkészítés (Mosás előtt)', items: prepSteps },
      { title: '2. Tisztítás – A helyes dupla samponozás', items: washSteps },
      { title: '3. Kondicionálás & Pakolás mikéntje és sorrendje', items: condSteps },
      { title: '4. Kíméletes szárítás & Hővédelem', items: drySteps }
    ];
  }

  function buildCGMTemplate(answers) {
    if (answers.texture === 'straight') return null;

    const isWavy = answers.texture === 'wavy';
    const isHighPor = answers.porosity === 'high' || answers.treatment === 'bleached';
    const isLowPor = answers.porosity === 'low';

    const steps = [
      {
        name: '1. Kímélő tisztítás (Szulfát- és vízben nem oldódó szilikonmentes alap)',
        detail: isWavy
          ? 'Hullámos (2A–2C) hajon a túl nehéz mosóbalzsamok (co-wash) könnyen elnehezítik a hullámokat. Használj szulfátmentes, enyhe tenzideket tartalmazó sampont (pl. Coco-Glucoside, Sodium Cocoyl Isethionate), és 3–4 hetente egyszer végezz alaposabb tisztító (clarifying) mosást a formázó-lerakódások eltávolítására.'
          : 'Göndör/spirál (3A–4C) hajon válassz szulfátmentes, hidratáló sampont, és kerüld a vízben nem oldódó szilikonokat (pl. Dimethicone), mert kímélő samponnal nehezen moshatók ki és elzárhatják a nedvességet. 3–5 hetente egyszer kímélő tisztító mosás segít frissen tartani a fürtöket.'
      },
      {
        name: '2. Squish to Condish (Nedvesség bezárása)',
        detail:
          'A csuromvizes hajra vidd fel a szilikonmentes balzsamot, majd hajolj előre. Tenyeredbe vegyél egy kevés vizet, fogd bele a hajvégeket, és alulról felfelé nyomkodd (pumpáld) a fürtöket a fejbőr felé, amíg halk „cuppogó” hangot nem hallasz. Ez mechanikusan bejuttatja a vizet és a balzsamot a fürtökbe, miközben összerendezi a tincseket.'
      },
      {
        name: '3. Formázás vizes hajon & Plopping',
        detail: isWavy
          ? 'Törölközőszáraz vagy vizes hajon nyomkodj bele könnyű habot vagy közepes tartású szilikonmentes zselét. Ezután alkalmazd a plopping technikát: teríts le egy mikroszálas törölközőt vagy sima pamutpólót, engedd bele a fürtjeidet a fejtető irányába, kösd fel 10–15 percre, hogy a felesleges vizet dörzsölés nélkül felszívja.'
          : 'Vizes hajon rétegezz könnyű öblítésmentes (leave-in) krémet, majd közepes/erős tartású formázó zselét imádkozó kezek (praying hands) és nyomkodó mozdulatokkal. Ploppingolj mikroszálas törölközőben vagy pamutpólóban 15–20 percig.'
      },
      {
        name: '4. Diffúzoros szárítás & Cast feloldása (SOTC)',
        detail:
          'Szárítsd a hajat diffúzor fejjel, alacsony–közepes hőfokon és alacsony fokozatú légárammal. Ne nyúlj a hajadhoz száradás közben, mert az szöszösödést okoz! Ha a zselé száradás után kissé kemény réteget („cast”) képez, várd meg, míg a haj 100%-ban megszárad, majd tiszta tenyérrel (vagy 1–2 csepp könnyű hajolajjal) óvatosan nyomkodd ki belőle a merevséget (Scrunch Out The Crunch) – így maradnak puhák és tartósak a fürtök.'
      },
      {
        name: '5. Protein–Hidratáció egyensúly a te porozitásodhoz',
        detail: isHighPor
          ? 'Magas porozitású vagy szőkített hullámos/göndör hajad gyorsan veszíti a vizet és sérült a szerkezete: a hidratáló összetevők (glicerin, aloe, panthenol) mellett rendszeresen (minden 2–3. mosásnál) szükséged van fehérjére/aminosavakra (hidrolizált keratin, selyem- vagy búzaprotein) a rugalmasság visszanyeréséhez.'
          : isLowPor
            ? 'Alacsony porozitású hajad könnyen telítődik nehéz fehérjékkel és sűrű vajakkal (mint a nehéz shea vaj). Helyezd a hangsúlyt a könnyű vizes hidratálásra (panthenol, aloe, könnyű nedvesítők), és proteint csak ritkábban (3–4 hetente) alkalmazz.'
            : 'Közepes porozitásnál tartsd egyensúlyban a két oldalt: ha a fürtök túl puhák, nyúlósak és nem tartják a formát, több protein kell; ha szárazak, merevek, szálkásak, fokozd a hidratálást.'
      }
    ];

    return {
      title: isWavy
        ? 'Curly Girl Method (CGM) – Hullámos (2A–2C) Sablon'
        : 'Curly Girl Method (CGM) – Göndör & Spirál (3A–4C) Sablon',
      steps
    };
  }

  function buildMaleExtras(answers) {
    if (!answers.maleExtra || answers.maleExtra === 'none') return null;

    const blocks = [];

    blocks.push({
      title: 'Rövid haj & Fade formázási protokoll',
      items: [
        'Tiszta alap: A matt agyagok és paszták felhalmozódhatnak a fejbőrön – dupla, kímélő samponozással mindig távolítsd el a formázó-maradványokat, különösen, ha napi szinten használsz waxot vagy pasztát.',
        'Formázó választása hajszálvastagság alapján: Vékony szálú rövid hajra válassz könnyű matt hajpúdert, tengeri sós texturáló spray-t vagy vizes bázisú matt pasztát (a nehéz olajos pomádék összetapasztják). Vastag, merev hajra a kaolin/bentonit agyag alapú matt clay vagy erős vizes pomádé ad kontrollt.',
        'Felvitel technikája: Borsónyi mennyiséget dörzsölj el teljesen átlátszóra a két tenyered között, és hátulról előre haladva, száraz vagy enyhén nedves hajba dolgozd bele, végül ujjakkal vagy fésűvel állítsd be az irányt.'
      ]
    });

    if (answers.maleExtra === 'beard_and_short') {
      blocks.push({
        title: 'Bőrgyógyászati alapú szakállápolási protokoll',
        items: [
          'Tisztítás: A hagyományos hajsampon vagy szappan túl erős az arcbőrnek és kiszárítja a szakáll alatti bőrt (ez okozza a szakállkorpát és viszketést). Használj pH-semleges (pH 5.0–5.5), illatanyagban szegény arclemosót vagy kifejezetten szakállsampon formulát heti 3–4 alkalommal.',
          'Szárítás: Mosás után finoman itasd fel a vizet puha törölközővel; hosszabb szakállnál alacsony hőfokon, fésűvel lefelé vezetve szárítsd meg, hogy ne maradjon nedves az arcbőr.',
          'Hidratálás (Szakállolaj helyes használata): A szakállolaj valójában az alatta lévő arcbőrt és a szőrszálak puhaságát szolgálja. Törölközőszáraz szakállnál mindössze 2–5 csepp (hossztól függően) jojoba-, szkvalán- vagy argánolaj alapú szakállolajat masszírozz be egészen az arcbőrig, majd vaddisznósörtés vagy sima fésűvel oszlasd el. (Seborrheás arcbőr esetén olaj helyett könnyű, olajmentes niacinamidos vagy panthenolos hidratáló gélt válassz!)'
        ]
      });
    }

    return blocks;
  }

  function buildKeywords(answers) {
    const list = [];

    // 1. Sampon kulcsszó fejbőr szerint
    if (answers.scalp === 'seborrheic') {
      list.push({
        term: 'piroctone olamine korpásodás elleni sampon',
        why: 'Klinikailag igazolt hatóanyag a korpásodást okozó gombák és a fejbőr irritációjának csökkentésére.'
      });
    } else if (answers.scalp === 'oily') {
      list.push({
        term: 'niacinamid szalicilsav zsíros fejbőr sampon',
        why: 'Segít a felesleges faggyú és a lerakódások kíméletes oldásában, miközben támogatja a fejbőr egyensúlyát.'
      });
    } else if (answers.scalp === 'dry') {
      list.push({
        term: 'szulfátmentes panthenol érzékeny fejbőr sampon',
        why: 'Kíméletes tenzidekkel tisztít, miközben nyugtatja és hidratálja a húzódó fejbőrt.'
      });
    } else if (answers.texture !== 'straight') {
      list.push({
        term: 'szulfátmentes kímélő hidratáló sampon',
        why: 'Tisztít anélkül, hogy megfosztaná a hullámos/göndör hajszálakat a természetes lipidektől.'
      });
    } else {
      list.push({
        term: 'kímélő mindennapi pH semleges sampon',
        why: 'Kiegyensúlyozott, fejbőrbarát tisztítás a napi vagy kétnapi rutin alapjához.'
      });
    }

    // 2. Kondicionáló / Maszk kulcsszó
    if (answers.treatment === 'bleached' || answers.concerns.includes('breakage')) {
      list.push({
        term: 'ceramid aminosav szerkezetépítő hajpakolás',
        why: 'Pótolja a sérült pikkelyréteg lipidjeit és javítja a töredezésre hajlamos haj rugalmasságát.'
      });
    } else if (answers.texture !== 'straight') {
      list.push({
        term: 'szilikonmentes hidratáló hajbalzsam göndör hajra',
        why: 'CGM-kompatibilis kondicionálás, amely csökkenti a szöszösödést elnehezítés nélkül.'
      });
    } else if (answers.thickness === 'fine' || answers.concerns.includes('no_volume')) {
      list.push({
        term: 'könnyű volumenizáló panthenol hajbalzsam',
        why: 'Kifésülhetővé teszi a vékony szálú hajat anélkül, hogy elvenné a tartását.'
      });
    } else {
      list.push({
        term: 'hidratáló zsíralkoholos simító hajbalzsam',
        why: 'Lezárja a kutikulát, puhítja a hajhosszt és csökkenti a kifésüléskori mechanikai sérülést.'
      });
    }

    // 3. Hővédelem / Leave-in
    if (answers.treatment === 'heat' || answers.treatment === 'bleached' || answers.concerns.includes('frizz')) {
      list.push({
        term: 'hidrolizált keratin panthenol hővédő spray',
        why: 'Védőfilmet képez a hajszálakon a hajszárítás/formázás hőterhelése ellen és mérsékli a frizzt.'
      });
    } else if (answers.treatment === 'colored' || answers.concerns.includes('color_fade')) {
      list.push({
        term: 'UV szűrős színvédő öblítésmentes hajápoló',
        why: 'Lassítja a festett pigmentek oxidációját és a napsugárzás okozta fakulást.'
      });
    }

    // 4. Extra célzott hatóanyag (hajhullás / göndör formázás / szakáll)
    if (answers.concerns.includes('hair_loss')) {
      list.push({
        term: 'koffein niacinamid fejbőrszérum',
        why: 'Kiegészítő helyi támogatás a fejbőr mikrokeringéséhez és barrierjéhez (az orvosi kivizsgálás mellett).'
      });
    }
    if (answers.texture === 'curly' || answers.texture === 'coily' || answers.texture === 'wavy') {
      list.push({
        term: 'alkoholmentes szilikonmentes göndörítő hajzselé',
        why: 'Összetartja a hullámokat/fürtöket, megakadályozza a szöszösödést és kíméletesen kinyomkodható tartást ad.'
      });
    }
    if (answers.maleExtra === 'beard_and_short') {
      list.push({
        term: 'jojoba szkvalán illatmentes szakállolaj',
        why: 'Bőrrokon lipidekkel puhítja a szakállat és megelőzi az arcbőr kiszáradását.'
      });
    } else if (answers.maleExtra === 'short_style') {
      list.push({
        term: 'kaolin agyag vizes bázisú matt hajpaszta',
        why: 'Természetes, fénymentes tartást ad és könnyen kimosható a fejbőrről.'
      });
    }

    // Biztosítsuk, hogy 4-5 hasznos, egyedi keresőszó legyen
    if (list.length < 4) {
      list.push({
        term: 'mikroszálas hajtörölköző turbán',
        why: 'Dörzsölés nélkül szívja fel a felesleges vizet, jelentősen csökkentve a szöszösödést és a töredezést.'
      });
    }

    return list.slice(0, 5);
  }

  function generateAdvice(answers) {
    const textureObj = WIZARD_OPTIONS.textures.find((t) => t.id === answers.texture);
    const thickObj = WIZARD_OPTIONS.thicknesses.find((t) => t.id === answers.thickness);
    const porObj = WIZARD_OPTIONS.porosities.find((t) => t.id === answers.porosity);
    const treatObj = WIZARD_OPTIONS.treatments.find((t) => t.id === answers.treatment);
    const scalpObj = WIZARD_OPTIONS.scalps.find((t) => t.id === answers.scalp);

    const summaryTags = [
      textureObj ? textureObj.label : '',
      thickObj ? thickObj.label : '',
      porObj ? porObj.label : '',
      treatObj ? treatObj.label : '',
      scalpObj ? scalpObj.label : ''
    ].filter(Boolean);

    return {
      generatedAt: new Date().toISOString(),
      answers,
      summaryTags,
      redFlag: buildRedFlag(answers),
      washingProtocol: buildWashingProtocol(answers),
      cgmTemplate: buildCGMTemplate(answers),
      maleExtras: buildMaleExtras(answers),
      keywords: buildKeywords(answers),
      disclaimer: MANDATORY_DISCLAIMER
    };
  }

  global.HaircareEngine = {
    OPTIONS: WIZARD_OPTIONS,
    POROSITY_GUIDE,
    MANDATORY_DISCLAIMER,
    generateAdvice
  };
})(window);
