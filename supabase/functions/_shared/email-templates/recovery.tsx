/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

const LOGO_URL = 'https://crypto-boerse.com/__l5e/assets-v1/a7b9e5ff-253b-4d5b-9d00-5bb3bbfc6cdb/crypto-boerse-logo-email.png'

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Passwort zurücksetzen für {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} alt="Crypto-Börse" width="180" height="auto" style={{ display: 'block', margin: '0 auto 8px' }} />
          <Text style={tagline}>Die führende Handelsplattform der DACH-Region</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Passwort zurücksetzen</Heading>
          <Text style={text}>
            Wir haben eine Anfrage erhalten, Ihr Passwort für {siteName} zurückzusetzen.
            Klicken Sie auf die Schaltfläche unten, um ein neues Passwort festzulegen.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={button} href={confirmationUrl}>
              Passwort zurücksetzen
            </Button>
          </Section>
          <Text style={footer}>
            Falls Sie keine Passwortzurücksetzung angefordert haben, können Sie diese E-Mail
            ignorieren. Ihr Passwort bleibt unverändert.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
