/**
 * Money arrives from the API as decimal strings ("1234.50"). The frontend only parses
 * user input and formats for display; stored totals come from the server. The only
 * client-side arithmetic is live form previews, done in exact integer agorot (BigInt).
 */

const MAX_INTEGER_DIGITS = 10

function currencyFormatter(fractionDigits: 0 | 2, signed: boolean) {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay: signed ? 'exceptZero' : 'auto',
  })
}

const formatters = {
  whole: currencyFormatter(0, false),
  exact: currencyFormatter(2, false),
  signedWhole: currencyFormatter(0, true),
  signedExact: currencyFormatter(2, true),
}

// Intl formats decimal strings exactly (no float rounding); the cast only satisfies
// type definitions that still declare `number`.
type DecimalString = string & number

/**
 * Formats an API amount for display: "80.00" → "‏80 ₪", "1234.5" → "‏1,234.50 ₪".
 * `signed` always shows the sign ("+80 ₪"), for income/expense amounts in lists.
 */
export function formatMoney(amount: string, { signed = false } = {}): string {
  const fraction = amount.split('.')[1] ?? ''
  const whole = /^0*$/.test(fraction)
  const formatter = signed
    ? whole
      ? formatters.signedWhole
      : formatters.signedExact
    : whole
      ? formatters.whole
      : formatters.exact
  // A real minus sign (U+2212): clearer than a hyphen, and it does not flip in RTL text.
  return formatter
    .format((whole ? amount.split('.')[0] : amount) as DecimalString)
    .replace('-', '\u2212')
}

/** Whether an API amount is below zero, e.g. to show it in red. */
export function isNegative(amount: string): boolean {
  return amount.startsWith('-')
}

/** An income (+) or expense (−) amount with its sign. */
export function formatFlow(amount: string, kind: 'income' | 'expense'): string {
  return formatMoney(kind === 'expense' ? `-${amount}` : amount, { signed: true })
}

/**
 * Turns what the user typed into an API amount string, or null if it is not a valid
 * positive amount with at most two decimals. Accepts thousands separators and spaces.
 */
export function parseAmountInput(input: string): string | null {
  const cleaned = input.replace(/[\s,₪]/g, '')
  const match = cleaned.match(/^(\d+)(?:\.(\d{0,2}))?$/)
  if (!match) return null
  const integer = match[1].replace(/^0+(?=\d)/, '')
  if (integer.length > MAX_INTEGER_DIGITS) return null
  const fraction = (match[2] ?? '').padEnd(2, '0')
  if (/^0+$/.test(integer) && /^0+$/.test(fraction)) return null
  return `${integer}.${fraction}`
}

/** API amount → editable text without trailing zeros, e.g. "120.50" → "120.5", "80.00" → "80". */
export function amountToInput(amount: string): string {
  return amount.replace(/\.?0+$/, '')
}

function toAgorot(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2))
}

function fromAgorot(agorot: bigint): string {
  const sign = agorot < 0n ? '-' : ''
  const absolute = agorot < 0n ? -agorot : agorot
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}

/** Exact sum of API amounts, for live form previews: ["10.50", "0.75"] → "11.25". */
export function sumAmounts(amounts: string[]): string {
  return fromAgorot(amounts.reduce((total, amount) => total + toAgorot(amount), 0n))
}

/** Exact `a − b` of API amounts, for live form previews; may be negative ("-0.01"). */
export function subtractAmounts(a: string, b: string): string {
  return fromAgorot(toAgorot(a) - toAgorot(b))
}

/**
 * Preview of an installment split, in exact integer agorot (the same rule as the
 * server: equal payments, leftover agorot on the first). The server's split is the
 * one that is stored.
 */
export function previewInstallments(
  total: string,
  count: number,
): { first: string; rest: string } | null {
  if (!Number.isInteger(count) || count < 2) return null
  const agorot = toAgorot(total)
  const base = agorot / BigInt(count)
  if (base === 0n) return null
  const remainder = agorot - base * BigInt(count)
  return { first: fromAgorot(base + remainder), rest: fromAgorot(base) }
}
