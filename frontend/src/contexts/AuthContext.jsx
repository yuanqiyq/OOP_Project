import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { userAPI } from '../lib/api'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const ignoreAuthChangesRef = useRef(false)
  const originalSessionRef = useRef(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      originalSessionRef.current = session
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    let isRestoringSession = false
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // If we're ignoring auth changes (during user creation), restore original session
      if (ignoreAuthChangesRef.current && originalSessionRef.current && !isRestoringSession) {
        isRestoringSession = true
        try {
          // Restore the original session
          await supabase.auth.setSession({
            access_token: originalSessionRef.current.access_token,
            refresh_token: originalSessionRef.current.refresh_token,
          })
        } finally {
          // Reset flag after a short delay to prevent immediate re-trigger
          setTimeout(() => {
            isRestoringSession = false
          }, 1000)
        }
        return
      }

      // Only process auth changes if we're not restoring
      if (!isRestoringSession) {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setUserProfile(null)
          setLoading(false)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (authUuid) => {
    try {
      // Try to get user by auth UUID from backend
      const users = await userAPI.getAll()
      const profile = users.find(u => u.authUuid === authUuid)
      
      if (profile) {
        setUserProfile(profile)
      } else {
        // If user doesn't exist in backend yet, create a basic profile
        setUserProfile({ role: 'PATIENT', authUuid })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password, userData) => {
    try {
      // Step 1: Create auth account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Step 2: Create patient record in backend using the patient endpoint
        try {
          const { adminAPI } = await import('../lib/api')
          
          // Format dateOfBirth to YYYY-MM-DD if it's not already in that format
          let formattedDateOfBirth = userData.dateOfBirth
          if (formattedDateOfBirth && formattedDateOfBirth.includes('T')) {
            formattedDateOfBirth = formattedDateOfBirth.split('T')[0]
          }
          
          await adminAPI.createPatient({
            authUuid: data.user.id,
            email: data.user.email,
            fname: userData.fname,
            lname: userData.lname,
            role: 'PATIENT',
            patientIc: userData.patientIc,
            dateOfBirth: formattedDateOfBirth,
            gender: userData.gender,
          })
        } catch (backendError) {
          console.error('Error creating patient record:', backendError)
          // If patient creation fails, throw error so user knows signup failed
          throw new Error(backendError.message || 'Failed to create patient account')
        }
        
        await fetchUserProfile(data.user.id)
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        await fetchUserProfile(data.user.id)
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setUserProfile(null)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const setIgnoreAuthChanges = (value) => {
    ignoreAuthChangesRef.current = value
  }

  const setOriginalSession = (session) => {
    originalSessionRef.current = session
  }

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    setIgnoreAuthChanges,
    setOriginalSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

