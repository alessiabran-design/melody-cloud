import { t, LOCALES } from './i18n.js';
import { state } from './state.js';

// A one-off, non-fiscal courtesy receipt for a single completed wallet
// transaction. Delivered as a formatted plain-text file (not a binary PDF):
// this app has no build step / Node available to bundle a PDF library, and
// no real payment processor is wired in, so the document is honest about
// being a Melody Cloud courtesy receipt rather than claiming a specific
// external processor it doesn't actually use.
function receiptNumber(tx) {
  return 'MC-' + tx.id.replace(/^txn/, '').slice(-8).toUpperCase();
}

function receiptDescription(tx) {
  if (tx.type === 'subscription') return `${t('receipt_service_label')} – ${tx.description || tx.title}`;
  if (tx.type === 'boost') return tx.description || tx.title;
  if (tx.type === 'message_unlock') return tx.description || tx.title;
  return `${t('receipt_booking_label')} – ${tx.description || tx.title}`;
}

export function downloadReceipt(tx) {
  if (!tx) return;
  const locale = LOCALES[state.lang] || 'it-IT';
  const dateStr = new Date(tx.date).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const num = receiptNumber(tx);
  const rule = '─'.repeat(42);

  const lines = [
    'MELODY CLOUD',
    rule,
    t('receipt_doc_title'),
    rule,
    '',
    `${t('receipt_number_label')}:  ${num}`,
    `${t('receipt_date_label')}:  ${dateStr}`,
    `${t('receipt_desc_label')}:  ${receiptDescription(tx)}`,
    `${t('receipt_method_label')}:  ${tx.method}`,
    `${t('receipt_amount_label')}:  €${tx.amount.toFixed(2)}`,
    '',
    rule,
    t('receipt_payment_note'),
    '',
    t('receipt_non_fiscal_note'),
    '',
    t('receipt_footer_thanks'),
    '',
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ricevuta-${num}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
