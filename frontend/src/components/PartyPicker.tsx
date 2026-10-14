import { Segmented } from '@/components/Segmented'
import type { Member } from '@/household/api'

const JOINT = 'joint'

type PartyPickerProps = {
  label: string
  members: Member[]
  /** A member's user id, or null for the joint account. */
  value: string | null
  onChange: (value: string | null) => void
}

export function PartyPicker({ label, members, value, onChange }: PartyPickerProps) {
  const options = [
    ...members.map((member) => ({ value: member.user_id, label: member.display_name })),
    { value: JOINT, label: 'משותף' },
  ]
  return (
    <Segmented
      label={label}
      showLabel
      options={options}
      value={value ?? JOINT}
      onChange={(next) => onChange(next === JOINT ? null : next)}
    />
  )
}
