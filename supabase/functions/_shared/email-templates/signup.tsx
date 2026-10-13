/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Bestätigen Sie Ihre E-Mail-Adresse für {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>CRYPTO-BÖRSE</Text>
          <Text style={tagline}>Die führende Handelsplattform der DACH-Region</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Willkommen bei {siteName}</Heading>
          <Text style={text}>
            Vielen Dank für Ihre Registrierung bei{' '}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            .
          </Text>
          <Text style={text}>
            Bitte bestätigen Sie Ihre E-Mail-Adresse (
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>
            ), indem Sie auf die Schaltfläche unten klicken:
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={button} href={confirmationUrl}>
              E-Mail bestätigen
            </Button>
          </Section>
          <Text style={footer}>
            Falls Sie kein Konto erstellt haben, können Sie diese E-Mail ignorieren.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '24px 0' }
const brand = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#1e40af',
  letterSpacing: '2px',
  margin: '0 0 4px',
}
const tagline = { fontSize: '12px', color: '#0a0f1a', margin: '0', letterSpacing: '0.5px' }
const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderTop: '3px solid #1e40af',
  borderRadius: '8px',
  padding: '32px 28px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0a0f1a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const link = { color: '#0a0f1a', textDecoration: 'underline' }
const button = {
  backgroundColor: '#1e40af',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '6px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#6b7280', margin: '24px 0 0', lineHeight: '1.5' }
