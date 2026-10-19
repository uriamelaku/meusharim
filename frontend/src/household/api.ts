import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/auth/useAuth'
import { apiRequest } from '@/lib/api'
import type { Language } from '@/lib/i18n'

export type Gender = 'female' | 'male'

export type Member = {
  user_id: string
  display_name: string
  /** How the app addresses this member; null until they chose. */
  gender: Gender | null
  joined_at: string
}

export type Household = {
  id: string
  name: string
  members: Member[]
  pending_invitation: { expires_at: string } | null
}

type MyHousehold = { household: Household | null }

export type InvitationCreated = { token: string; expires_at: string }

export type InvitationPreview = { household_name: string; inviter_name: string | null }

function useHouseholdKey() {
  const session = useSession()
  return { session, queryKey: ['household', session.user.id] }
}

export function useHousehold() {
  const { session, queryKey } = useHouseholdKey()
  return useQuery({
    queryKey,
    queryFn: async () =>
      (await apiRequest<MyHousehold>('/api/household', session.access_token)).household,
  })
}

/** Mutations that return the updated household write it straight into the cache. */
function useHouseholdMutation<TVariables>(
  request: (accessToken: string, variables: TVariables) => Promise<MyHousehold>,
) {
  const queryClient = useQueryClient()
  const { session, queryKey } = useHouseholdKey()
  return useMutation({
    mutationFn: (variables: TVariables) => request(session.access_token, variables),
    onSuccess: (result) => queryClient.setQueryData(queryKey, result.household),
  })
}

export function useCreateHousehold() {
  return useHouseholdMutation(
    (
      token,
      body: { name: string; display_name: string; gender?: Gender; language: Language },
    ) =>
      apiRequest<MyHousehold>('/api/household', token, { method: 'POST', body }),
  )
}

export function useAcceptInvitation() {
  return useHouseholdMutation(
    (token, body: { token: string; display_name: string; gender?: Gender }) =>
      apiRequest<MyHousehold>('/api/invitations/accept', token, { method: 'POST', body }),
  )
}

export function useUpdateMyGender() {
  return useHouseholdMutation((token, gender: Gender) =>
    apiRequest<MyHousehold>('/api/household/me', token, { method: 'PATCH', body: { gender } }),
  )
}

/** Creating or revoking an invitation changes `pending_invitation`, so refetch the household. */
function useInvitationMutation<TResult>(path: string, method: 'POST' | 'DELETE') {
  const queryClient = useQueryClient()
  const { session, queryKey } = useHouseholdKey()
  return useMutation({
    mutationFn: () => apiRequest<TResult>(path, session.access_token, { method }),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}

export function useCreateInvitation() {
  return useInvitationMutation<InvitationCreated>('/api/household/invitation', 'POST')
}

export function useRevokeInvitation() {
  return useInvitationMutation<void>('/api/household/invitation', 'DELETE')
}

export function useInvitationPreview(token: string) {
  const session = useSession()
  return useQuery({
    queryKey: ['invitation-preview', session.user.id, token],
    queryFn: () =>
      apiRequest<InvitationPreview>('/api/invitations/preview', session.access_token, {
        method: 'POST',
        body: { token },
      }),
    retry: false,
    staleTime: Infinity,
  })
}
