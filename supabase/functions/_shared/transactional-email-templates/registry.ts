/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as meetingInvitation } from './meeting-invitation.tsx'
import { template as noAnswerFollowup } from './no-answer-followup.tsx'
import { template as depositApproved } from './deposit-approved.tsx'
import { template as customMessage } from './custom-message.tsx'
import { template as copyTradingBugNotice } from './copy-trading-bug-notice.tsx'
import { template as leverage100Notice } from './leverage-100-notice.tsx'
import { template as p2pLink } from './p2p-link.tsx'
import { template as appointmentRequestReceived } from './appointment-request-received.tsx'
import { template as appointmentReminder } from './appointment-reminder.tsx'
import { template as accountUpdate24h } from './account-update-24h.tsx'
import { template as accountUpdateWeekly } from './account-update-weekly.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'meeting-invitation': meetingInvitation,
  'no-answer-followup': noAnswerFollowup,
  'deposit-approved': depositApproved,
  'custom-message': customMessage,
  'copy-trading-bug-notice': copyTradingBugNotice,
  'leverage-100-notice': leverage100Notice,
  'p2p-link': p2pLink,
  'appointment-request-received': appointmentRequestReceived,
  'appointment-reminder': appointmentReminder,
  'account-update-24h': accountUpdate24h,
  'account-update-weekly': accountUpdateWeekly,
}
