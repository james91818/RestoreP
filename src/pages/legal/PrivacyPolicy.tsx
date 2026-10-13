import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <PublicNav />
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Datenschutzerklärung</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Zuletzt aktualisiert: {new Date().toLocaleDateString("de-DE")} · Crypto Strategy GmbH · CHE-382.433.944 (Handelsregisteramt Oberwallis)
      </p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
        <section>
          <p className="text-muted-foreground leading-relaxed">
            Der Schutz Ihrer personenbezogenen Daten ist uns ein zentrales Anliegen. Diese Datenschutzerklärung informiert Sie gemäß Art. 13 und Art. 14 der Datenschutz-Grundverordnung (DSGVO) sowie dem schweizerischen Datenschutzgesetz (DSG) über Art, Umfang und Zweck der Verarbeitung personenbezogener Daten im Rahmen der Nutzung unserer Plattform und Dienstleistungen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">1. Verantwortlicher</h2>
          <p className="text-muted-foreground leading-relaxed">
            Verantwortlicher im Sinne der DSGVO ist:
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            <strong className="text-foreground">Crypto Strategy GmbH</strong><br />
            c/o Harald Zentriegen, Hauptplatz 2, 3953 Leuk Stadt, Schweiz<br />
            Handelsregister: CH-600.4.019.835-3 · UID: CHE-382.433.944 (Handelsregisteramt Oberwallis)<br />
            E-Mail: privacy@crypto-borse.com
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">2. Datenschutzbeauftragter</h2>
          <p className="text-muted-foreground leading-relaxed">
            Unser Datenschutzbeauftragter steht Ihnen für Fragen zur Verarbeitung Ihrer personenbezogenen Daten und zur Wahrnehmung Ihrer Rechte zur Verfügung:<br />
            E-Mail: dpo@crypto-borse.com
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">3. Kategorien verarbeiteter Daten</h2>
          <p className="text-muted-foreground leading-relaxed">Wir verarbeiten je nach Nutzung unserer Dienste folgende Kategorien personenbezogener Daten:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
            <li><strong className="text-foreground">Identifikations- und Kontaktdaten:</strong> Vor- und Nachname, Geburtsdatum, Staatsangehörigkeit, Anschrift, E-Mail-Adresse, Telefonnummer.</li>
            <li><strong className="text-foreground">KYC- und Verifizierungsdaten:</strong> Ausweisdokumente (Reisepass, Personalausweis), Selfie/Lichtbild, Adressnachweise, steuerliche Identifikationsnummer.</li>
            <li><strong className="text-foreground">Finanz- und Transaktionsdaten:</strong> Bankverbindungen (IBAN, BIC), Krypto-Wallet-Adressen, Ein- und Auszahlungen, Handelshistorie, Portfolio-Bestände, Herkunft der Vermögenswerte.</li>
            <li><strong className="text-foreground">Vertrags- und Kommunikationsdaten:</strong> Kontoeinstellungen, Korrespondenz mit dem Support, Chat-Protokolle, Aufzeichnungen von Telefonaten (sofern gesetzlich erlaubt und angekündigt).</li>
            <li><strong className="text-foreground">Nutzungs- und Gerätedaten:</strong> IP-Adresse, Geräte-ID, Betriebssystem, Browser-Typ, Spracheinstellungen, Zeitzone, Login-Zeitpunkte, besuchte Seiten, Referrer-URL.</li>
            <li><strong className="text-foreground">Verhaltens- und Präferenzdaten:</strong> Risikoprofil, Anlageerfahrung, Watchlist, Benachrichtigungspräferenzen.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">4. Zwecke und Rechtsgrundlagen der Verarbeitung</h2>
          <p className="text-muted-foreground leading-relaxed">Wir verarbeiten Ihre Daten ausschließlich auf Grundlage gesetzlicher Erlaubnistatbestände:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
            <li><strong className="text-foreground">Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO):</strong> Eröffnung und Verwaltung Ihres Kundenkontos, Ausführung von Aufträgen, Verwahrung von Kryptowerten, Abwicklung von Ein- und Auszahlungen, Bereitstellung der Plattform-Funktionen (Trading, Staking, Krypto-Vorsorge).</li>
            <li><strong className="text-foreground">Rechtliche Verpflichtungen (Art. 6 Abs. 1 lit. c DSGVO):</strong> Erfüllung der KYC-/AML-Pflichten nach dem schweizerischen Geldwäschereigesetz (GwG), der MiCA-Verordnung sowie steuerrechtlicher Melde- und Aufbewahrungspflichten.</li>
            <li><strong className="text-foreground">Berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO):</strong> Betrugsprävention, IT-Sicherheit, Plattform-Stabilität, Verbesserung unserer Dienste, anonymisierte Nutzungsanalyse, Geltendmachung rechtlicher Ansprüche.</li>
            <li><strong className="text-foreground">Einwilligung (Art. 6 Abs. 1 lit. a DSGVO):</strong> Marketing-Kommunikation (Newsletter), Setzen nicht-essentieller Cookies, optionale Personalisierung. Eine Einwilligung kann jederzeit mit Wirkung für die Zukunft widerrufen werden.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">5. Empfänger und Auftragsverarbeiter</h2>
          <p className="text-muted-foreground leading-relaxed">
            Eine Übermittlung Ihrer Daten erfolgt nur an sorgfältig ausgewählte Dienstleister und ausschließlich, soweit dies zur Vertragserfüllung oder zur Erfüllung gesetzlicher Pflichten erforderlich ist. Empfängerkategorien sind insbesondere:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
            <li>KYC-/Identitätsverifizierungsanbieter (Video-Ident, Dokumentenprüfung);</li>
            <li>Zahlungsdienstleister, Kreditkarten-Acquirer, Banken und Krypto-Verwahrer;</li>
            <li>Cloud- und Hosting-Anbieter (Rechenzentren in der EU);</li>
            <li>Anbieter für Marktdaten (z. B. Binance Public API);</li>
            <li>Analyse- und Monitoring-Dienste;</li>
            <li>Steuerberater, Wirtschaftsprüfer, Rechtsanwälte;</li>
            <li>Aufsichtsbehörden, Strafverfolgungsbehörden und Finanzbehörden, soweit gesetzlich verpflichtet.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-2">
            Mit allen Auftragsverarbeitern haben wir Verträge gemäß Art. 28 DSGVO abgeschlossen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">6. Übermittlung in Drittländer</h2>
          <p className="text-muted-foreground leading-relaxed">
            Eine Übermittlung personenbezogener Daten in Länder außerhalb des Europäischen Wirtschaftsraums (EWR) findet nur statt, wenn ein Angemessenheitsbeschluss der EU-Kommission vorliegt oder geeignete Garantien (insbesondere EU-Standardvertragsklauseln gemäß Art. 46 DSGVO sowie ergänzende technische und organisatorische Maßnahmen) implementiert sind.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">7. Speicherdauer</h2>
          <p className="text-muted-foreground leading-relaxed">
            Wir speichern Ihre Daten nur so lange, wie es für die jeweiligen Zwecke erforderlich ist. Nach Beendigung des Vertragsverhältnisses werden Daten zur Erfüllung gesetzlicher Aufbewahrungspflichten weiter vorgehalten — insbesondere:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
            <li>KYC-Unterlagen und Transaktionsdaten: 10 Jahre nach Beendigung der Geschäftsbeziehung (Art. 7 GwG);</li>
            <li>Buchhaltungs- und Steuerunterlagen: 10 Jahre (Art. 958f OR);</li>
            <li>Kommunikation und Beschwerden: bis zu 5 Jahre nach Vorgangsabschluss;</li>
            <li>Server-Logs: in der Regel 30 bis 90 Tage.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-2">
            Nach Ablauf der Aufbewahrungsfristen werden die Daten gelöscht oder anonymisiert.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">8. Ihre Rechte als betroffene Person</h2>
          <p className="text-muted-foreground leading-relaxed">Ihnen stehen nach der DSGVO folgende Rechte zu:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
            <li><strong className="text-foreground">Auskunft</strong> über die zu Ihrer Person gespeicherten Daten (Art. 15 DSGVO);</li>
            <li><strong className="text-foreground">Berichtigung</strong> unrichtiger oder unvollständiger Daten (Art. 16 DSGVO);</li>
            <li><strong className="text-foreground">Löschung</strong> Ihrer Daten, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen (Art. 17 DSGVO);</li>
            <li><strong className="text-foreground">Einschränkung</strong> der Verarbeitung (Art. 18 DSGVO);</li>
            <li><strong className="text-foreground">Datenübertragbarkeit</strong> in einem strukturierten, gängigen Format (Art. 20 DSGVO);</li>
            <li><strong className="text-foreground">Widerspruch</strong> gegen Verarbeitungen auf Basis berechtigter Interessen oder zu Direktwerbung (Art. 21 DSGVO);</li>
            <li><strong className="text-foreground">Widerruf</strong> erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO).</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-2">
            Zur Ausübung Ihrer Rechte wenden Sie sich bitte an privacy@crypto-borse.com. Sie haben außerdem das Recht, Beschwerde bei einer Aufsichtsbehörde einzulegen — in der Schweiz beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (<a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.edoeb.admin.ch</a>), im EWR bei der zuständigen nationalen Datenschutzbehörde Ihres Wohnsitzstaates.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">9. Cookies und Tracking-Technologien</h2>
          <p className="text-muted-foreground leading-relaxed">
            Unsere Plattform verwendet Cookies und vergleichbare Technologien (LocalStorage, SessionStorage). Wir unterscheiden zwischen:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
            <li><strong className="text-foreground">Notwendige Cookies:</strong> Erforderlich für Login, Sitzungsverwaltung, Sicherheit und Grundfunktionen (Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO);</li>
            <li><strong className="text-foreground">Funktionale Cookies:</strong> Sprachauswahl, Theme (Dark/Light), Präferenzen;</li>
            <li><strong className="text-foreground">Analyse-Cookies:</strong> Anonymisierte Nutzungsanalyse zur Optimierung unseres Angebots (nur mit Einwilligung);</li>
            <li><strong className="text-foreground">Marketing-Cookies:</strong> Reichweitenmessung und personalisierte Inhalte (nur mit Einwilligung).</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-2">
            Sie können Ihre Cookie-Einstellungen jederzeit über das Cookie-Banner oder die Browser-Einstellungen anpassen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">10. Automatisierte Entscheidungsfindung und Profiling</h2>
          <p className="text-muted-foreground leading-relaxed">
            Im Rahmen unserer Geldwäsche- und Betrugsprävention setzen wir teilweise automatisierte Verfahren zur Risikobewertung von Transaktionen ein. Bei auffälligen Vorgängen erfolgt stets eine manuelle Nachprüfung durch geschulte Mitarbeiter, bevor Maßnahmen ergriffen werden. Eine vollautomatisierte Entscheidung mit rechtlicher Wirkung im Sinne von Art. 22 DSGVO findet nicht statt.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">11. Datensicherheit</h2>
          <p className="text-muted-foreground leading-relaxed">
            Wir setzen umfassende technische und organisatorische Maßnahmen ein, um Ihre Daten zu schützen, insbesondere TLS-Verschlüsselung der Datenübertragung, verschlüsselte Datenbanken, Mehrfaktor-Authentifizierung, regelmäßige Sicherheits-Audits, Zugriffskontrollen nach dem Need-to-know-Prinzip sowie Cold-Storage-Lösungen für Krypto-Vermögenswerte.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">12. Minderjährigenschutz</h2>
          <p className="text-muted-foreground leading-relaxed">
            Unsere Dienste richten sich ausschließlich an volljährige Personen (ab 18 Jahren). Wir verarbeiten wissentlich keine Daten von Minderjährigen. Sollten wir Kenntnis davon erhalten, werden die betreffenden Daten unverzüglich gelöscht.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">13. Änderungen dieser Datenschutzerklärung</h2>
          <p className="text-muted-foreground leading-relaxed">
            Wir passen diese Datenschutzerklärung regelmäßig an, um sie an gesetzliche oder technische Entwicklungen anzupassen. Die jeweils aktuelle Version finden Sie auf dieser Seite. Wesentliche Änderungen werden Ihnen rechtzeitig per E-Mail oder über die Plattform mitgeteilt.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">14. Kontakt</h2>
          <p className="text-muted-foreground leading-relaxed">
            Bei Fragen zur Verarbeitung Ihrer personenbezogenen Daten oder zur Ausübung Ihrer Rechte erreichen Sie uns unter:<br />
            <strong className="text-foreground">Crypto Strategy GmbH</strong><br />
            c/o Harald Zentriegen, Hauptplatz 2, 3953 Leuk Stadt, Schweiz<br />
            E-Mail: privacy@crypto-borse.com
          </p>
        </section>
      </div>
    </div>
    <PublicFooter />
  </div>
);

export default PrivacyPolicy;
