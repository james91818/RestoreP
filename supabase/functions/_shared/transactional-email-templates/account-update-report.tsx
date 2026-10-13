/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Column, Container, Head, Heading, Html, Img, Link, Preview, Row, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'

const SITE_NAME = 'Crypto-Börse'
const DASHBOARD_URL = 'https://crypto-borse.com/dashboard'
const SUPPORT_EMAIL = 'support@crypto-borse.com'
const LOGO_URL = 'https://crypto-borse.com/__l5e/assets-v1/787eb6c9-7dfb-4fbc-86c5-c87ff3b1b884/crypto-boerse-logo-white.png'

export interface AccountUpdateTrade {
  symbol?: string
  direction?: string
  pnl?: number
  closedAt?: string
}

export interface AccountUpdateProps {
  clientName?: string
  agentName?: string
  agentEmail?: string
  periodLabel?: string
  periodRange?: string
  realizedPnl?: number
  unrealizedPnl?: number
  totalPnl?: number
  closedCount?: number
  wins?: number
  losses?: number
  winRate?: number
  openCount?: number
  bestSymbol?: string
  bestPnl?: number
  portfolioValue?: number
  trades?: AccountUpdateTrade[]
}

const eur = (n: number) =>
  `${n < 0 ? '−' : ''}€${Math.abs(Number(n || 0)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const signed = (n: number) => `${Number(n || 0) > 0 ? '+' : ''}${eur(n)}`

export const AccountUpdateEmail = ({
  clientName,
  agentName,
  agentEmail,
  periodLabel = 'der letzten 24 Stunden',
  periodRange,
  realizedPnl = 0,
  unrealizedPnl = 0,
  totalPnl,
  closedCount = 0,
  wins = 0,
  losses = 0,
  winRate = 0,
  openCount = 0,
  bestSymbol,
  bestPnl = 0,
  portfolioValue = 0,
  trades = [],
}: AccountUpdateProps) => {
  const total = typeof totalPnl === 'number' ? totalPnl : Number(realizedPnl) + Number(unrealizedPnl)
  const positive = total >= 0
  const hasActivity = closedCount > 0 || openCount > 0
  const accentColor = positive ? '#047857' : '#b91c1c'

  return (
    <Html lang="de" dir="ltr">
      <Head />
      <Preview>
        {hasActivity
          ? `Ihr Konto-Update: ${signed(total)} in ${periodLabel}`
          : `Ihr Konto-Update für ${periodLabel}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerBand}>
            <Img src={LOGO_URL} alt={SITE_NAME} width="180" height="auto" style={{ display: 'block' }} />
          </Section>
          <Section style={accent} />

          <Section style={content}>
            <Text style={eyebrow}>Konto-Update · {periodLabel}</Text>
            <Heading style={h1}>Ihre Performance im Überblick</Heading>
            <Text style={greeting}>
              {clientName ? `Sehr geehrte/r ${clientName},` : 'Sehr geehrte Damen und Herren,'}
            </Text>

            {hasActivity ? (
              <>
                <Text style={text}>
                  nachfolgend erhalten Sie die Zusammenfassung Ihrer Handelsaktivität in{' '}
                  <strong>{periodLabel}</strong>
                  {periodRange ? ` (${periodRange})` : ''}. Alle Werte wurden automatisiert aus Ihrem
                  Handelskonto ermittelt.
                </Text>

                <Section style={{ ...heroCard, borderLeft: `4px solid ${accentColor}` }}>
                  <Text style={heroLabel}>Gesamtergebnis {periodLabel}</Text>
                  <Text style={{ ...heroValue, color: accentColor }}>{signed(total)}</Text>
                  <Text style={heroSub}>
                    Realisiert {signed(realizedPnl)} &nbsp;·&nbsp; Laufende Positionen {signed(unrealizedPnl)}
                  </Text>
                </Section>

                <Section style={metricsWrap}>
                  <Row>
                    <Column style={metricCell}>
                      <Text style={metricLabel}>Geschlossene Trades</Text>
                      <Text style={metricValue}>{closedCount}</Text>
                    </Column>
                    <Column style={metricCell}>
                      <Text style={metricLabel}>Trefferquote</Text>
                      <Text style={metricValue}>
                        {Number(winRate || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 })}%
                      </Text>
                    </Column>
                  </Row>
                  <Row>
                    <Column style={metricCell}>
                      <Text style={metricLabel}>Gewinn / Verlust</Text>
                      <Text style={metricValue}>{wins} / {losses}</Text>
                    </Column>
                    <Column style={metricCell}>
                      <Text style={metricLabel}>Offene Positionen</Text>
                      <Text style={metricValue}>{openCount}</Text>
                    </Column>
                  </Row>
                  <Row>
                    <Column style={metricCell}>
                      <Text style={metricLabel}>Portfoliowert</Text>
                      <Text style={metricValue}>{eur(portfolioValue)}</Text>
                    </Column>
                    <Column style={metricCell}>
                      <Text style={metricLabel}>Beste Position</Text>
                      <Text style={metricValue}>
                        {bestSymbol ? `${bestSymbol} ${signed(bestPnl)}` : '—'}
                      </Text>
                    </Column>
                  </Row>
                </Section>

                {trades.length > 0 && (
                  <Section style={tableCard}>
                    <Text style={tableTitle}>Abgeschlossene Positionen</Text>
                    <Hr style={tableDivider} />
                    {trades.slice(0, 10).map((t, i) => (
                      <Row key={`${t.symbol}-${i}`} style={{ margin: '0 0 6px' }}>
                        <Column style={{ width: '55%' }}>
                          <Text style={tradeSymbol}>
                            {t.symbol || '—'}
                            <span style={tradeDir}>
                              {t.direction === 'sell' ? ' Short' : ' Long'}
                            </span>
                          </Text>
                        </Column>
                        <Column style={{ width: '45%', textAlign: 'right' as const }}>
                          <Text
                            style={{
                              ...tradePnl,
                              color: Number(t.pnl || 0) >= 0 ? '#047857' : '#b91c1c',
                            }}
                          >
                            {signed(Number(t.pnl || 0))}
                          </Text>
                        </Column>
                      </Row>
                    ))}
                  </Section>
                )}
              </>
            ) : (
              <>
                <Text style={text}>
                  in <strong>{periodLabel}</strong> wurden auf Ihrem Handelskonto keine Positionen
                  eröffnet oder geschlossen. Ihr aktueller Portfoliowert beträgt{' '}
                  <strong>{eur(portfolioValue)}</strong>.
                </Text>
                <Section style={{ ...heroCard, borderLeft: '4px solid #1e40af' }}>
                  <Text style={heroLabel}>Keine Handelsaktivität</Text>
                  <Text style={{ ...heroValue, color: '#0a1628', fontSize: '26px' }}>
                    {eur(portfolioValue)}
                  </Text>
                  <Text style={heroSub}>Aktueller Portfoliowert</Text>
                </Section>
                <Text style={text}>
                  Unsere Analysten identifizieren derzeit mehrere aussichtsreiche Marktchancen.
                  Gerne bespricht Ihr persönlicher Berater mit Ihnen, wie Sie Ihr Kapital in den
                  kommenden Tagen strategisch positionieren können.
                </Text>
              </>
            )}

            <Section style={{ textAlign: 'center' as const, margin: '28px 0 8px' }}>
              <Button style={cta} href={DASHBOARD_URL}>Portfolio ansehen</Button>
            </Section>
            <Text style={fallback}>
              Direktlink: <Link href={DASHBOARD_URL} style={linkStyle}>{DASHBOARD_URL}</Link>
            </Text>

            <Hr style={{ borderTop: '1px solid #e5e7eb', margin: '28px 0 20px' }} />

            <Text style={text}>
              Für eine persönliche Einschätzung Ihrer Strategie erreichen Sie uns per E-Mail an{' '}
              <Link href={`mailto:${agentEmail || SUPPORT_EMAIL}`} style={linkStyle}>
                {agentEmail || SUPPORT_EMAIL}
              </Link>{' '}
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
              Diese Übersicht dient ausschließlich Informationszwecken und stellt keine Anlageberatung dar.
              Handel mit Finanzinstrumenten ist mit Risiko verbunden.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────
