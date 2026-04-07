import { supabase } from './supabase'

export const anonymousService = {
  // Gerar ou obter ID único do usuário anônimo
  getAnonymousId() {
    let anonymousId = localStorage.getItem('pokemon_team_anonymous_id')
    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('pokemon_team_anonymous_id', anonymousId)
    }
    return anonymousId
  },

  // Verificar se está usando conta anônima
  isAnonymous() {
    return !supabase.auth.getUser()
  }
}