/**
 * Money arrives from the API as decimal strings ("1234.50"). The frontend only parses
 * user input and formats for display; all arithmetic happens on the server.
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
  return formatter.format((whole ? amount.split('.')[0] : amount) as DecimalString)
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
