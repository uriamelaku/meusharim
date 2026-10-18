import { AlertCircle, Check, Copy, Loader2, Share2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { byGender } from '@/lib/gender'
import {
  type Household,
  type InvitationCreated,
  useCreateInvitation,
  useRevokeInvitation,
} from './api'
import { describeHouseholdError } from './errors'
import { invitationLink } from './pendingInvitation'

const MAX_MEMBERS = 2
const COPIED_FEEDBACK_MS = 2000

const formatDateTime = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Jerusalem',
}).format

export function HouseholdCard({ household, userId }: { household: Household; userId: string }) {
  const isFull = household.members.length >= MAX_MEMBERS
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">{household.name}</CardTitle>
        <CardDescription>
          {isFull ? 'בית משותף לשניכם' : 'בינתיים רק החשבון שלך כאן'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ul className="flex flex-col gap-3" aria-label="מי בבית">
          {household.members.map((member) => (
            <li key={member.user_id} className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-lg font-semibold text-primary"
              >
                {member.display_name.charAt(0)}
              </span>
              <span className="font-medium">{member.display_name}</span>
              {member.user_id === userId && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                  {byGender(member.gender, { female: 'את', male: 'אתה', neutral: 'החשבון שלך' })}
                </span>
              )}
            </li>
          ))}
        </ul>
        {!isFull && <InvitePanel pendingUntil={household.pending_invitation?.expires_at} />}
      </CardContent>
    </Card>
  )
}

function InvitePanel({ pendingUntil }: { pendingUntil: string | undefined }) {
  const createInvitation = useCreateInvitation()
  const revokeInvitation = useRevokeInvitation()
  // The raw token is returned only once, right after creating the invitation.
  const [created, setCreated] = useState<InvitationCreated | null>(null)
  const error = createInvitation.error ?? revokeInvitation.error

  function create() {
    revokeInvitation.reset()
    createInvitation.mutate(undefined, { onSuccess: setCreated })
  }

  function revoke() {
    createInvitation.reset()
    revokeInvitation.mutate(undefined, { onSuccess: () => setCreated(null) })
  }

  const busy = createInvitation.isPending || revokeInvitation.isPending
  const expiresAt = created?.expires_at ?? pendingUntil

  return (
    <section aria-labelledby="invite-title" className="rounded-2xl bg-muted/60 p-4">
      <h3 id="invite-title" className="font-medium">
        הזמנת בן או בת הזוג
      </h3>

      {created ? (
        <InviteLink token={created.token} />
      ) : (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {pendingUntil
            ? 'יש הזמנה פעילה. מטעמי אבטחה הקישור מוצג רק כשיוצרים אותו – אפשר ליצור קישור חדש במקומו.'
            : 'יוצרים קישור הזמנה ושולחים אותו לבן או בת הזוג. כל אחד מתחבר עם חשבון משלו, ושניכם רואים את אותם נתונים.'}
        </p>
      )}

      {expiresAt && (
        <p className="mt-3 text-sm text-muted-foreground">
          הקישור בתוקף עד {formatDateTime(new Date(expiresAt))}, לשימוש חד-פעמי.
        </p>
      )}

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle aria-hidden />
          <AlertDescription>{describeHouseholdError(error)}</AlertDescription>
        </Alert>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!created && (
          <Button onClick={create} disabled={busy}>
            {createInvitation.isPending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <UserPlus aria-hidden />
            )}
            {pendingUntil ? 'יצירת קישור חדש' : 'יצירת קישור הזמנה'}
          </Button>
        )}
        {expiresAt && (
          <Button variant="ghost" onClick={revoke} disabled={busy}>
            ביטול ההזמנה
          </Button>
        )}
      </div>
    </section>
  )
}

function InviteLink({ token }: { token: string }) {
  const link = invitationLink(token)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const canShare = typeof navigator.share === 'function'

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopyFailed(false)
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
    } catch {
      setCopyFailed(true)
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: 'הזמנה למאושרים',
        text: 'הזמנה לנהל יחד את התקציב המשותף שלנו',
        url: link,
      })
    } catch (error) {
      // Closing the share sheet is a normal choice, not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return
      setCopyFailed(true)
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <Input
        readOnly
        dir="ltr"
        aria-label="קישור ההזמנה"
        value={link}
        onFocus={(event) => event.target.select()}
        className="text-sm"
      />
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <Button onClick={share}>
            <Share2 aria-hidden />
            שיתוף
          </Button>
        )}
        <Button variant={canShare ? 'outline' : 'default'} onClick={copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? 'הקישור הועתק' : 'העתקת הקישור'}
        </Button>
      </div>
      {copyFailed && (
        <p role="alert" className="text-sm text-destructive">
          לא הצלחנו להעתיק או לשתף. אפשר לסמן את הקישור ולהעתיק אותו ידנית.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        הקישור מוצג רק עכשיו. אם הוא הולך לאיבוד, פשוט יוצרים קישור חדש.
      </p>
    </div>
  )
}
