import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Link, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Crypto-Börse"
const SUPPORT_EMAIL = "support@crypto-borse.com"
const LOGO_URL = "https://crypto-borse.com/__l5e/assets-v1/787eb6c9-7dfb-4fbc-86c5-c87ff3b1b884/crypto-boerse-logo-white.png"

interface NoAnswerFollowupProps {
  clientName?: string
  agentName?: string
  agentEmail?: string
  funnelName?: string
}

const NoAnswerFollowupEmail = ({
  clientName,
  agentName,
  agentEmail,
  funnelName,
}: NoAnswerFollowupProps) => (
  <Html lang="de" dir="ltr">
    <Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </Head>
    <Preview>
      Wir möchten Ihre Registrierung abschließen — {SITE_NAME}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={headerBand}>
          <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
            <tr>
              <td style={{ verticalAlign: 'middle' }}>
                <Img src={LOGO_URL} alt={SITE_NAME} width="180" height="auto" style={{ display: 'block' }} />
              </td>
            </tr>
          </table>
        </Section>

        {/* Gold accent line */}
        <Section style={goldAccent} />

        <Section style={content}>
          <Heading style={h1}>Wir möchten Ihre Registrierung abschließen</Heading>
          <Text style={greeting}>
            {clientName ? `Sehr geehrte/r ${clientName},` : 'Sehr geehrte Damen und Herren,'}
          </Text>
          <Text style={text}>
            mein Name ist {agentName || 'Ihr persönlicher Berater'} und ich bin Ihr Ansprechpartner bei {SITE_NAME}.
          </Text>
          <Text style={text}>
            Wir kontaktieren Sie, da Sie sich kürzlich für unsere Investment-Kampagne
            {funnelName ? ` „${funnelName}"` : ''} registriert haben.
            Wir haben mehrfach versucht, Sie per E-Mail und Live-Chat zu erreichen, um den
            Registrierungsprozess gemeinsam mit Ihnen abzuschließen und Sie umfassend zu beraten.
          </Text>
          <Text style={text}>
            Leider konnten wir Sie bisher nicht erreichen. Wir möchten sicherstellen, dass Sie
            alle Informationen erhalten, die Sie benötigen, und Ihnen bei den nächsten Schritten
            behilflich sind.
          </Text>

          {/* Contact details card */}
          <Section style={detailsCard}>
            <Text style={detailsTitle}>So erreichen Sie uns</Text>
            <Hr style={detailsDivider} />
            <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
              <tr>
                <td style={iconCell}>✉️</td>
                <td style={detailCellLabel}>E-Mail</td>
                <td style={detailCellValue}>
                  <Link href={`mailto:${agentEmail || SUPPORT_EMAIL}`} style={linkStyle}>
                    {agentEmail || SUPPORT_EMAIL}
                  </Link>
                </td>
              </tr>
              {agentName && (
                <tr>
                  <td style={iconCell}>👤</td>
                  <td style={detailCellLabel}>Ihr Berater</td>
                  <td style={detailCellValue}>{agentName}</td>
                </tr>
              )}
              {agentEmail && (
                <tr>
                  <td style={iconCell}>📧</td>
                  <td style={detailCellLabel}>Berater E-Mail</td>
                  <td style={detailCellValue}>
                    <Link href={`mailto:${agentEmail}`} style={linkStyle}>
                      {agentEmail}
                    </Link>
                  </td>
                </tr>
              )}
            </table>
          </Section>

          <Section style={ctaCard}>
            <Text style={ctaTitle}>So schließen Sie Ihre Registrierung ab</Text>
            <Text style={ctaText}>
              Um den Registrierungsprozess abzuschließen, kontaktieren Sie uns bitte auf eine der folgenden Arten:
            </Text>
            {agentEmail ? (
              <Text style={ctaStep}>
                <strong>1.</strong> Antworten Sie direkt auf diese E-Mail bzw. schreiben Sie an Ihren persönlichen Berater unter{' '}
                <Link href={`mailto:${agentEmail}`} style={linkStyleDark}>
                  {agentEmail}
                </Link>
              </Text>
            ) : (
              <Text style={ctaStep}>
                <strong>1.</strong> Schreiben Sie uns eine E-Mail an{' '}
                <Link href={`mailto:${agentEmail || SUPPORT_EMAIL}`} style={linkStyleDark}>
                  {agentEmail || SUPPORT_EMAIL}
                </Link>
              </Text>
            )}
          </Section>

          <Text style={text}>
            Bitte teilen Sie uns mit, wann es Ihnen am besten passt, damit wir uns zurückmelden
            und den Prozess gemeinsam abschließen können.
          </Text>
          <Text style={text}>
            Wir freuen uns darauf, Sie persönlich zu beraten und gemeinsam die besten
            Investmentmöglichkeiten für Sie zu finden.
          </Text>

          <Hr style={{ borderTop: '1px solid #e5e0d5', margin: '28px 0 20px' }} />

          <Text style={closing}>Mit freundlichen Grüßen,</Text>
          <Text style={signatureName}>
            {agentName || `Ihr ${SITE_NAME} Team`}
          </Text>
          <Text style={signatureCompany}>
            {SITE_NAME} — Premium Investment Solutions
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="120" height="auto" style={{ display: 'block', margin: '0 auto 12px' }} />
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
  component: NoAnswerFollowupEmail,
  subject: 'Wir haben versucht, Sie zu erreichen — Crypto-Börse',
  displayName: 'No Answer Follow-up',
  previewData: {
    clientName: 'Max Mustermann',
    agentName: 'Thomas Berger',
    agentEmail: 'thomas.berger@crypto-borse.com',
    funnelName: 'Krypto Investment 2026',
  },
} satisfies TemplateEntry

