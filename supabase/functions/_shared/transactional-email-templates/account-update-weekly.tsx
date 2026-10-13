/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { AccountUpdateEmail, ACCOUNT_UPDATE_PREVIEW, type AccountUpdateProps } from './account-update-report.tsx'
import type { TemplateEntry } from './registry.ts'

const Email = (props: AccountUpdateProps) => (
  <AccountUpdateEmail {...props} periodLabel={props.periodLabel || 'der letzten 7 Tage'} />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d?.subjectOverride || 'Ihr Wochen-Update — Crypto-Börse',
  displayName: 'Weekly Account Update',
  previewData: { ...ACCOUNT_UPDATE_PREVIEW, periodLabel: 'der letzten 7 Tage' },
} satisfies TemplateEntry
