import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/supabase'

export function signOut() {
  // Drop cached data so the next user on this device never sees it.
  queryClient.clear()
  void supabase.auth.signOut()
}
