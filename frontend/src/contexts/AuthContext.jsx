import { createContext, useContext, useEffect, useState } from 'react'
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        setUserProfile(null)
        setLoading(false)
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Create user in backend
        try {
          // If patient, create Patient record directly (Patient extends User)
          if (userData.role === 'PATIENT' || !userData.role) {
            try {
              const { adminAPI } = await import('../lib/api')
              await adminAPI.createPatient({
                authUuid: data.user.id,
                email: data.user.email,
                fname: userData.fname,
                lname: userData.lname,
                role: 'PATIENT',
                // Patient-specific fields (can be added later via update)
                patientIc: null,
                dateOfBirth: null,
                gender: null,
              })
            } catch (patientError) {
              console.error('Error creating patient record:', patientError)
              // Fallback: create user record if patient creation fails
              await userAPI.create({
                authUuid: data.user.id,
                email: data.user.email,
                fname: userData.fname,
                lname: userData.lname,
                role: 'PATIENT',
              })
            }
          } else {
            // For non-patient users, create User record
            await userAPI.create({
              authUuid: data.user.id,
              email: data.user.email,
              fname: userData.fname,
              lname: userData.lname,
              role: userData.role || 'PATIENT',
            })
          }
        } catch (backendError) {
          console.error('Error creating user in backend:', backendError)
          // If backend creation fails, we still have the auth user
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

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

