import { supabase } from '@/supabase'

export function signOut() {
  void supabase.auth.signOut()
}
