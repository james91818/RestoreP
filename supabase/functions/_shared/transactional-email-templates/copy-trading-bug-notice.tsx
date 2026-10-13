import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Crypto-Börse"

interface CopyTradingBugNoticeProps {
  clientName?: string
}

const CopyTradingBugNoticeEmail = ({ clientName }: CopyTradingBugNoticeProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>
      Wichtiger Hinweis zur Copy-Trading Störung – inkl. 100 EUR Goodwill-Bonus
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerBand}>
          <Text style={headerLogo}>{SITE_NAME}</Text>
        </Section>

        <Section style={content}>
          <Heading style={h1}>Wichtiger Hinweis – Copy Trading Störung</Heading>
          <Text style={greeting}>
            {clientName ? `Sehr geehrter Herr ${clientName},` : 'Sehr geehrter Kunde,'}
          </Text>

          <Text style={text}>
            in unserem Copy-Trading-System ist am vergangenen Wochenende ein
            technischer Fehler aufgetreten. Aufgrund dieses Bugs wurden eine
            Vielzahl von Trades fehlerhaft ausgeführt und mussten von unserem
            Tech-Team annulliert werden.
          </Text>

          <Section style={alertCard}>
            <Text style={alertTitle}>Was bedeutet das für Sie?</Text>
            <Hr style={alertDivider} />
            <Text style={alertText}>
              Sämtliche Gewinne, die über das Copy-Trading-System am Wochenende
              <strong> (ab Freitag, 17:00 Uhr) </strong>
              erzielt wurden, sind ungültig und wurden aus Ihrem Konto
              zurückgebucht. Wir bitten dieses Versehen aufrichtig zu entschuldigen
              und arbeiten mit Hochdruck an einer stabilen Lösung.
            </Text>
          </Section>

          <Section style={bonusCard}>
            <Text style={bonusTitle}>🎁 Unsere Entschuldigung</Text>
            <Hr style={bonusDivider} />
            <Text style={bonusText}>
              Als Entschädigung für die entstandenen Unannehmlichkeiten haben wir
              Ihrem Konto einen
              <strong style={bonusAmount}> Bonus in Höhe von 100,00 EUR </strong>
              gutgeschrieben. Der Betrag ist bereits in Ihrem EUR-Wallet verfügbar.
            </Text>
          </Section>

          <Text style={text}>
            Sie können den aktualisierten Kontostand jederzeit in Ihrem persönlichen
            Bereich einsehen. Bei Rückfragen steht Ihnen Ihr persönlicher Berater
            selbstverständlich jederzeit gerne zur Verfügung.
          </Text>

          <Text style={text}>
            Vielen Dank für Ihr Verständnis und Ihr fortwährendes Vertrauen in
            {` ${SITE_NAME}`}.
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
  component: CopyTradingBugNoticeEmail,
  subject: 'Wichtiger Hinweis zur Copy-Trading Störung — Crypto-Börse',
  displayName: 'Copy Trading Bug Notice (DE)',
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

const bonusCard = { backgroundColor: 'hsl(45, 70%, 96%)', border: '1px solid hsl(45, 60%, 80%)', borderRadius: '8px', padding: '20px 24px', margin: '24px 0' }
const bonusTitle = { fontSize: '13px', fontWeight: '700' as const, color: 'hsl(38, 65%, 35%)', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 8px' }
const bonusDivider = { borderTop: '1px solid hsl(45, 60%, 80%)', margin: '12px 0' }
const bonusText = { fontSize: '14px', color: 'hsl(220, 20%, 14%)', lineHeight: '1.7', margin: '0' }
const bonusAmount = { color: 'hsl(38, 70%, 32%)', fontWeight: '700' as const }

const closing = { fontSize: '14px', color: '#55575d', lineHeight: '1.7', margin: '24px 0 4px' }
const signatureName = { fontSize: '14px', fontWeight: '600' as const, color: 'hsl(220, 20%, 14%)', margin: '0' }
const signatureCompany = { fontSize: '12px', color: 'hsl(220, 10%, 44%)', margin: '2px 0 0' }
const footer = { backgroundColor: 'hsl(40, 18%, 97%)', padding: '20px 30px', borderRadius: '0 0 8px 8px', borderTop: '1px solid hsl(40, 12%, 87%)' }
const footerText = { fontSize: '11px', color: 'hsl(220, 10%, 44%)', margin: '0 0 4px', textAlign: 'center' as const }
const footerDisclaimer = { fontSize: '10px', color: '#999999', margin: '0', textAlign: 'center' as const, lineHeight: '1.5' }
