import { supabase } from './supabase'

function normalizeEmail(value) {
  return value?.trim().toLowerCase()
}

function mapAuthErrorMessage(error, fallback = 'Nao foi possivel autenticar. Tente novamente.') {
  const message = error?.message?.toLowerCase?.() || ''

  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return 'Senha invalida.'
  }

  if (message.includes('email not confirmed')) {
    return 'Confirme seu email antes de entrar.'
  }

  return fallback
}

function isInvalidJwtUserError(error) {
  const message = error?.message?.toLowerCase?.() || ''
  return message.includes('user from sub claim in jwt does not exist')
}

export const authService = {
  // Sign up
  async signUp(email, password) {
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail) {
      throw new Error('Email invalido.')
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password
    })

    if (error) throw error

    return data
  },

  // Sign in
  async signIn(email, password) {
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail) {
      throw new Error('Informe seu email.')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    })

    if (error) {
      throw new Error(mapAuthErrorMessage(error))
    }

    return data
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get current user
  async getCurrentUser() {
    const response = await supabase.auth.getUser()
    const { error } = response

    if (isInvalidJwtUserError(error)) {
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        // Ignore cleanup failures; caller will treat as no session.
      }

      return {
        data: { user: null },
        error: null
      }
    }

    return response
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
