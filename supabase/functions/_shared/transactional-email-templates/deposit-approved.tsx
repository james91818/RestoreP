import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Crypto-Börse"

interface DepositApprovedProps {
  clientName?: string
  amount?: string
  currency?: string
  method?: string
  depositDate?: string
}

const DepositApprovedEmail = ({
  clientName,
  amount,
  currency,
  method,
  depositDate,
}: DepositApprovedProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>
      Ihre Einzahlung wurde Ihrem Konto gutgeschrieben
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerBand}>
          <Text style={headerLogo}>{SITE_NAME}</Text>
        </Section>

        <Section style={content}>
          <Heading style={h1}>Einzahlung bestätigt</Heading>
          <Text style={greeting}>
            {clientName ? `Sehr geehrte/r ${clientName},` : 'Sehr geehrte Damen und Herren,'}
          </Text>
          <Text style={text}>
            wir freuen uns, Ihnen mitzuteilen, dass Ihre Einzahlung erfolgreich bearbeitet
            und Ihrem Investmentkonto gutgeschrieben wurde. Der Betrag steht Ihnen ab sofort
            für Ihre Anlagen zur Verfügung.
          </Text>

          <Section style={detailsCard}>
            <Text style={detailsTitle}>Einzahlungsdetails</Text>
            <Hr style={detailsDivider} />
            {amount && (
              <Text style={detailRow}>
                <span style={detailLabel}>Betrag:</span> {amount} {currency || ''}
              </Text>
            )}
            {method && (
              <Text style={detailRow}>
                <span style={detailLabel}>Zahlungsmethode:</span> {method}
              </Text>
            )}
            {depositDate && (
              <Text style={detailRow}>
                <span style={detailLabel}>Datum:</span> {depositDate}
              </Text>
            )}
            <Text style={detailRow}>
              <span style={detailLabel}>Status:</span> Gutgeschrieben
            </Text>
          </Section>

          <Text style={text}>
            Sie können Ihren aktualisierten Kontostand und alle weiteren Details jederzeit
            in Ihrem persönlichen Bereich einsehen.
          </Text>
          <Text style={text}>
            Bei Fragen steht Ihnen Ihr persönlicher Berater jederzeit gerne zur Verfügung.
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
  component: DepositApprovedEmail,
  subject: 'Ihre Einzahlung wurde bestätigt — Crypto-Börse',
  displayName: 'Deposit Approved (DE)',
  previewData: {
    clientName: 'Max Mustermann',
    amount: '5.000,00',
    currency: 'EUR',
    method: 'Banküberweisung',
    depositDate: '28. April 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', 'Source Sans 3', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const headerBand = { backgroundColor: 'hsl(213, 40%, 22%)', padding: '24px 30px', borderRadius: '8px 8px 0 0' }
const headerLogo = { color: '#ffffff', fontSize: '20px', fontWeight: '700' as const, margin: '0', letterSpacing: '0.5px' }
const content = { padding: '32px 30px 24px' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: 'hsl(220, 20%, 14%)', margin: '0 0 24px' }
const greeting = { fontSize: '15px', color: 'hsl(220, 20%, 14%)', lineHeight: '1.6', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.7', margin: '0 0 16px' }
const detailsCard = { backgroundColor: 'hsl(40, 18%, 97%)', border: '1px solid hsl(40, 12%, 87%)', borderRadius: '8px', padding: '20px 24px', margin: '24px 0' }
const detailsTitle = { fontSize: '13px', fontWeight: '600' as const, color: 'hsl(213, 40%, 22%)', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 8px' }
const detailsDivider = { borderTop: '1px solid hsl(40, 12%, 87%)', margin: '12px 0' }
const detailRow = { fontSize: '14px', color: 'hsl(220, 20%, 14%)', lineHeight: '1.6', margin: '6px 0' }
const detailLabel = { fontWeight: '600' as const, color: 'hsl(220, 10%, 44%)' }
const closing = { fontSize: '14px', color: '#55575d', lineHeight: '1.7', margin: '24px 0 4px' }
const signatureName = { fontSize: '14px', fontWeight: '600' as const, color: 'hsl(220, 20%, 14%)', margin: '0' }
const signatureCompany = { fontSize: '12px', color: 'hsl(220, 10%, 44%)', margin: '2px 0 0' }
const footer = { backgroundColor: 'hsl(40, 18%, 97%)', padding: '20px 30px', borderRadius: '0 0 8px 8px', borderTop: '1px solid hsl(40, 12%, 87%)' }
const footerText = { fontSize: '11px', color: 'hsl(220, 10%, 44%)', margin: '0 0 4px', textAlign: 'center' as const }
const footerDisclaimer = { fontSize: '10px', color: '#999999', margin: '0', textAlign: 'center' as const, lineHeight: '1.5' }
