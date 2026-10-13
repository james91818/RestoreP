import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Crypto-Börse"

interface Leverage100NoticeProps {
  clientName?: string
}

const Leverage100NoticeEmail = ({ clientName }: Leverage100NoticeProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>
      Wichtiger Hinweis: Hebel 1:100 nur ab Starter Vermögensplan verfügbar
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerBand}>
          <Text style={headerLogo}>{SITE_NAME}</Text>
        </Section>

        <Section style={content}>
          <Heading style={h1}>Wichtiger Hinweis zur Nutzung des Hebels 1:100</Heading>
          <Text style={greeting}>
            {clientName ? `Sehr geehrter Herr ${clientName},` : 'Sehr geehrter Kunde,'}
          </Text>

          <Text style={text}>
            wir möchten Sie darüber informieren, dass die Nutzung des
            maximalen Hebels von <strong>1:100</strong> auf unserer
            Plattform an besondere Voraussetzungen geknüpft ist und
            ausschließlich qualifizierten Kunden zur Verfügung steht.
          </Text>

          <Section style={alertCard}>
            <Text style={alertTitle}>Voraussetzung – Starter Vermögensplan</Text>
            <Hr style={alertDivider} />
            <Text style={alertText}>
              Der Hebel <strong>1:100</strong> kann gemäß unseren
              aktualisierten Allgemeinen Geschäftsbedingungen (Abschnitt 10.6)
              ausschließlich von Kunden genutzt werden, die mindestens den
              <strong> Starter Vermögensplan </strong>
              abgeschlossen und aktiviert haben.
            </Text>
          </Section>

          <Text style={text}>
            Da bei Ihrem Konto aktuell <strong>kein aktiver Vermögensplan</strong> hinterlegt
            ist, waren die mit Hebel 1:100 eröffneten Positionen nicht
            regelkonform. Wir mussten daher die betreffenden Trades sowie die
            daraus erzielten Gewinne <strong>stornieren</strong> und Ihren
            Kontostand entsprechend korrigieren.
          </Text>

          <Section style={infoCard}>
            <Text style={infoTitle}>So nutzen Sie den Hebel 1:100</Text>
            <Hr style={infoDivider} />
            <Text style={infoText}>
              Um den maximalen Hebel von 1:100 nutzen zu können, aktivieren
              Sie bitte mindestens den <strong>Starter Vermögensplan</strong>.
              Ihr persönlicher Berater unterstützt Sie gerne bei der Auswahl
              und Aktivierung des für Sie passenden Plans.
            </Text>
          </Section>

          <Text style={text}>
            Bis zur Aktivierung eines Vermögensplans steht Ihnen weiterhin der
            Standardhebel zur Verfügung. Wir bitten um Ihr Verständnis – diese
            Regelung dient ausschließlich Ihrem Schutz und der Einhaltung
            unserer regulatorischen Vorgaben im Sinne eines verantwortungs­vollen
            Risikomanagements.
          </Text>

          <Text style={text}>
            Bei Rückfragen steht Ihnen Ihr persönlicher Berater
            selbstverständlich jederzeit zur Verfügung.
          </Text>

          <Text style={closing}>Mit freundlichen Grüßen,</Text>
          <Text style={signatureName}>Ihr {SITE_NAME} Team</Text>
          <Text style={signatureCompany}>
            {SITE_NAME} — Premium Investment Solutions
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} {SITE_NAME}. Alle Rechte vorbehalten.
          </Text>
          <Text style={footerDisclaimer}>
            Diese E-Mail und ihre Anhänge sind vertraulich und ausschließlich für den bezeichneten Empfänger bestimmt.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Leverage100NoticeEmail,
  subject: 'Wichtiger Hinweis zur Nutzung des Hebels 1:100 — Crypto-Börse',
  displayName: 'Leverage 1:100 Notice (DE)',
  previewData: {
    clientName: 'Lorz',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', 'Source Sans 3', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const headerBand = { backgroundColor: 'hsl(213, 40%, 22%)', padding: '24px 30px', borderRadius: '8px 8px 0 0' }
const headerLogo = { color: '#ffffff', fontSize: '20px', fontWeight: '700' as const, margin: '0', letterSpacing: '0.5px' }
const content = { padding: '32px 30px 24px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: 'hsl(220, 20%, 14%)', margin: '0 0 24px' }
const greeting = { fontSize: '15px', color: 'hsl(220, 20%, 14%)', lineHeight: '1.6', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.7', margin: '0 0 16px' }

const alertCard = { backgroundColor: 'hsl(0, 70%, 97%)', border: '1px solid hsl(0, 60%, 88%)', borderRadius: '8px', padding: '20px 24px', margin: '24px 0' }
const alertTitle = { fontSize: '13px', fontWeight: '700' as const, color: 'hsl(0, 65%, 42%)', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 8px' }
const alertDivider = { borderTop: '1px solid hsl(0, 60%, 88%)', margin: '12px 0' }
const alertText = { fontSize: '14px', color: 'hsl(220, 20%, 14%)', lineHeight: '1.7', margin: '0' }

const infoCard = { backgroundColor: 'hsl(45, 70%, 96%)', border: '1px solid hsl(45, 60%, 80%)', borderRadius: '8px', padding: '20px 24px', margin: '24px 0' }
const infoTitle = { fontSize: '13px', fontWeight: '700' as const, color: 'hsl(38, 65%, 35%)', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 8px' }
const infoDivider = { borderTop: '1px solid hsl(45, 60%, 80%)', margin: '12px 0' }
const infoText = { fontSize: '14px', color: 'hsl(220, 20%, 14%)', lineHeight: '1.7', margin: '0' }

const closing = { fontSize: '14px', color: '#55575d', lineHeight: '1.7', margin: '24px 0 4px' }
const signatureName = { fontSize: '14px', fontWeight: '600' as const, color: 'hsl(220, 20%, 14%)', margin: '0' }
const signatureCompany = { fontSize: '12px', color: 'hsl(220, 10%, 44%)', margin: '2px 0 0' }
const footer = { backgroundColor: 'hsl(40, 18%, 97%)', padding: '20px 30px', borderRadius: '0 0 8px 8px', borderTop: '1px solid hsl(40, 12%, 87%)' }
const footerText = { fontSize: '11px', color: 'hsl(220, 10%, 44%)', margin: '0 0 4px', textAlign: 'center' as const }
const footerDisclaimer = { fontSize: '10px', color: '#999999', margin: '0', textAlign: 'center' as const, lineHeight: '1.5' }
