import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Crypto-Börse"

interface Props {
  clientName?: string
  topic?: string
  preferredDate?: string
  preferredTime?: string
  alternateDate?: string
  alternateTime?: string
  notes?: string
  agentName?: string
}

const AppointmentRequestReceivedEmail = ({
  clientName, topic, preferredDate, preferredTime,
  alternateDate, alternateTime, notes, agentName,
}: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>{topic ? `Ihre Termin-Anfrage: ${topic}` : `Ihre Termin-Anfrage bei ${SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerBand}>
          <Text style={headerLogo}>{SITE_NAME}</Text>
        </Section>

        <Section style={content}>
          <Heading style={h1}>Termin-Anfrage erhalten</Heading>
          <Text style={greeting}>
            {clientName ? `Sehr geehrte/r ${clientName},` : 'Sehr geehrte Damen und Herren,'}
          </Text>
          <Text style={text}>
            vielen Dank für Ihre Termin-Anfrage. Wir haben Ihren Wunschtermin erhalten und melden uns
            in Kürze mit einer Bestätigung bei Ihnen.
          </Text>

          <Section style={detailsCard}>
            <Text style={detailsTitle}>Ihre Anfrage</Text>
            <Hr style={detailsDivider} />
            {topic && (
              <Text style={detailRow}><span style={detailLabel}>Thema:</span> {topic}</Text>
            )}
            {preferredDate && (
              <Text style={detailRow}>
                <span style={detailLabel}>Wunschtermin:</span> {preferredDate}
                {preferredTime ? ` um ${preferredTime} Uhr` : ''}
              </Text>
            )}
            {alternateDate && (
              <Text style={detailRow}>
                <span style={detailLabel}>Alternativtermin:</span> {alternateDate}
                {alternateTime ? ` um ${alternateTime} Uhr` : ''}
              </Text>
            )}
            {agentName && (
              <Text style={detailRow}><span style={detailLabel}>Ihr Berater:</span> {agentName}</Text>
            )}
            {notes && (
              <>
                <Hr style={detailsDivider} />
                <Text style={detailRow}><span style={detailLabel}>Ihre Nachricht:</span> {notes}</Text>
              </>
            )}
          </Section>

          <Text style={text}>
            Sobald Ihr Berater den Termin bestätigt hat, erhalten Sie eine separate Bestätigungs-E-Mail
            mit allen Details.
          </Text>

          <Text style={closing}>Mit freundlichen Grüßen,</Text>
          <Text style={signatureName}>{agentName ? agentName : `Ihr ${SITE_NAME} Team`}</Text>
          <Text style={signatureCompany}>{SITE_NAME} — Premium Investment Solutions</Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} {SITE_NAME}. Alle Rechte vorbehalten.
          </Text>
          <Text style={footerDisclaimer}>
            Diese E-Mail ist vertraulich und ausschließlich für den bezeichneten Empfänger bestimmt.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AppointmentRequestReceivedEmail,
  subject: (data: Record<string, any>) =>
    data.topic
      ? `Termin-Anfrage erhalten: ${data.topic} — Crypto-Börse`
      : 'Termin-Anfrage erhalten — Crypto-Börse',
  displayName: 'Appointment Request Received',
  previewData: {
    clientName: 'Max Mustermann',
    topic: 'Portfolio-Besprechung',
    preferredDate: 'Montag, 14. April 2026',
    preferredTime: '10:00',
    alternateDate: 'Dienstag, 15. April 2026',
    alternateTime: '14:00',
    notes: 'Bitte über die Auszahlungsoptionen sprechen.',
    agentName: 'Thomas Berger',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'DM Sans', 'Source Sans 3', Arial, sans-serif",
}
const container = { maxWidth: '600px', margin: '0 auto' }
const headerBand = {
  backgroundColor: 'hsl(213, 40%, 22%)',
  padding: '24px 30px',
  borderRadius: '8px 8px 0 0',
}
const headerLogo = {
  color: '#ffffff', fontSize: '20px', fontWeight: '700' as const,
  margin: '0', letterSpacing: '0.5px',
}
const content = { padding: '32px 30px 24px' }
const h1 = {
  fontSize: '24px', fontWeight: '700' as const,
  color: 'hsl(220, 20%, 14%)', margin: '0 0 24px',
}
const greeting = {
  fontSize: '15px', color: 'hsl(220, 20%, 14%)', lineHeight: '1.6', margin: '0 0 16px',
}
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.7', margin: '0 0 16px' }
const detailsCard = {
  backgroundColor: 'hsl(40, 18%, 97%)',
  border: '1px solid hsl(40, 12%, 87%)',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '24px 0',
}
const detailsTitle = {
  fontSize: '13px', fontWeight: '600' as const, color: 'hsl(213, 40%, 22%)',
  textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 8px',
}
const detailsDivider = { borderTop: '1px solid hsl(40, 12%, 87%)', margin: '12px 0' }
const detailRow = {
  fontSize: '14px', color: 'hsl(220, 20%, 14%)', lineHeight: '1.6', margin: '6px 0',
}
const detailLabel = { fontWeight: '600' as const, color: 'hsl(220, 10%, 44%)' }
const closing = { fontSize: '14px', color: '#55575d', lineHeight: '1.7', margin: '24px 0 4px' }
const signatureName = {
  fontSize: '14px', fontWeight: '600' as const, color: 'hsl(220, 20%, 14%)', margin: '0',
}
const signatureCompany = { fontSize: '12px', color: 'hsl(220, 10%, 44%)', margin: '2px 0 0' }
const footer = {
  backgroundColor: 'hsl(40, 18%, 97%)',
  padding: '20px 30px',
  borderRadius: '0 0 8px 8px',
  borderTop: '1px solid hsl(40, 12%, 87%)',
}
const footerText = {
  fontSize: '11px', color: 'hsl(220, 10%, 44%)', margin: '0 0 4px', textAlign: 'center' as const,
}
const footerDisclaimer = {
  fontSize: '10px', color: '#999999', margin: '0', textAlign: 'center' as const, lineHeight: '1.5',
}
