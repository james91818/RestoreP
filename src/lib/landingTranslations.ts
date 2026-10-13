export type Lang = "de" | "en";

const t = {
  // Nav / badge
  trustBadge: { de: "Ihr Vermögen. Professionell verwaltet.", en: "Your Wealth. Professionally Managed." },

  // Hero
  heroLine1: { de: "Vermögen aufbauen mit", en: "Build Wealth with" },
  heroLine2: { de: "überdurchschnittlichen Renditen", en: "Above-Average Returns" },
  heroLine3: { de: "Ihre Investition. Unsere Expertise. Ihr Gewinn.", en: "Your Investment. Our Expertise. Your Profit." },
  heroDesc: {
    de: "Profitieren Sie von KI-gestützten Strategien, die rund um die Uhr Chancen identifizieren. Unsere Kunden erzielen durchschnittlich +87% Rendite pro Jahr — sicher, transparent und mit persönlicher Betreuung.",
    en: "Benefit from AI-powered strategies that identify opportunities 24/7. Our clients achieve an average +87% return per year — secure, transparent and with personal support.",
  },
  ctaSignup: { de: "Jetzt investieren & profitieren", en: "Start Investing & Profit Now" },
  ctaLearn: { de: "Renditen ansehen", en: "View Returns" },
  trust1: { de: "Ø +87% Jahresrendite", en: "Avg. +87% annual return" },
  trust2: { de: "Kapital jederzeit verfügbar", en: "Capital available anytime" },
  trust3: { de: "150.000+ zufriedene Investoren", en: "150,000+ satisfied investors" },

  // Stats card
  statsTitle: { de: "Ihre Vorteile auf einen Blick", en: "Your Benefits at a Glance" },
  statClients: { de: "Zufriedene Investoren", en: "Satisfied Investors" },
  statInstruments: { de: "Handelsinstrumente", en: "Trading Instruments" },
  statMinDeposit: { de: "Mindesteinzahlung", en: "Min. Deposit" },
  statLeverage: { de: "Hebelwirkung", en: "Leverage" },

  // Performance section
  perfTag: { de: "Nachgewiesene Ergebnisse", en: "Proven Results" },
  perfTitle: { de: "Überdurchschnittliche Renditen für DACH-Investoren", en: "Above-Average Returns for DACH Investors" },
  perfDesc: {
    de: "Unsere KI-gestützten Handelsstrategien übertreffen konsequent traditionelle Anlageformen wie Sparbuch und DAX. Sehen Sie selbst, was unsere Investoren in Deutschland, Österreich und der Schweiz erreichen.",
    en: "Our AI-powered trading strategies consistently outperform traditional investment forms such as savings accounts and the DAX. See for yourself what our investors in Germany, Austria and Switzerland achieve.",
  },
  perfS1v: { de: "+87%", en: "+87%" },
  perfS1l: { de: "Ø Jahresrendite unserer Investoren", en: "Avg. annual return of our investors" },
  perfS2v: { de: "€2,44 Mrd.", en: "€2.44B" },
  perfS2l: { de: "Privates Anlagevolumen", en: "Private investment volume" },
  perfS3v: { de: "94%", en: "94%" },
  perfS3l: { de: "Gewinnquote der KI-Strategie", en: "AI strategy win rate" },
  perfS4v: { de: "<24h", en: "<24h" },
  perfS4l: { de: "Auszahlung Ihrer Gewinne", en: "Withdrawal of your profits" },
  perfComp1: { de: "Sparbuch", en: "Savings Account" },
  perfComp2: { de: "Aktien (DAX)", en: "Stocks (DAX)" },
  perfComp3: { de: "Immobilien", en: "Real Estate" },
  perfComp4: { de: "Crypto-Börse", en: "Crypto-Börse" },

  // Success stories
  successTag: { de: "Erfolgsgeschichten", en: "Success Stories" },
  successTitle: { de: "Was unsere Investoren sagen", en: "What Our Investors Say" },
  successDesc: {
    de: "Echte Ergebnisse von echten Investoren aus der DACH-Region.",
    en: "Real results from real investors in the DACH region.",
  },

  // Markets
  marketsTag: { de: "Unsere Anlagekategorien", en: "Our Asset Categories" },
  marketsTitle: { de: "Digitale Vermögenswerte im Fokus", en: "Digital Assets in Focus" },
  marketsDesc: {
    de: "Strukturierter Zugang zu den relevantesten Segmenten des Kryptomarkts — von Blue-Chips bis zu Frühphasen-Chancen. Jede Kategorie wird von unserem Research-Team laufend analysiert und aktiv gemanagt.",
    en: "Structured access to the most relevant segments of the crypto market — from blue-chips to early-stage opportunities. Every category is continuously analysed and actively managed by our research team.",
  },
 mCrypto: { de: "Major Coins", en: "Major Coins" },
 mCryptoDesc: { de: "Bitcoin, Ethereum, Solana, XRP — die etablierten Marktführer mit tiefer Liquidität.", en: "Bitcoin, Ethereum, Solana, XRP — the established leaders with deep liquidity." },
 mStocks: { de: "Altcoins & DeFi", en: "Altcoins & DeFi" },
 mStocksDesc: { de: "Über 100 Altcoins und DeFi-Token wie Uniswap, Aave, Chainlink und Arbitrum.", en: "100+ altcoins and DeFi tokens like Uniswap, Aave, Chainlink and Arbitrum." },
 mCommodities: { de: "Staking & ICOs", en: "Staking & ICOs" },
 mCommoditiesDesc: { de: "Passives Einkommen durch Staking sowie exklusiver Zugang zu neuen Token-Launches.", en: "Passive income through staking plus exclusive access to new token launches." },
 mIndices: { de: "Memecoins & DAOs", en: "Memecoins & DAOs" },
 mIndicesDesc: { de: "DOGE, SHIB, PEPE, WIF sowie DAO-Governance-Token mit hohem Momentum.", en: "DOGE, SHIB, PEPE, WIF plus DAO governance tokens with strong momentum." },

  // Trust
  trustTag: { de: "Sicherheit & Vertrauen", en: "Security & Trust" },
  trustTitle: { de: "Ihre Sicherheit ist unsere Priorität", en: "Your Security Is Our Priority" },
  trustSubtitle: {
    de: "Gewinne im Kryptomarkt zu erzielen ist der einfache Teil. Sicher zu bleiben, ist die wahre Herausforderung. Deshalb setzt Crypto-Börse auf die höchsten Sicherheitsstandards der Branche — von militärtauglicher Verschlüsselung und Hardware-Sicherheitsmodulen über Offline-Speicherung bis zur Mehrfachsignatur und 24/7-Überwachung.",
    en: "Making money in crypto is the easy part. Staying safe is the real challenge. That's why Crypto-Börse relies on the highest security standards in the industry — from military-grade encryption and hardware security modules to offline storage, multi-signature approvals and 24/7 monitoring.",
  },
  t1: { de: "Reguliert & Sicher", en: "Regulated & Secure" },
  t1d: { de: "Alle Kundengelder werden bei europäischen Tier-1-Banken getrennt verwahrt. Ihre Einlagen sind geschützt.", en: "All client funds are segregated at European Tier-1 banks. Your deposits are protected." },
  t2: { de: "Verschlüsselte Daten", en: "Encrypted Data" },
  t2d: { de: "256-Bit SSL-Verschlüsselung und Zwei-Faktor-Authentifizierung schützen Ihr Konto rund um die Uhr.", en: "256-bit SSL encryption and two-factor authentication protect your account 24/7." },
  t3: { de: "Persönlicher Vermögensberater", en: "Personal Wealth Advisor" },
  t3d: { de: "Jeder Investor erhält einen erfahrenen, deutschsprachigen Vermögensberater — kein Callcenter.", en: "Every investor gets an experienced, German-speaking wealth advisor — no call center." },
  t4: { de: "Blitzschnelle Ausführung", en: "Lightning-Fast Execution" },
  t4d: { de: "Trades werden in unter 0,1 Sekunden ausgeführt. Kein verpasster Gewinn durch Verzögerungen.", en: "Trades executed in under 0.1 seconds. No missed profits due to delays." },
  t5: { de: "Seit 2016 profitabel", en: "Profitable Since 2016" },
  t5d: { de: "Über 10 Jahre Erfahrung und durchgehend positive Ergebnisse für unsere Investoren.", en: "Over 10 years of experience and consistently positive results for our investors." },
  t6: { de: "DACH-Premium-Service", en: "DACH Premium Service" },
  t6d: { de: "Standorte in Frankfurt, Wien und Zürich. Höchste Standards für Ihre Vermögensverwaltung.", en: "Offices in Frankfurt, Vienna and Zurich. Highest standards for your wealth management." },
  s1: { de: "TLS 1.3", en: "TLS 1.3" },
  s1d: { de: "Bankentaugliche Transportverschlüsselung für jede Datenverbindung zwischen Ihnen und unserer Plattform.", en: "Bank-grade transport encryption for every data connection between you and our platform." },
  s2: { de: "AES-256", en: "AES-256" },
  s2d: { de: "Militärtaugliche Verschlüsselung sensibler Daten im Ruhezustand auf allen Systemen.", en: "Military-grade encryption of sensitive data at rest across all systems." },
  s3: { de: "Argon2id", en: "Argon2id" },
  s3d: { de: "Modernes, speicherhartes Passwort-Hashing schützt Ihre Zugangsdaten selbst bei Datenlecks.", en: "Modern memory-hard password hashing protects your credentials even in the event of data leaks." },
  s4: { de: "HSM", en: "HSM" },
  s4d: { de: "Hardware-Sicherheitsmodule schützen kryptografische Schlüssel physisch vor unbefugtem Zugriff.", en: "Hardware security modules physically protect cryptographic keys from unauthorized access." },
  s5: { de: "KMS", en: "KMS" },
  s5d: { de: "Zentrale Schlüsselverwaltung mit regelmäßiger Rotation und strikter Zugriffskontrolle.", en: "Centralized key management with regular rotation and strict access control." },
  s6: { de: "Multi-Signature", en: "Multi-Signature" },
  s6d: { de: "Mehrfachsignatur-Strukturen verlangen mehrere genehmigte Stimmen für sicherheitsrelevante Aktionen.", en: "Multi-signature structures require multiple approved parties for security-sensitive actions." },
  s7: { de: "MPC", en: "MPC" },
  s7d: { de: "Multi-Party-Computation teilt Schlüssel in Fragmente auf — niemand besitzt jemals den vollständigen Schlüssel.", en: "Multi-party computation splits keys into shards — no single party ever holds the complete key." },
  s8: { de: "Cold Storage", en: "Cold Storage" },
  s8d: { de: "Der Großteil der Krypto-Vermögenswerte liegt in isolierter Offline-Speicherung außerhalb des Internets.", en: "The majority of crypto assets are held in isolated offline storage disconnected from the internet." },
  s9: { de: "2FA / MFA", en: "2FA / MFA" },
  s9d: { de: "Zwei- und mehrfaktorielle Authentifizierung sichert jeden Account zusätzlich über ein zweites Gerät ab.", en: "Two- and multi-factor authentication adds a second device layer to secure every account." },
  s10: { de: "24/7 Monitoring", en: "24/7 Monitoring" },
  s10d: { de: "Unser Security Operations Center überwacht rund um die Uhr ungewöhnliche Aktivitäten und Bedrohungen.", en: "Our Security Operations Center monitors unusual activity and threats around the clock." },
  s11: { de: "DDoS-Schutz", en: "DDoS Protection" },
  s11d: { de: "Enterprise-grade DDoS-Mitigation hält die Plattform auch bei Angriffen stabil und erreichbar.", en: "Enterprise-grade DDoS mitigation keeps the platform stable and reachable even during attacks." },
  s12: { de: "EU-Infrastruktur", en: "EU Infrastructure" },
  s12d: { de: "Unsere Infrastruktur und Datenverarbeitung finden innerhalb der Europäischen Union statt.", en: "Our infrastructure and data processing take place within the European Union." },


  // How it works
  howTag: { de: "So einfach profitieren Sie", en: "Start Profiting Today" },
  howTitle: { de: "In 3 Schritten zu Ihrem Gewinn", en: "3 Steps to Your Profit" },
  howDesc: { de: "Konto erstellen, per SEPA oder Banküberweisung einzahlen und bereits ab dem ersten Tag Rendite erzielen — persönlich betreut aus Wien, Berlin oder Zürich.", en: "Create an account, deposit via SEPA or bank transfer and earn returns from day one — personally advised from Vienna, Berlin or Zurich." },
  step1: { de: "Konto eröffnen", en: "Open Account" },
  step1d: { de: "In nur 2 Minuten registriert. Kostenlos, unverbindlich — Ihr erster Schritt zum Vermögensaufbau in Deutschland, Österreich oder der Schweiz.", en: "Registered in just 2 minutes. Free, non-binding — your first step to building wealth in Germany, Austria or Switzerland." },
  step2: { de: "Kapital einzahlen", en: "Deposit Capital" },
  step2d: { de: "Ab €250 starten. SEPA, Banküberweisung, Kreditkarte & mehr. Ihr Geld arbeitet sofort für Sie.", en: "Start from €250. SEPA, bank transfer, credit card & more. Your money works for you immediately." },
  step3: { de: "Gewinne erzielen", en: "Earn Profits" },
  step3d: { de: "Unsere KI handelt für Sie rund um die Uhr. Gewinne jederzeit auszahlbar — ohne Wartezeiten, direkt auf Ihr EU- oder CH-Konto.", en: "Our AI trades for you 24/7. Profits withdrawable anytime — no waiting periods, straight to your EU or CH account." },
  stepCta: { de: "Jetzt Rendite sichern", en: "Secure Your Returns Now" },
  stepLabel: { de: "Schritt", en: "Step" },

  // Krypto-Vorsorge
  kvBadge: { de: "Neu: Krypto-Vorsorge", en: "New: Crypto Pension" },
  kvTitle1: { de: "Altersvorsorge mit", en: "Retirement planning with" },
  kvTitle2: { de: "Bitcoin & Krypto", en: "Bitcoin & Crypto" },
  kvDesc: {
    de: "Ergänzen Sie Ihre klassische Vorsorge mit digitalen Vermögenswerten. Ab 100€ monatlich, steueroptimiert für Deutschland, Österreich und die Schweiz. Bereits große Pensionsfonds investieren in Krypto — jetzt auch für Privatanleger.",
    en: "Complement your traditional pension with digital assets. From €100/month, tax-optimized for Germany, Austria and Switzerland. Major pension funds already invest in crypto — now available for private investors too.",
  },
  kvF1: { de: "Ab 100€/Monat", en: "From €100/month" },
  kvF2: { de: "Keine Sperrfristen", en: "No lock-up periods" },
  kvF3: { de: "DACH-konform", en: "DACH-compliant" },
  kvCta: { de: "Mehr erfahren", en: "Learn More" },
  kvS1: { de: "Empfohlener Krypto-Anteil", en: "Recommended crypto allocation" },
  kvS2: { de: "Bitcoin-Obergrenze", en: "Bitcoin supply cap" },
  kvS3: { de: "BTC-Rendite 5 Jahre*", en: "BTC return 5 years*" },
  kvS4: { de: "DACH-Standorte", en: "DACH locations" },

  // DACH section
  dachTag: { de: "Für Anleger in Europa", en: "For European Investors" },
  dachTitle: { de: "Ihr Partner in Deutschland, Österreich, der Schweiz & ganz Europa", en: "Your Partner in Germany, Austria, Switzerland & All of Europe" },
  dachDesc: {
    de: "Wir sprechen Ihre Sprache, kennen Ihre Märkte und sind in Ihrer Nähe — mit lokalen Büros im DACH-Raum und Kunden in ganz Europa. Unser Service steht Investoren in allen europäischen Ländern zur Verfügung.",
    en: "We speak your language, know your markets and are nearby — with local offices in the DACH region and clients across all of Europe. Our services are available to investors in every European country.",
  },
  de_features: {
    de: ["Persönlicher Berater in Berlin", "EUR-Kontoführung & SEPA", "EU-regulierte Prozesse", "Regulierter Handel ab €250"],
    en: ["Personal advisor in Berlin", "EUR accounts & SEPA", "EU-regulated processes", "Regulated trading from €250"],
  },
  at_features: {
    de: ["Beratung aus Wien", "AT-Bankverbindungen & SEPA", "Steueroptimierte Strukturen", "Lokale Ein- & Auszahlungen"],
    en: ["Advisory from Vienna", "Austrian bank connections & SEPA", "Tax-optimized structures", "Local deposits & withdrawals"],
  },
  ch_features: {
    de: ["CHF-Kontoführung", "Schweizer Bankstandards", "Persönliche Beratung in Zürich", "Höchste Diskretion & Datenschutz"],
    en: ["CHF accounts", "Swiss banking standards", "Personal advisory in Zurich", "Maximum privacy & data protection"],
  },
  dachS1: { de: "Standorte im DACH-Raum", en: "DACH locations" },
  dachS2: { de: "Deutschsprachiger Support", en: "German-speaking support" },
  dachS3: { de: "Min. Einzahlung in EUR/CHF", en: "Min. deposit in EUR/CHF" },
  dachS4: { de: "Lokale Zahlungsmethoden", en: "Local payment methods" },

  // Payment
  payTitle: { de: "Sichere Zahlungsoptionen für DACH", en: "Secure Payment Options for DACH" },
  payDesc: { de: "Schnelle Ein- & Auszahlungen per SEPA, Banküberweisung, Kreditkarte & mehr — Ihre Gewinne in unter 24 Stunden auf Ihrem deutschen, österreichischen oder schweizer Konto.", en: "Fast deposits & withdrawals via SEPA, bank transfer, credit card & more — your profits in your German, Austrian or Swiss account in under 24 hours." },
  payBank: { de: "Banküberweisung", en: "Bank Transfer" },

  // Footer
  footerDesc: {
    de: "Ihr vertrauenswürdiger Partner für Vermögensverwaltung und überdurchschnittliche Renditen — mit Sitz in Wien, Berlin und Zürich.",
    en: "Your trusted partner for wealth management and above-average returns — headquartered in Vienna, Berlin and Zurich.",
  },
  footerDach: { de: "DACH-Unternehmen", en: "DACH company" },
  footerTrade: { de: "Handel", en: "Trading" },
  footerMarket: { de: "Handelsplatz", en: "Marketplace" },
  footerInvest: { de: "Investitionen", en: "Investments" },
  footerAccounts: { de: "Kontotypen", en: "Account Types" },
  footerLegal: { de: "Rechtliches", en: "Legal" },
  footerAbout: { de: "Über uns", en: "About Us" },
  footerContact: { de: "Kontakt", en: "Contact" },
  footerHelp: { de: "Hilfecenter", en: "Help Center" },
  footerRights: { de: "Alle Rechte vorbehalten.", en: "All rights reserved." },
  footerRisk: {
    de: "Investitionen bergen Risiken. Vergangene Performance ist kein Indikator für zukünftige Ergebnisse. Der Handel mit CFDs und gehebelten Produkten ist nicht für alle Anleger geeignet.",
    en: "Investments carry risks. Past performance is not indicative of future results. Trading CFDs and leveraged products is not suitable for all investors.",
  },
} as const;

export default t;