// ── Styles ──────────────────────────────────────────────────────────────

const main = {
  backgroundColor: '#f4f2ee',
  fontFamily: "'DM Sans', 'Source Sans 3', Arial, sans-serif",
  padding: '20px 0',
}

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  borderRadius: '12px',
  overflow: 'hidden' as const,
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
}

const headerBand = {
  backgroundColor: '#0a0f1a',
  padding: '28px 32px',
}

const goldAccent = {
  height: '3px',
  background: 'linear-gradient(90deg, #1e40af, #3b82f6, #1e40af)',
  fontSize: '0',
  lineHeight: '0',
}

const content = {
  backgroundColor: '#ffffff',
  padding: '36px 32px 28px',
}

const h1 = {
  fontSize: '22px',
  fontWeight: '700' as const,
  color: '#0a0f1a',
  margin: '0 0 24px',
  letterSpacing: '-0.3px',
}

const greeting = {
  fontSize: '15px',
  color: '#0a0f1a',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const text = {
  fontSize: '14px',
  color: '#3a3d45',
  lineHeight: '1.75',
  margin: '0 0 16px',
}

const detailsCard = {
  backgroundColor: '#0a0f1a',
  borderRadius: '10px',
  padding: '20px 24px',
  margin: '24px 0',
}

const detailsTitle = {
  fontSize: '12px',
  fontWeight: '600' as const,
  color: '#1e40af',
  textTransform: 'uppercase' as const,
  letterSpacing: '1.5px',
  margin: '0 0 8px',
}

const detailsDivider = {
  borderTop: '1px solid rgba(212,175,55,0.25)',
  margin: '12px 0 16px',
}

const iconCell = {
  width: '28px',
  fontSize: '14px',
  verticalAlign: 'middle' as const,
  paddingBottom: '8px',
}

const detailCellLabel = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.55)',
  fontWeight: '500' as const,
  verticalAlign: 'middle' as const,
  paddingBottom: '8px',
  paddingRight: '12px',
  whiteSpace: 'nowrap' as const,
}

const detailCellValue = {
  fontSize: '14px',
  color: '#ffffff',
  fontWeight: '600' as const,
  verticalAlign: 'middle' as const,
  paddingBottom: '8px',
}

const linkStyle = {
  color: '#1e40af',
  textDecoration: 'none',
}

const linkStyleDark = {
  color: '#0a0f1a',
  textDecoration: 'underline',
  fontWeight: '600' as const,
}

const ctaCard = {
  backgroundColor: '#fbf7ec',
  border: '1px solid #e6d8a8',
  borderLeft: '4px solid #1e40af',
  borderRadius: '10px',
  padding: '20px 24px',
  margin: '24px 0',
}

const ctaTitle = {
  fontSize: '13px',
  fontWeight: '700' as const,
  color: '#0a0f1a',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 12px',
}

const ctaText = {
  fontSize: '14px',
  color: '#3a3d45',
  lineHeight: '1.6',
  margin: '0 0 12px',
}

const ctaStep = {
  fontSize: '14px',
  color: '#3a3d45',
  lineHeight: '1.7',
  margin: '0 0 8px',
}

const closing = {
  fontSize: '14px',
  color: '#3a3d45',
  lineHeight: '1.7',
  margin: '0 0 4px',
}

const signatureName = {
  fontSize: '15px',
  fontWeight: '700' as const,
  color: '#0a0f1a',
  margin: '0',
}

const signatureCompany = {
  fontSize: '12px',
  color: '#1e40af',
  fontWeight: '500' as const,
  margin: '2px 0 0',
  letterSpacing: '0.3px',
}

const footer = {
  backgroundColor: '#0a0f1a',
  padding: '24px 32px',
}

const footerText = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.5)',
  margin: '0 0 4px',
  textAlign: 'center' as const,
}

const footerDisclaimer = {
  fontSize: '10px',
  color: 'rgba(255,255,255,0.3)',
  margin: '0',
  textAlign: 'center' as const,
  lineHeight: '1.5',
}
