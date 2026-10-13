import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";

const TermsConditions = () => (
  <div className="min-h-screen bg-background">
    <PublicNav />
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Allgemeine Geschäftsbedingungen (AGB)</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Zuletzt aktualisiert: {new Date().toLocaleDateString("de-DE")} · Crypto Strategy GmbH · CHE-382.433.944 (Handelsregisteramt Oberwallis)
      </p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-display font-semibold mb-2">1. Geltungsbereich und Vertragspartner</h2>
          <p className="text-muted-foreground leading-relaxed">
            1.1 Diese Allgemeinen Geschäftsbedingungen („AGB") regeln das Vertragsverhältnis zwischen der <strong className="text-foreground">Crypto Strategy GmbH</strong>, c/o Harald Zentriegen, Hauptplatz 2, 3953 Leuk Stadt, Schweiz, eingetragen im Handelsregister des Kantons Wallis unter der Nummer CH-600.4.019.835-3 (UID: CHE-382.433.944), Handelsregisteramt Oberwallis (nachfolgend „Crypto-Börse", „wir" oder „uns") und natürlichen oder juristischen Personen, die unsere Online-Plattform und die darüber angebotenen Dienstleistungen nutzen (nachfolgend „Kunde", „Nutzer" oder „Sie").
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            1.2 Diese AGB gelten für sämtliche über die Plattform angebotenen Dienstleistungen, insbesondere die Verwahrung und Verwaltung von Kryptowerten, die Ausführung von Aufträgen sowie ergänzende Funktionen wie Staking und Krypto-Vorsorge.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            1.3 Abweichende, entgegenstehende oder ergänzende Geschäftsbedingungen des Kunden werden nicht Vertragsbestandteil, es sei denn, wir stimmen ihrer Geltung ausdrücklich schriftlich zu.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">2. Regulatorischer Rahmen</h2>
          <p className="text-muted-foreground leading-relaxed">
            2.1 Crypto-Börse ist als Crypto-Asset Service Provider (CASP) gemäß der EU-Verordnung über Märkte für Kryptowerte (MiCA — Verordnung (EU) 2023/1114) lizenziert und unterliegt der Aufsicht durch die zuständige nationale Behörde.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            2.2 Die MiCA-Lizenz ermöglicht uns die Erbringung von Krypto-Dienstleistungen im gesamten Europäischen Wirtschaftsraum (EWR) auf Basis des EU-Passportings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">3. Leistungsumfang</h2>
          <p className="text-muted-foreground leading-relaxed">
            3.1 Wir stellen eine Online-Plattform zur Verfügung, über die Kunden Zugang zu Märkten für Kryptowährungen, Aktien & Wertpapiere, globale Indizes und Rohstoffe erhalten. Die Plattform umfasst Charting-Werkzeuge, Portfolio-Verwaltung, Staking-Angebote sowie ergänzende Analyse- und Berichtsfunktionen.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            3.2 Wir erbringen keine individuelle Anlageberatung und keine diskretionäre Vermögensverwaltung, sofern dies nicht ausdrücklich vertraglich vereinbart wird. Sämtliche bereitgestellten Inhalte, Marktdaten, Analysen oder Hinweise dienen ausschließlich Informationszwecken und stellen keine Empfehlung zum Kauf oder Verkauf bestimmter Finanzinstrumente dar.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            3.3 Wir behalten uns das Recht vor, einzelne Funktionen der Plattform jederzeit zu erweitern, zu ändern, einzuschränken oder einzustellen, sofern dies dem Kunden zumutbar ist.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">4. Vertragsschluss und Kontoeröffnung</h2>
          <p className="text-muted-foreground leading-relaxed">
            4.1 Der Vertrag kommt durch die elektronische Registrierung des Kunden auf der Plattform und unsere Annahme des Antrags zustande. Wir behalten uns vor, Anträge ohne Angabe von Gründen abzulehnen.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            4.2 Die Nutzung der Plattform setzt voraus, dass der Kunde das 18. Lebensjahr vollendet hat, voll geschäftsfähig ist und nicht in einem Land ansässig ist, das von unserer Dienstleistung ausgeschlossen ist (z. B. aufgrund von Sanktionen oder rechtlichen Beschränkungen).
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            4.3 Pro Person ist grundsätzlich nur ein Konto zulässig. Mehrfachkonten können ohne Vorankündigung gesperrt werden.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">5. Identifizierung (KYC) und Geldwäscheprävention</h2>
          <p className="text-muted-foreground leading-relaxed">
            5.1 Vor der Aktivierung wesentlicher Funktionen — insbesondere Ein- und Auszahlungen — ist der Kunde verpflichtet, sich gemäß den Vorgaben des schweizerischen Geldwäschereigesetzes (GwG) sowie der einschlägigen EU-Vorgaben (insbesondere der MiCA-Verordnung) zu identifizieren (Know-Your-Customer, „KYC").
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            5.2 Der Kunde verpflichtet sich, ausschließlich wahrheitsgemäße, vollständige und aktuelle Angaben zu machen sowie Änderungen seiner persönlichen Daten unverzüglich mitzuteilen. Wir sind berechtigt, jederzeit aktualisierte Identifikations- oder Herkunftsnachweise zu Vermögenswerten zu verlangen.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            5.3 Bei begründeten Verdachtsmomenten auf Geldwäsche, Terrorismusfinanzierung, Betrug oder andere strafbare Handlungen sind wir gesetzlich verpflichtet, Transaktionen zu verzögern, abzulehnen oder den zuständigen Behörden zu melden.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">6. Pflichten und Verhaltensregeln des Kunden</h2>
          <p className="text-muted-foreground leading-relaxed">Der Kunde verpflichtet sich insbesondere:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
            <li>seine Zugangsdaten (Login, Passwort, 2FA-Codes) streng vertraulich zu behandeln und vor unbefugtem Zugriff zu schützen;</li>
            <li>jeden Verdacht auf Missbrauch oder unbefugten Zugriff unverzüglich zu melden;</li>
            <li>die Plattform ausschließlich für eigene Zwecke und nicht im Auftrag Dritter zu nutzen;</li>
            <li>keine marktmanipulativen, betrügerischen oder missbräuchlichen Praktiken (z. B. Wash Trading, Spoofing, Insiderhandel) durchzuführen;</li>
            <li>keine automatisierten Systeme, Bots oder Scraping-Tools ohne unsere ausdrückliche schriftliche Zustimmung einzusetzen;</li>
            <li>sämtliche anwendbaren Gesetze, insbesondere steuerrechtliche Verpflichtungen im Wohnsitzstaat, einzuhalten.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">7. Ein- und Auszahlungen</h2>
          <p className="text-muted-foreground leading-relaxed">
            7.1 Einzahlungen sind über die jeweils auf der Plattform angebotenen Zahlungsmethoden (z. B. SEPA-Überweisung, Kreditkarte, Apple Pay, PayPal sowie ausgewählte Krypto-Wallets) möglich. Beträge werden dem Kundenkonto erst nach erfolgreicher Gutschrift und ggf. KYC-Prüfung zur Verfügung gestellt.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            7.2 Auszahlungen erfolgen ausschließlich auf ein vom Kunden hinterlegtes und verifiziertes Bankkonto bzw. Wallet, das auf den Namen des Kunden lautet. Auszahlungen an Drittkonten sind ausgeschlossen.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            7.3 Wir behalten uns vor, Auszahlungsanträge zu prüfen und bei begründetem Verdacht auf Missbrauch, ausstehender KYC-Verifizierung oder behördlicher Anordnung vorübergehend zurückzuhalten.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">8. Auftragsausführung, Preise und Slippage</h2>
          <p className="text-muted-foreground leading-relaxed">
            8.1 Aufträge werden im Rahmen unserer Bestmögliche-Ausführung-Grundsätze ausgeführt. Die angezeigten Preise basieren auf Echtzeit- bzw. nahezu Echtzeit-Daten anerkannter Handelsplätze (z. B. Binance Public API für Kryptowährungen) und können von tatsächlichen Ausführungspreisen abweichen.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            8.2 In Phasen erhöhter Volatilität, geringer Liquidität oder bei Marktstörungen kann es zu Slippage, Verzögerungen, Teilausführungen oder Nichtausführung von Aufträgen kommen. Ein Anspruch auf Ausführung zu einem bestimmten Preis besteht nicht.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            8.3 Wir sind berechtigt, Aufträge abzulehnen oder zu stornieren, die offensichtlich auf Fehlpreisen, technischen Störungen oder marktmanipulativen Verhaltensweisen beruhen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">9. Gebühren und Steuern</h2>
          <p className="text-muted-foreground leading-relaxed">
            9.1 Die jeweils gültigen Entgelte, Spreads, Finanzierungskosten und sonstigen Gebühren ergeben sich aus dem auf der Plattform veröffentlichten Preisverzeichnis. Änderungen werden dem Kunden mit angemessener Frist mitgeteilt.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            9.2 Sämtliche Konten werden in Euro (EUR) geführt. Beträge in anderen Währungen werden zu marktüblichen Kursen umgerechnet.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            9.3 Die steuerliche Behandlung der Einkünfte aus der Nutzung der Plattform liegt in der alleinigen Verantwortung des Kunden. Wir empfehlen, einen Steuerberater zu konsultieren.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            9.4 <strong className="text-foreground">KI-Erfolgsprovision:</strong> Bei Nutzung des KI-gestützten automatisierten Handels („AI Trading") wird auf jeden realisierten Gewinn einer durch die KI eröffneten und geschlossenen Position automatisch eine Erfolgsprovision in Höhe von <strong className="text-foreground">7 %</strong> einbehalten und vom Kontoguthaben des Kunden abgezogen. Die Provision fällt ausschließlich auf positive Handelsergebnisse an; bei Verlustgeschäften wird keine Provision berechnet. Die Verrechnung erfolgt unmittelbar bei Schließung der jeweiligen Position.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            9.5 <strong className="text-foreground">Testphase der KI und Wahl eines Kontotyps:</strong> Jeder Kunde durchläuft zunächst eine unverbindliche Testphase des KI-gestützten Handels, die in der Regel <strong className="text-foreground">20 bis 35 Trades</strong> umfasst. Nach Abschluss dieser Testphase kann sich der Kunde — sofern er die KI langfristig nutzen möchte — für einen <strong className="text-foreground">Kontotyp seiner Wahl</strong> aus unserem Angebot entscheiden. Trifft der Kunde keine Wahl, bleibt das Konto weiterhin <strong className="text-foreground">kostenlos</strong> bestehen; in diesem Fall ist der automatisierte KI-Handel jedoch nicht weiter verfügbar und der Kunde handelt eigenständig auf der Plattform. Eine spätere Auswahl eines Kontotyps zur Reaktivierung der KI-Funktion ist jederzeit möglich.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            9.6 <strong className="text-foreground">Bonusbuchung:</strong> Von Crypto-Börse gewährte Bonusbeträge werden innerhalb von <strong className="text-foreground">3 Werktagen</strong> nach Genehmigung auf das Kundenkonto gebucht. Die Buchung erfolgt in der auf dem Konto geführten Währung (EUR). Der Kunde wird über die erfolgte Gutschrift per E-Mail oder über die interne Benachrichtigungsfunktion der Plattform informiert.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">10. Risikohinweise</h2>
          <p className="text-muted-foreground leading-relaxed">
            10.1 Der Handel mit Kryptowährungen, Aktien & Wertpapieren, Indizes und Rohstoffen ist mit Risiken verbunden. Kursschwankungen können zum Totalverlust des eingesetzten Kapitals führen.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            10.2 Vergangene Wertentwicklungen sind kein verlässlicher Indikator für zukünftige Ergebnisse. Hebelprodukte sowie Staking-Erträge beinhalten zusätzliche Risiken, über die der Kunde sich vor Nutzung eigenverantwortlich zu informieren hat.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            10.3 Der Kunde bestätigt, die Risikohinweise gelesen und verstanden zu haben und die Plattform nur in dem Umfang zu nutzen, der seinen finanziellen Verhältnissen, Kenntnissen und Erfahrungen entspricht.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            10.4 <strong className="text-foreground">Besondere Hinweise zum automatisierten Handel (AI Trading):</strong> Bei Aktivierung des automatisierten Handels durch die KI setzt das System pro Handelsentscheidung maximal <strong className="text-foreground">10 % des aktuellen Kontoguthabens</strong> des Kunden ein. Zusätzlich wird für jede automatisch eröffnete Position ein verbindlicher <strong className="text-foreground">Stop-Loss in Höhe von 10 %</strong> des eingesetzten Positionsvolumens gesetzt, um das Verlustrisiko pro Trade zu begrenzen. Diese Risikoparameter dienen der Risikosteuerung, stellen jedoch keine Garantie gegen Verluste dar — insbesondere bei extremer Marktvolatilität, Kurslücken (Gaps) oder geringer Liquidität kann der tatsächliche Ausführungspreis vom Stop-Loss-Niveau abweichen (Slippage).
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            10.5 <strong className="text-foreground">Voraussetzung für die Nutzung des Copy Tradings:</strong> Die Copy-Trading-Funktion steht ausschließlich Kunden zur Verfügung, die mindestens den <strong className="text-foreground">Basic-Plan</strong> abgeschlossen haben. Kunden ohne aktiven Vermögensplan oder mit einem geringeren Kontostand als der für den Basic-Plan erforderlichen Mindesteinlage sind nicht berechtigt, die Copy-Trading-Funktion zu aktivieren oder zu nutzen. Eine vorzeitige oder unberechtigte Nutzung berechtigt den Anbieter dazu, eröffnete Copy-Trading-Positionen ohne Vorankündigung zu schließen, bestehende Abonnements zu beenden und etwaige hierdurch entstandene Gewinne zu stornieren.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            10.6 <strong className="text-foreground">Voraussetzung für die Nutzung von Hebelprodukten (Leverage &gt; 1:1):</strong> Die Eröffnung von Positionen mit einem <strong className="text-foreground">Hebel größer als 1:1</strong> (einschließlich, aber nicht beschränkt auf 1:5, 1:10, 1:20, 1:50 und 1:100) ist ausschließlich Kunden vorbehalten, die mindestens den <strong className="text-foreground">Basic-Plan</strong> abgeschlossen und aktiviert haben. Kunden ohne aktiven Vermögensplan oder mit einem geringeren Kontostand als der für den Basic-Plan erforderlichen Mindesteinlage sind <strong className="text-foreground">ausschließlich</strong> berechtigt, Positionen mit einem Hebel von <strong className="text-foreground">1:1</strong> zu eröffnen. Eine unberechtigte Nutzung eines Hebels über 1:1 berechtigt den Anbieter dazu, betroffene Positionen ohne Vorankündigung zu schließen, etwaige hierdurch entstandene Gewinne ersatzlos zu stornieren und entsprechende Beträge vom Kontoguthaben zurückzubuchen.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            10.7 <strong className="text-foreground">Servicegebühr für Copy Trading:</strong> Für jede aktivierte Copy-Trading-Subscription wird eine einmalige, nicht erstattungsfähige <strong className="text-foreground">Servicegebühr in Höhe von 5 % des investierten Kapitals (mindestens jedoch € 25,00) pro Subscription</strong> erhoben. Die Gebühr deckt unter anderem die Bereitstellung der Signal-Infrastruktur, die Lizenzkosten der jeweiligen Strategieanbieter, die laufende Überwachung der kopierten Positionen sowie die technische Synchronisation mit dem Konto des Kunden ab. Sie wird zum Zeitpunkt der Aktivierung der Subscription automatisch vom EUR-Guthaben des Kunden einbehalten und ist <strong className="text-foreground">unabhängig vom späteren Erfolg oder Misserfolg der kopierten Strategie</strong>. Bei Beendigung, Pausierung oder vorzeitiger Kündigung einer Subscription besteht <strong className="text-foreground">kein Anspruch auf (anteilige) Rückerstattung</strong> der bereits entrichteten Servicegebühr. Wird dieselbe oder eine andere Strategie nach Kündigung erneut abonniert, fällt die Gebühr erneut an.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            10.8 <strong className="text-foreground">Besondere Hinweise zum Copy Trading und Wochenend-Wartung:</strong> Die dem Copy Trading sowie dem automatisierten KI-Handel zugrunde liegenden Algorithmen werden regelmäßig <strong className="text-foreground">an Wochenenden (Samstag und Sonntag)</strong> neu kalibriert, aktualisiert und an aktuelle Marktbedingungen angepasst. In diesem Zeitraum kann es insbesondere bei Kunden, die bereits den <strong className="text-foreground">automatisierten Handel (AI Trading) aktiviert haben</strong> und während des Wochenendes zusätzlich die <strong className="text-foreground">Copy-Trading-Funktion</strong> einschalten, zu <strong className="text-foreground">technischen Schwierigkeiten, Verzögerungen, doppelten oder fehlerhaften Signal­ausführungen sowie temporären Inkonsistenzen</strong> zwischen den beiden Systemen kommen. Wir empfehlen ausdrücklich, eine Aktivierung oder Umstellung der Copy-Trading-Funktion <strong className="text-foreground">außerhalb der Wochenend-Wartungsfenster</strong> (d. h. werktags) vorzunehmen. Eine Haftung für Schäden, entgangene Gewinne oder fehlerhafte Trades, die nachweislich auf eine Aktivierung der Copy-Trading-Funktion während des Wochenend-Wartungsfensters bei gleichzeitig laufendem AI Trading zurückzuführen sind, ist — soweit gesetzlich zulässig — ausgeschlossen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">11. Verwahrung von Kryptowerten</h2>
          <p className="text-muted-foreground leading-relaxed">
            11.1 Soweit wir Kryptowerte für den Kunden verwahren, erfolgt dies getrennt von unserem Eigenvermögen entsprechend den Vorgaben der MiCA-Verordnung.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            11.2 Wir setzen branchenübliche Sicherheitsmaßnahmen ein, einschließlich Cold-Storage-Lösungen, Mehrfach-Signatur-Verfahren und kontinuierlicher Sicherheitsüberprüfungen. Eine vollständige Sicherheit gegen technische Angriffe Dritter kann jedoch nicht garantiert werden.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">12. Haftung</h2>
          <p className="text-muted-foreground leading-relaxed">
            12.1 Wir haften unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            12.2 Für Schäden aus leicht fahrlässiger Verletzung wesentlicher Vertragspflichten („Kardinalpflichten") haften wir der Höhe nach beschränkt auf den vertragstypischen, vorhersehbaren Schaden.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            12.3 Eine Haftung für entgangenen Gewinn, Folgeschäden, Marktrisiken, Volatilität oder höhere Gewalt (z. B. Netzwerkausfälle, Hacking-Angriffe Dritter, behördliche Maßnahmen) ist — soweit gesetzlich zulässig — ausgeschlossen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">13. Kontosperrung und Vertragsbeendigung</h2>
          <p className="text-muted-foreground leading-relaxed">
            13.1 Der Kunde kann das Vertragsverhältnis jederzeit ohne Einhaltung einer Frist durch Schließung seines Kontos beenden, sofern keine offenen Positionen oder Verpflichtungen bestehen.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            13.2 Wir sind berechtigt, das Vertragsverhältnis mit einer Frist von 30 Tagen ordentlich zu kündigen. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund — insbesondere bei Verstößen gegen diese AGB, bei Verdacht auf strafbare Handlungen oder bei behördlichen Anordnungen — bleibt unberührt.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            13.3 Im Falle der Kündigung werden Guthaben nach Abzug offener Forderungen und nach Abschluss aller Compliance-Prüfungen auf das verifizierte Konto des Kunden ausgezahlt.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            13.4 <strong className="text-foreground">Bonusumsatzbedingungen:</strong> Ein einmal beanspruchter Bonus muss mindestens <strong className="text-foreground">30 Tage</strong> auf dem Konto verbleiben und aktiv im Handel eingesetzt werden, bevor eine Auszahlung des Bonusbetrags oder daraus resultierender Gewinne erfolgen kann. Eine vorzeitige Auszahlung führt zum automatischen Verfall des Bonus und aller damit erzielten Gewinne.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">14. Datenschutz</h2>
          <p className="text-muted-foreground leading-relaxed">
            Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer Datenschutzerklärung sowie den Vorgaben der Datenschutz-Grundverordnung (DSGVO) und des schweizerischen Datenschutzgesetzes (DSG).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">15. Änderungen der AGB</h2>
          <p className="text-muted-foreground leading-relaxed">
            15.1 Wir sind berechtigt, diese AGB mit Wirkung für die Zukunft anzupassen, sofern dies aus regulatorischen, technischen oder wirtschaftlichen Gründen erforderlich ist und der Kunde dadurch nicht unangemessen benachteiligt wird.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            15.2 Über Änderungen werden Kunden mindestens 30 Tage vor Inkrafttreten per E-Mail oder Plattform-Benachrichtigung informiert. Widerspricht der Kunde nicht innerhalb der Frist, gelten die geänderten Bedingungen als angenommen. Auf das Widerspruchsrecht und dessen Folgen werden wir gesondert hinweisen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">16. Streitbeilegung, anwendbares Recht und Gerichtsstand</h2>
          <p className="text-muted-foreground leading-relaxed">
            16.1 Es gilt ausschließlich schweizerisches Recht unter Ausschluss des UN-Kaufrechts und der kollisionsrechtlichen Verweisungsnormen. Zwingende verbraucherschutzrechtliche Bestimmungen des Wohnsitzstaates des Kunden bleiben unberührt.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            16.2 Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist Leuk, Kanton Wallis, Schweiz, soweit es sich beim Kunden nicht um einen Verbraucher handelt.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            16.3 Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) unter <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr</a> zur Verfügung. Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">17. Schlussbestimmungen</h2>
          <p className="text-muted-foreground leading-relaxed">
            17.1 Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam oder undurchführbar sein, so bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            17.2 Mündliche Nebenabreden bestehen nicht. Änderungen und Ergänzungen dieses Vertrags bedürfen der Textform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-semibold mb-2">18. Kontakt</h2>
          <p className="text-muted-foreground leading-relaxed">
            Bei Fragen zu diesen AGB erreichen Sie uns unter:<br />
            <strong className="text-foreground">Crypto Strategy GmbH</strong><br />
            c/o Harald Zentriegen, Hauptplatz 2, 3953 Leuk Stadt, Schweiz<br />
            E-Mail: support@crypto-borse.com
          </p>
        </section>
      </div>
    </div>
    <PublicFooter />
  </div>
);

export default TermsConditions;
