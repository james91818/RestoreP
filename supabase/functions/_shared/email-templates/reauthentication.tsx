/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Ihr Bestätigungscode</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>CRYPTO-BÖRSE</Text>
          <Text style={tagline}>Die führende Handelsplattform der DACH-Region</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Identität bestätigen</Heading>
          <Text style={text}>
            Verwenden Sie den folgenden Code, um Ihre Identität zu bestätigen:
          </Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            Dieser Code läuft in Kürze ab. Falls Sie dies nicht angefordert haben,
            können Sie diese E-Mail ignorieren.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
  textAlign: 'center' as const,
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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#1e40af',
  letterSpacing: '6px',
  backgroundColor: '#0a0f1a',
  padding: '20px',
  borderRadius: '6px',
  margin: '0 0 24px',
}
const footer = { fontSize: '12px', color: '#6b7280', margin: '24px 0 0', lineHeight: '1.5' }
