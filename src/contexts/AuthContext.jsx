import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ALLOWED_DOMAINS = ['kiboventures.com', 'nzalpha.com']

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = not signed in
  const [authError, setAuthError] = useState(null) // 'domain' | 'signin' | null

  function validateAndSet(session) {
    if (!session?.user) {
      setUser(null)
      return
    }
    const domain = session.user.email.split('@')[1]
    if (ALLOWED_DOMAINS.includes(domain)) {
      setUser(session.user)
      setAuthError(null)
    } else {
      supabase.auth.signOut()
      setUser(null)
      setAuthError('domain')
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      validateAndSet(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      validateAndSet(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setAuthError('signin')
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, authError, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
