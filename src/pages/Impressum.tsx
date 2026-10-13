import PublicNav from "@/components/layout/PublicNav";
import PageHero from "@/components/layout/PageHero";
import { Landmark } from "lucide-react";

const Impressum = () => {
  return (
    <div className="min-h-screen bg-[hsl(var(--l-bg))] text-[hsl(var(--l-fg))]">
      <PublicNav />
      <PageHero
        kicker="Rechtliches"
        icon={Landmark}
        title="Impressum"
        description="Angaben gemäß § 5 ECG / § 25 MedienG."
        compact
      />
      <div className="container mx-auto px-4 py-16 max-w-3xl">

        <div className="space-y-8 text-[hsl(var(--l-fg))]">
          <section>
            <h2 className="text-xl font-display font-semibold mb-3 text-[hsl(var(--l-fg-high))]">Rechtlicher Anbieter</h2>
            <div className="space-y-1 text-[hsl(var(--l-fg-mid))] leading-relaxed">
              <p className="font-semibold text-[hsl(var(--l-fg-high))] text-lg"><span className="text-[hsl(var(--l-fg-mid))] font-normal text-base mr-1">Firmenname:</span>Crypto Strategy GmbH</p>
              <p>Rechtsform: Gesellschaft mit beschränkter Haftung — Swiss limited liability company</p>
              <p>Status: Active</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold mb-3 text-[hsl(var(--l-fg-high))]">Sitz & Geschäftsadresse</h2>
            <div className="space-y-1 text-[hsl(var(--l-fg-mid))] leading-relaxed">
              <p>Geschäftssitz: Leuk, Kanton Wallis, Schweiz</p>
              <p>Geschäftsadresse: c/o Harald Zentriegen, Hauptplatz 2, 3953 Leuk Stadt, Schweiz</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold mb-3 text-[hsl(var(--l-fg-high))]">Vertretung</h2>
            <div className="space-y-1 text-[hsl(var(--l-fg-mid))] leading-relaxed">
              <p>Geschäftsführer: Harald Zentriegen</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold mb-3 text-[hsl(var(--l-fg-high))]">Handelsregister</h2>
            <div className="space-y-1 text-[hsl(var(--l-fg-mid))] leading-relaxed">
              <p>Register-Nr.: CH-600.4.019.835-3</p>
              <p>Schweizer UID: CHE-382.433.944</p>
              <p>Zuständiges Register: Handelsregisteramt Oberwallis</p>
              <p>SHAB-Publikationsnummer: HR01-1005995140</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold mb-3 text-[hsl(var(--l-fg-high))]">Kontakt</h2>
            <div className="space-y-1 text-[hsl(var(--l-fg-mid))] leading-relaxed">
              <p>E-Mail: support@crypto-borse.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold mb-3 text-[hsl(var(--l-fg-high))]">Regulierung & Aufsicht</h2>
            <div className="space-y-2 text-[hsl(var(--l-fg-mid))] leading-relaxed">
              <p>Lizenziert als Crypto-Asset Service Provider (CASP) gemäß der EU-Verordnung über Märkte für Kryptowerte (MiCA — Markets in Crypto-Assets Regulation, Verordnung (EU) 2023/1114).</p>
              <p className="text-sm text-[hsl(var(--l-fg-low))] mt-2">Die MiCA-Lizenz ermöglicht die Erbringung von Krypto-Dienstleistungen im gesamten Europäischen Wirtschaftsraum (EWR) — über 30 Mitgliedstaaten — im Rahmen des EU-Passporting.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold mb-3 text-[hsl(var(--l-fg-high))]">Streitbeilegung</h2>
            <p className="text-[hsl(var(--l-fg-mid))] leading-relaxed">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:&nbsp;
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--l-gold))] hover:underline">
                https://ec.europa.eu/consumers/odr
              </a>.
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold mb-3 text-[hsl(var(--l-fg-high))]">Haftungsausschluss</h2>
            <p className="text-[hsl(var(--l-fg-mid))] leading-relaxed">
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Der Handel mit Finanzprodukten ist mit einem hohen Risiko verbunden und möglicherweise nicht für alle Anleger geeignet. Bitte informieren Sie sich umfassend über die Risiken.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold mb-3 text-[hsl(var(--l-fg-high))]">Urheberrecht</h2>
            <p className="text-[hsl(var(--l-fg-mid))] leading-relaxed">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem schweizerischen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </section>
        </div>
      </div>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} Crypto Strategy GmbH. Alle Rechte vorbehalten.
        </div>
      </footer>
    </div>
  );
};

export default Impressum;
