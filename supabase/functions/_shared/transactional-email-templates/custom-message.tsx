import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Crypto-Börse"
const LOGO_URL = "https://crypto-borse.com/__l5e/assets-v1/787eb6c9-7dfb-4fbc-86c5-c87ff3b1b884/crypto-boerse-logo-white.png"
const SUPPORT_EMAIL = "support@crypto-borse.com"
const WEBSITE_URL = "https://crypto-borse.com"

interface CustomMessageProps {
  subject?: string
  bodyText?: string
  clientName?: string
  agentName?: string
  agentEmail?: string
  replyUrl?: string
}

const CustomMessageEmail = ({
  subject,
  bodyText,
  clientName,
  agentName,
  agentEmail,
  replyUrl,
}: CustomMessageProps) => {
  const paragraphs = (bodyText || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  return (
    <Html lang="de" dir="ltr">
      <Head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        `}</style>
      </Head>
      <Preview>{subject || `Eine Nachricht von ${SITE_NAME}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerBand}>
            <Img src={LOGO_URL} alt={SITE_NAME} width="180" height="auto" style={{ display: 'block' }} />
          </Section>
          <Section style={goldAccent} />
          <Section style={content}>
            {subject && <Heading style={h1}>{subject}</Heading>}
            {clientName && (
              <Text style={greeting}>Sehr geehrte/r {clientName},</Text>
            )}
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => (
                <Text key={i} style={text}>
                  {p.split('\n').map((line, j, arr) => (
                    <React.Fragment key={j}>
                      {line}
                      {j < arr.length - 1 ? <br /> : null}
                    </React.Fragment>
                  ))}
                </Text>
              ))
            ) : (
              <Text style={text}>{bodyText || ''}</Text>
            )}
            <Hr style={{ borderTop: '1px solid #e5e0d5', margin: '28px 0 20px' }} />
            <Text style={closing}>Mit freundlichen Grüßen,</Text>
            <Text style={signatureName}>{agentName || `Ihr ${SITE_NAME} Team`}</Text>
            {agentEmail && <Text style={signatureEmail}>{agentEmail}</Text>}
            <Text style={signatureCompany}>{SITE_NAME} — Premium Investment Solutions</Text>

            {/* Reply in Portal CTA */}
            {replyUrl && (
              <Section style={{ textAlign: 'center' as const, margin: '28px 0 4px' }}>
                <Button href={replyUrl} style={replyButton}>
                  ↩  Direkt antworten
                </Button>
                <Text style={replyHint}>
                  Klicken Sie hier, um sicher und direkt im Kundenportal zu antworten.
                  Ihre Nachricht erreicht uns sofort.
                </Text>
              </Section>
            )}

            {/* Contact details card */}
            <Section style={detailsCard}>
              <Text style={detailsTitle}>So erreichen Sie uns</Text>
              <Hr style={detailsDivider} />
              <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                <tr>
                  <td style={iconCell}>✉️</td>
                  <td style={detailCellLabel}>Support</td>
                  <td style={detailCellValue}>
                    <Link href={`mailto:${SUPPORT_EMAIL}`} style={linkStyle}>
                      {SUPPORT_EMAIL}
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
                <tr>
                  <td style={iconCell}>🌐</td>
                  <td style={detailCellLabel}>Web</td>
                  <td style={detailCellValue}>
                    <Link href={WEBSITE_URL} style={linkStyle}>
                      crypto-borse.com
                    </Link>
                  </td>
                </tr>
              </table>
            </Section>
          </Section>
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
}

export const template = {
  component: CustomMessageEmail,
  subject: (data: Record<string, any>) =>
    (data?.subject && String(data.subject).trim()) || `Eine Nachricht von ${SITE_NAME}`,
  displayName: 'Custom Message',
  previewData: {
    subject: 'Persönliche Nachricht',
    bodyText: 'Dies ist ein Beispieltext.\n\nMit freundlichen Grüßen.',
    clientName: 'Max Mustermann',
    agentName: 'Thomas Berger',
    agentEmail: 'thomas.berger@crypto-borse.com',
    replyUrl: 'https://crypto-borse.com/reply/sample-token',
  },
} satisfies TemplateEntry

// ── Styles ──────────────────────────────────────────────────────────────
const main = { backgroundColor: '#f4f2ee', fontFamily: "'DM Sans', 'Source Sans 3', Arial, sans-serif", padding: '20px 0' }
const container = { maxWidth: '600px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden' as const, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }
const headerBand = { backgroundColor: '#0a0f1a', padding: '28px 32px' }
const goldAccent = { height: '3px', background: 'linear-gradient(90deg, #1e40af, #3b82f6, #1e40af)', fontSize: '0', lineHeight: '0' }
const content = { backgroundColor: '#ffffff', padding: '36px 32px 28px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#0a0f1a', margin: '0 0 24px', letterSpacing: '-0.3px' }
const greeting = { fontSize: '15px', color: '#0a0f1a', lineHeight: '1.6', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#3a3d45', lineHeight: '1.75', margin: '0 0 16px', whiteSpace: 'pre-wrap' as const }
const closing = { fontSize: '14px', color: '#3a3d45', lineHeight: '1.7', margin: '0 0 4px' }
const signatureName = { fontSize: '15px', fontWeight: '700' as const, color: '#0a0f1a', margin: '0' }
const signatureEmail = { fontSize: '12px', color: '#3a3d45', margin: '2px 0 0' }
const signatureCompany = { fontSize: '12px', color: '#1e40af', fontWeight: '500' as const, margin: '4px 0 0', letterSpacing: '0.3px' }
const footer = { backgroundColor: '#0a0f1a', padding: '24px 32px' }
const footerText = { fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px', textAlign: 'center' as const }
const footerDisclaimer = { fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: '0', textAlign: 'center' as const, lineHeight: '1.5' }

const detailsCard = { backgroundColor: '#0a0f1a', borderRadius: '10px', padding: '20px 24px', margin: '24px 0 0' }
const detailsTitle = { fontSize: '12px', fontWeight: '600' as const, color: '#1e40af', textTransform: 'uppercase' as const, letterSpacing: '1.5px', margin: '0 0 8px' }
const detailsDivider = { borderTop: '1px solid rgba(212,175,55,0.25)', margin: '12px 0 16px' }
const iconCell = { width: '28px', fontSize: '14px', verticalAlign: 'middle' as const, paddingBottom: '8px' }
const detailCellLabel = { fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontWeight: '500' as const, verticalAlign: 'middle' as const, paddingBottom: '8px', paddingRight: '12px', whiteSpace: 'nowrap' as const }
const detailCellValue = { fontSize: '14px', color: '#ffffff', fontWeight: '600' as const, verticalAlign: 'middle' as const, paddingBottom: '8px' }
const linkStyle = { color: '#1e40af', textDecoration: 'none' }
const replyButton = { backgroundColor: '#1e40af', color: '#ffffff', padding: '14px 36px', borderRadius: '8px', fontSize: '15px', fontWeight: '700' as const, textDecoration: 'none', display: 'inline-block', letterSpacing: '0.3px' }
const replyHint = { fontSize: '12px', color: '#6a6f7a', margin: '12px 0 0', lineHeight: '1.5', textAlign: 'center' as const }
