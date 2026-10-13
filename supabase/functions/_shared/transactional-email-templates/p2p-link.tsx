import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Crypto-Börse'
const P2P_URL = 'https://p2p.crypto-borse.com'
const SUPPORT_EMAIL = 'support@crypto-borse.com'
const LOGO_URL = 'https://crypto-borse.com/__l5e/assets-v1/787eb6c9-7dfb-4fbc-86c5-c87ff3b1b884/crypto-boerse-logo-white.png'

interface P2pLinkProps {
  clientName?: string
  agentName?: string
}

const P2pLinkEmail = ({ clientName, agentName }: P2pLinkProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Aktivieren Sie Ihr Handelskonto per SEPA-Überweisung</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerBand}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="180" height="auto" style={{ display: 'block' }} />
        </Section>
        <Section style={accent} />

        <Section style={content}>
          <Heading style={h1}>Handelskonto aktivieren</Heading>
          <Text style={greeting}>
            {clientName ? `Sehr geehrte/r ${clientName},` : 'Sehr geehrte Damen und Herren,'}
          </Text>
          <Text style={text}>
            um Ihr Handelskonto bei <strong>{SITE_NAME}</strong> vollständig zu aktivieren, ist
            eine einmalige Ersteinzahlung per <strong>SEPA-Banküberweisung</strong> erforderlich.
          </Text>
          <Text style={text}>
            Über unser sicheres P2P-Portal erhalten Sie die individuellen Bankdaten für Ihre
            Überweisung. Nach Eingang der Zahlung wird Ihr Konto automatisch freigeschaltet und
            Sie können unmittelbar mit dem Handel beginnen.
          </Text>

          <Section style={stepsCard}>
            <Text style={stepsTitle}>So gehen Sie vor</Text>
            <Hr style={stepsDivider} />
            <Text style={step}><strong style={stepNum}>1.</strong>&nbsp; Öffnen Sie das P2P-Portal über den untenstehenden Button.</Text>
            <Text style={step}><strong style={stepNum}>2.</strong>&nbsp; Wählen Sie den gewünschten Betrag und erhalten Sie die Bankverbindung.</Text>
            <Text style={step}><strong style={stepNum}>3.</strong>&nbsp; Führen Sie die Überweisung von Ihrem Bankkonto aus.</Text>
            <Text style={{ ...step, margin: '0' }}><strong style={stepNum}>4.</strong>&nbsp; Ihr Handelskonto wird nach Zahlungseingang aktiviert.</Text>
          </Section>

          <Section style={{ textAlign: 'center' as const, margin: '28px 0 8px' }}>
            <Button style={cta} href={P2P_URL}>P2P-Portal öffnen</Button>
          </Section>
          <Text style={fallback}>
            Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br />
            <Link href={P2P_URL} style={linkStyle}>{P2P_URL}</Link>
          </Text>

          <Hr style={{ borderTop: '1px solid #e5e7eb', margin: '28px 0 20px' }} />

          <Text style={text}>
            Bei Fragen erreichen Sie uns per E-Mail an{' '}
            <Link href={`mailto:${SUPPORT_EMAIL}`} style={linkStyle}>{SUPPORT_EMAIL}</Link>{' '}
            oder über den Live-Chat auf crypto-borse.com.
          </Text>

          <Text style={closing}>Mit freundlichen Grüßen,</Text>
          <Text style={signatureName}>{agentName || `Ihr ${SITE_NAME} Team`}</Text>
          <Text style={signatureCompany}>{SITE_NAME} — Die führende Handelsplattform der DACH-Region</Text>
        </Section>

        <Section style={footer}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="120" height="auto" style={{ display: 'block', margin: '0 auto 12px' }} />
          <Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME}. Alle Rechte vorbehalten.</Text>
          <Text style={footerDisclaimer}>
            Diese E-Mail ist vertraulich und ausschließlich für den bezeichneten Empfänger bestimmt.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: P2pLinkEmail,
  subject: 'Aktivieren Sie Ihr Handelskonto — SEPA-Überweisung',
  displayName: 'P2P Link',
  previewData: {
    clientName: 'Max Mustermann',
    agentName: 'Thomas Berger',
  },
} satisfies TemplateEntry

// ── Styles ──────────────────────────────────────────────────────────────
const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif", padding: '20px 0' }
const container = { maxWidth: '600px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden' as const, boxShadow: '0 4px 24px rgba(15,23,42,0.08)' }
const headerBand = { backgroundColor: '#0a1628', padding: '28px 32px' }
const accent = { height: '3px', background: 'linear-gradient(90deg, #1e40af, #3b82f6, #1e40af)', fontSize: '0', lineHeight: '0' }
const content = { backgroundColor: '#ffffff', padding: '36px 32px 28px' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#0a1628', margin: '0 0 20px', letterSpacing: '-0.3px' }
const greeting = { fontSize: '15px', color: '#0a1628', lineHeight: '1.6', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.75', margin: '0 0 16px' }
const stepsCard = { backgroundColor: '#f1f5ff', border: '1px solid #dbe4ff', borderLeft: '4px solid #1e40af', borderRadius: '10px', padding: '18px 22px', margin: '24px 0 8px' }
const stepsTitle = { fontSize: '12px', fontWeight: '700' as const, color: '#1e40af', textTransform: 'uppercase' as const, letterSpacing: '1.2px', margin: '0 0 4px' }
const stepsDivider = { borderTop: '1px solid #dbe4ff', margin: '10px 0 14px' }
const step = { fontSize: '14px', color: '#1f2937', lineHeight: '1.65', margin: '0 0 8px' }
const stepNum = { color: '#1e40af', fontWeight: '700' as const }
const cta = { backgroundColor: '#1e40af', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: '700' as const, textDecoration: 'none', display: 'inline-block', letterSpacing: '0.3px' }
const fallback = { fontSize: '12px', color: '#6b7280', lineHeight: '1.6', margin: '4px 0 0', textAlign: 'center' as const }
const linkStyle = { color: '#1e40af', textDecoration: 'underline' }
const closing = { fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 4px' }
const signatureName = { fontSize: '15px', fontWeight: '700' as const, color: '#0a1628', margin: '0' }
const signatureCompany = { fontSize: '12px', color: '#1e40af', fontWeight: '500' as const, margin: '2px 0 0', letterSpacing: '0.3px' }
const footer = { backgroundColor: '#0a1628', padding: '24px 32px' }
const footerText = { fontSize: '11px', color: 'rgba(255,255,255,0.55)', margin: '0 0 4px', textAlign: 'center' as const }
const footerDisclaimer = { fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: '0', textAlign: 'center' as const, lineHeight: '1.5' }