const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif", padding: '20px 0' }
const container = { maxWidth: '600px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden' as const, boxShadow: '0 4px 24px rgba(15,23,42,0.08)' }
const headerBand = { backgroundColor: '#0a1628', padding: '28px 32px' }
const accent = { height: '3px', background: 'linear-gradient(90deg, #1e40af, #3b82f6, #1e40af)', fontSize: '0', lineHeight: '0' }
const content = { backgroundColor: '#ffffff', padding: '36px 32px 28px' }
const eyebrow = { fontSize: '11px', fontWeight: '700' as const, color: '#1e40af', textTransform: 'uppercase' as const, letterSpacing: '1.4px', margin: '0 0 8px' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#0a1628', margin: '0 0 18px', letterSpacing: '-0.3px' }
const greeting = { fontSize: '15px', color: '#0a1628', lineHeight: '1.6', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.75', margin: '0 0 16px' }
const heroCard = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px 24px', margin: '20px 0 8px' }
const heroLabel = { fontSize: '11px', fontWeight: '700' as const, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '1.2px', margin: '0 0 6px' }
const heroValue = { fontSize: '32px', fontWeight: '700' as const, margin: '0 0 6px', letterSpacing: '-0.5px' }
const heroSub = { fontSize: '12px', color: '#6b7280', margin: '0' }
const metricsWrap = { margin: '18px 0 4px' }
const metricCell = { width: '50%', padding: '8px 10px', verticalAlign: 'top' as const }
const metricLabel = { fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.8px', margin: '0 0 2px' }
const metricValue = { fontSize: '17px', fontWeight: '700' as const, color: '#0a1628', margin: '0' }
const tableCard = { backgroundColor: '#f1f5ff', border: '1px solid #dbe4ff', borderRadius: '10px', padding: '18px 22px', margin: '20px 0 4px' }
const tableTitle = { fontSize: '12px', fontWeight: '700' as const, color: '#1e40af', textTransform: 'uppercase' as const, letterSpacing: '1.2px', margin: '0' }
const tableDivider = { borderTop: '1px solid #dbe4ff', margin: '10px 0 14px' }
const tradeSymbol = { fontSize: '14px', fontWeight: '600' as const, color: '#0a1628', margin: '0' }
const tradeDir = { fontSize: '12px', color: '#6b7280', fontWeight: '400' as const }
const tradePnl = { fontSize: '14px', fontWeight: '700' as const, margin: '0' }
const cta = { backgroundColor: '#1e40af', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: '700' as const, textDecoration: 'none', display: 'inline-block', letterSpacing: '0.3px' }
const fallback = { fontSize: '12px', color: '#6b7280', lineHeight: '1.6', margin: '4px 0 0', textAlign: 'center' as const }
const linkStyle = { color: '#1e40af', textDecoration: 'underline' }
const closing = { fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: '0 0 4px' }
const signatureName = { fontSize: '15px', fontWeight: '700' as const, color: '#0a1628', margin: '0' }
const signatureCompany = { fontSize: '12px', color: '#1e40af', fontWeight: '500' as const, margin: '2px 0 0', letterSpacing: '0.3px' }
const footer = { backgroundColor: '#0a1628', padding: '24px 32px' }
const footerText = { fontSize: '11px', color: 'rgba(255,255,255,0.55)', margin: '0 0 4px', textAlign: 'center' as const }
const footerDisclaimer = { fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: '0', textAlign: 'center' as const, lineHeight: '1.5' }

export const ACCOUNT_UPDATE_PREVIEW = {
  clientName: 'Max Mustermann',
  agentName: 'Thomas Berger',
  agentEmail: 'support@crypto-borse.com',
  realizedPnl: 1842.55,
  unrealizedPnl: 412.2,
  closedCount: 6,
  wins: 5,
  losses: 1,
  winRate: 83.3,
  openCount: 2,
  bestSymbol: 'BTC/EUR',
  bestPnl: 980.4,
  portfolioValue: 24680.15,
  trades: [
    { symbol: 'BTC/EUR', direction: 'buy', pnl: 980.4 },
    { symbol: 'ETH/EUR', direction: 'buy', pnl: 421.1 },
    { symbol: 'SOL/EUR', direction: 'sell', pnl: 318.05 },
    { symbol: 'XRP/EUR', direction: 'buy', pnl: 210.5 },
    { symbol: 'ADA/EUR', direction: 'buy', pnl: -87.5 },
  ],
}
