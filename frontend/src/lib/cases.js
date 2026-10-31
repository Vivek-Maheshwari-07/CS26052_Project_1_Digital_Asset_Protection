// Case statuses, in the order a case usually moves through them.
export const CASE_STATUS = {
  open: { label: 'Open', tone: 'warn' },
  notice_sent: { label: 'Notice sent', tone: 'brand' },
  removed: { label: 'Removed', tone: 'ok' },
  licensed: { label: 'Licensed', tone: 'ok' },
  ignored: { label: 'No response', tone: 'bad' },
  closed: { label: 'Closed', tone: 'muted' },
};

export const statusMeta = (s) => CASE_STATUS[s] || CASE_STATUS.open;

export const NOTICE_TYPES = [
  ['dmca', 'Takedown (DMCA)', 'For Instagram, YouTube, X, Pinterest, Etsy, Amazon and most US-based sites.'],
  ['india', 'Complaint (IT Rules, India)', "To a platform's Grievance Officer under India's IT Rules, 2021."],
  ['license', 'Licence offer', 'Ask the user to pay for a licence instead of taking it down.'],
];

/** True when a follow-up date has arrived for a case that is still waiting on someone. */
export const followUpDue = (c) =>
  Boolean(c.follow_up_on) && ['open', 'notice_sent'].includes(c.status) && new Date(c.follow_up_on) <= new Date();
