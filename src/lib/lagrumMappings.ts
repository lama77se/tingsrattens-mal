interface LagrumEntry {
  sakomrade: string;
  primart_lagrum: string[];
  alternativa_lagrum?: string[];
  kommentar?: string;
}

const mappings: Record<string, LagrumEntry> = {
  "grov misshandel": {
    sakomrade: "Brott mot liv och hälsa",
    primart_lagrum: ["BrB 3 kap. 6 §"],
  },
  "misshandel": {
    sakomrade: "Brott mot liv och hälsa",
    primart_lagrum: ["BrB 3 kap. 5 §"],
    alternativa_lagrum: ["BrB 3 kap. 6 § (grov misshandel)"],
  },
  "olaga hot": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 5 §"],
  },
  "ofredande": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 7 §"],
  },
  "hemfridsbrott": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 6 §"],
  },
  "rån": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 8 kap. 5 §"],
    alternativa_lagrum: ["BrB 8 kap. 6 § (grovt rån)"],
  },
  "stöld": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 8 kap. 1 §"],
    alternativa_lagrum: ["BrB 8 kap. 4 § (grov stöld)"],
  },
  "bedrägeri": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 9 kap. 1 §"],
    alternativa_lagrum: ["BrB 9 kap. 3 § (grovt bedrägeri)"],
  },
  "skadegörelse": {
    sakomrade: "Skadegörelsebrott",
    primart_lagrum: ["BrB 12 kap. 1 §"],
  },
  "våld mot tjänsteman": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 17 kap. 1 §"],
  },
  "förgripelse mot tjänsteman": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 17 kap. 2 §"],
  },
  "narkotikabrott": {
    sakomrade: "Narkotikabrott",
    primart_lagrum: ["Narkotikastrafflagen (1968:64) 1 §"],
    alternativa_lagrum: ["2 § (grovt narkotikabrott)"],
  },
  "rattfylleri": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikbrottslagen (1951:649) 4 §"],
    alternativa_lagrum: ["4 a § (grovt rattfylleri)"],
  },
  "olovlig körning": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikbrottslagen (1951:649) 3 §"],
  },
  "brott mot trafikförordningen": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikförordningen (1998:1276)"],
  },
  "köp av sexuell tjänst": {
    sakomrade: "Sexualbrott",
    primart_lagrum: ["BrB 6 kap. 11 §"],
  },
  "koppleri": {
    sakomrade: "Sexualbrott",
    primart_lagrum: ["BrB 6 kap. 12 §"],
  },
  "vapenbrott": {
    sakomrade: "Vapenbrott",
    primart_lagrum: ["Vapenlagen (1996:67)"],
  },
  "penningtvättsbrott": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["Lag (2014:307) om straff för penningtvättsbrott 3 §"],
  },
  "grovt sabotage mot blåljusverksamhet": {
    sakomrade: "Allmänfarliga brott",
    primart_lagrum: ["BrB 13 kap. 5 c §"],
  },
  "folkrättsbrott, grovt brott": {
    sakomrade: "Brott mot internationell rätt (folkrätt)",
    primart_lagrum: ["BrB 22 kap. 6 § (grovt brott)"],
  },
  "grovt bokföringsbrott": {
    sakomrade: "Brott mot borgenärer / ekonomisk brottslighet",
    primart_lagrum: ["BrB 11 kap. 5 § (grovt bokföringsbrott)"],
    alternativa_lagrum: ["BrB 11 kap. 5 § (bokföringsbrott)"],
  },
  "bokföringsbrott": {
    sakomrade: "Brott mot borgenärer / ekonomisk brottslighet",
    primart_lagrum: ["BrB 11 kap. 5 §"],
    alternativa_lagrum: ["BrB 11 kap. 5 § (ringa bokföringsbrott)"],
  },
  "människorov": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 1 §"],
  },
  "tillgrepp av fortskaffningsmedel": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 8 kap. 7 §"],
    alternativa_lagrum: ["BrB 8 kap. 7 § (ringa)", "BrB 8 kap. 7 § (grovt)"],
  },
  "olovligt förande av vattenskoter": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Lag (2021:626) om förarbevis för vattenskoter 27 §"],
  },
  "djurplågeri": {
    sakomrade: "Brott mot allmän ordning (brott mot djur)",
    primart_lagrum: ["BrB 16 kap. 13 §"],
  },
  "grovt olovligt förfogande": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 10 kap. 4 § (grovt olovligt förfogande)"],
    alternativa_lagrum: ["BrB 10 kap. 4 § (olovligt förfogande)"],
  },
  "hot mot tjänsteman": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 17 kap. 1 §"],
    kommentar: "Hot mot tjänsteman regleras tillsammans med våld mot tjänsteman i samma bestämmelse.",
  },
  "angrepp mot tjänsteman": {
    sakomrade: "Brott mot allmän verksamhet",
    primart_lagrum: ["BrB 17 kap. 1 §"],
    kommentar: "Begreppet används ibland generellt; straffbestämmelsen är normalt 17 kap. 1 § BrB.",
  },
  "grov fridskränkning": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 4 a §"],
  },
  "olaga förföljelse": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 4 b §"],
  },
  "förvandling av böter": {
    sakomrade: "Straffverkställighet",
    primart_lagrum: ["BrB 25 kap. 8 §"],
    kommentar: "Avser omvandling av obetalda böter till fängelse.",
  },
  "undanröjande av strafföreläggande": {
    sakomrade: "Straffprocessuella frågor",
    primart_lagrum: ["RB 59 kap. 6 §"],
    kommentar: "Processuell fråga enligt rättegångsbalken.",
  },
  "bidragsbrott": {
    sakomrade: "Ekonomisk brottslighet",
    primart_lagrum: ["Bidragsbrottslagen (2007:612) 2 §"],
    alternativa_lagrum: ["4 § (grovt bidragsbrott)"],
  },
  "brukande av falsk urkund": {
    sakomrade: "Urkundsbrott",
    primart_lagrum: ["BrB 14 kap. 10 §"],
  },
  "urkundsförfalskning": {
    sakomrade: "Urkundsbrott",
    primart_lagrum: ["BrB 14 kap. 1 §"],
    alternativa_lagrum: ["BrB 14 kap. 3 § (grov urkundsförfalskning)"],
  },
  "brott mot lagen om förbud beträffande knivar och andra farliga föremål, grovt brott": {
    sakomrade: "Vapen- och ordningsbrott",
    primart_lagrum: ["Lag (1988:254) 1 § (grovt brott)"],
  },
  "brott mot lagen om förbud beträffande knivar och andra farliga föremål": {
    sakomrade: "Vapen- och ordningsbrott",
    primart_lagrum: ["Lag (1988:254) 1 §"],
    kommentar: "Straffbestämmelsen återfinns i samma lag.",
  },
  "brott mot lagen om brandfarliga och explosiva varor": {
    sakomrade: "Allmänfarliga brott / särskild straffrätt",
    primart_lagrum: ["Lag (2010:1011) om brandfarliga och explosiva varor 29 §"],
    kommentar: "Exakt paragraf beror på typ av överträdelse.",
  },
  "europeisk utredningsorder": {
    sakomrade: "Internationellt straffprocessuellt samarbete",
    primart_lagrum: ["Lag (2017:1000) om en europeisk utredningsorder"],
    kommentar: "Processuell fråga, inte materiellt brott.",
  },
  "bilbältesförseelse": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikförordningen (1998:1276) 4 kap. 10 §"],
    kommentar: "Straff enligt trafikförordningens sanktionsbestämmelser.",
  },
  "grov vårdslöshet i trafik": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikbrottslagen (1951:649) 1 §"],
  },
  "olaga yrkesmässig trafik": {
    sakomrade: "Trafik- och näringsregleringsbrott",
    primart_lagrum: ["Yrkestrafiklagen (2012:210) 5 kap. 1 §"],
    kommentar: "Exakt bestämmelse kan variera beroende på gärningens art.",
  },
  "hastighetsöverträdelse": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikförordningen (1998:1276) 3 kap. 17 §"],
    kommentar: "Straff enligt 14 kap. trafikförordningen.",
  },
  "undanröjande av skyddstillsyn": {
    sakomrade: "Straffverkställighet",
    primart_lagrum: ["BrB 28 kap. 8 §"],
    kommentar: "Avser undanröjande av påföljden skyddstillsyn och bestämmande av annan påföljd.",
  },
  "grov kvinnofridskränkning": {
    sakomrade: "Brott mot frihet och frid",
    primart_lagrum: ["BrB 4 kap. 4 a §"],
  },
  "köp av sexuell handling": {
    sakomrade: "Sexualbrott",
    primart_lagrum: ["BrB 6 kap. 11 §"],
    kommentar: "Alternativ formulering för köp av sexuell tjänst.",
  },
  "vårdslöshet i trafik": {
    sakomrade: "Trafikbrott",
    primart_lagrum: ["Trafikbrottslagen (1951:649) 1 §"],
  },
  "brott mot knivlagen": {
    sakomrade: "Vapen- och ordningsbrott",
    primart_lagrum: ["Lag (1988:254) om förbud beträffande knivar och andra farliga föremål 1 §"],
    alternativa_lagrum: ["Lag (1988:254) 1 § (grovt brott)"],
    kommentar: "Straffbestämmelser finns i samma lag. Exakt grad beror på om brottet bedöms som grovt.",
  },
  "barnpornografibrott": {
    sakomrade: "Sexualbrott",
    primart_lagrum: ["BrB 16 kap. 10 a §"],
    alternativa_lagrum: [
      "BrB 16 kap. 10 a § (grovt barnpornografibrott)",
      "BrB 16 kap. 10 a § (ringa barnpornografibrott)",
    ],
  },
  "häleri": {
    sakomrade: "Förmögenhetsbrott",
    primart_lagrum: ["BrB 9 kap. 6 §"],
    alternativa_lagrum: [
      "BrB 9 kap. 6 § (grovt häleri)",
      "BrB 9 kap. 7 § (häleriförseelse)",
    ],
  },
  "ansökan om rättslig hjälp i brottmål": {
    sakomrade: "Internationellt straffprocessuellt samarbete",
    primart_lagrum: ["Lag (2000:562) om internationell rättslig hjälp i brottmål"],
    kommentar: "Processuell fråga – avser rättsligt samarbete mellan stater, inte ett materiellt brott.",
  },
  "brott mot utlänningslagen": {
    sakomrade: "Utlänningsrättsliga brott",
    primart_lagrum: ["Utlänningslagen (2005:716) 20 kap."],
    kommentar: "Exakt paragraf beror på gärning (t.ex. olovlig vistelse, organiserande av olaglig inresa m.m.).",
  },
  "vållande till kroppsskada": {
    sakomrade: "Brott mot liv och hälsa",
    primart_lagrum: ["BrB 3 kap. 8 §"],
    alternativa_lagrum: ["BrB 3 kap. 9 § (grovt brott)"],
  },
  "rättslig hjälp åt utländsk domstol": {
    sakomrade: "Internationellt straffprocessuellt samarbete",
    primart_lagrum: ["Lag (2000:562) om internationell rättslig hjälp i brottmål"],
    kommentar: "Processuell fråga, inte materiellt brott.",
  },
  "våldtäkt mot barn": {
    sakomrade: "Sexualbrott",
    primart_lagrum: ["BrB 6 kap. 4 §"],
    alternativa_lagrum: ["BrB 6 kap. 4 § (grovt brott)"],
  },
  "brott mot totalförsvarsplikten": {
    sakomrade: "Totalförsvars- och tjänstepliktsbrott",
    primart_lagrum: ["Lag (1994:1809) om totalförsvarsplikt 10 kap."],
    kommentar: "Exakt paragraf beror på gärning (t.ex. uteblivande från tjänstgöring).",
  },
  "undanröjande av villkorlig dom med samhällstjänst": {
    sakomrade: "Straffverkställighet",
    primart_lagrum: ["BrB 27 kap. 6 §"],
    kommentar: "Avser undanröjande av påföljd och ny påföljdsbestämning.",
  },
  "osant intygande": {
    sakomrade: "Urkundsbrott",
    primart_lagrum: ["BrB 15 kap. 11 §"],
  },
  "våldtäkt": {
    sakomrade: "Sexualbrott",
    primart_lagrum: ["BrB 6 kap. 1 §"],
    alternativa_lagrum: ["BrB 6 kap. 1 § (grovt brott)"],
  },
  "mordbrand": {
    sakomrade: "Allmänfarliga brott",
    primart_lagrum: ["BrB 13 kap. 1 §"],
    alternativa_lagrum: ["BrB 13 kap. 2 § (grov mordbrand)"],
  },
  "smuggling": {
    sakomrade: "Tull- och smugglingsbrott",
    primart_lagrum: ["Lag (2000:1225) om straff för smuggling 3 §"],
    alternativa_lagrum: ["Lag (2000:1225) 6 § (grovt smugglingsbrott)"],
  },
  "ansökan om förverkande": {
    sakomrade: "Straffprocessuella frågor",
    primart_lagrum: ["BrB 36 kap."],
    kommentar: "Förverkande regleras i 36 kap. BrB; kan även förekomma i speciallagstiftning.",
  },
};

// Sort keys longest-first so "grov misshandel" matches before "misshandel"
const sortedKeys = Object.keys(mappings).sort((a, b) => b.length - a.length);

export function matchLagrum(
  saken: string,
  caseNumber: string
): { lagrum: string; sakomrade: string } {
  const empty = { lagrum: "", sakomrade: "" };

  // Only enrich B-mål (criminal cases)
  if (!caseNumber.trim().toUpperCase().startsWith("B")) return empty;

  // Clean saken: lowercase + strip trailing "m m" / "m.m."
  const cleanSaken = saken
    .toLowerCase()
    .replace(/m\.?\s*m\.?\s*$/, "")
    .trim();

  for (const key of sortedKeys) {
    if (cleanSaken.includes(key)) {
      const data = mappings[key];
      let lagrum = data.primart_lagrum[0];

      // Check for aggravated variant
      if (/grov|grovt/i.test(cleanSaken) && data.alternativa_lagrum) {
        const aggravated = data.alternativa_lagrum.find((alt) =>
          alt.toLowerCase().includes("grov")
        );
        if (aggravated) {
          // Strip parenthetical comment e.g. "(grovt rån)"
          lagrum = aggravated.replace(/\s*\(.*\)\s*$/, "").trim();
        }
      }

      return { lagrum, sakomrade: data.sakomrade };
    }
  }

  return empty;
}
