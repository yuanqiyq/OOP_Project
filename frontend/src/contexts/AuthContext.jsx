import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { userAPI, adminAPI } from "../lib/api";

const AuthContext = createContext({});

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
};

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [userProfile, setUserProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const ignoreAuthChangesRef = useRef(false);
	const originalSessionRef = useRef(null);

	useEffect(() => {
		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			setUser(session?.user ?? null);
			originalSessionRef.current = session;
			if (session?.user) {
				fetchUserProfile(session.user.id, session.user.email);
			} else {
				setLoading(false);
			}
		});

		// Listen for auth changes
		let isRestoringSession = false;
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			// If we're ignoring auth changes (during user creation), restore original session
			if (
				ignoreAuthChangesRef.current &&
				originalSessionRef.current &&
				!isRestoringSession
			) {
				isRestoringSession = true;
				try {
					// Restore the original session
					await supabase.auth.setSession({
						access_token: originalSessionRef.current.access_token,
						refresh_token: originalSessionRef.current.refresh_token,
					});
				} finally {
					// Reset flag after a short delay to prevent immediate re-trigger
					setTimeout(() => {
						isRestoringSession = false;
					}, 1000);
				}
				return;
			}

			// Only process auth changes if we're not restoring
			if (!isRestoringSession) {
				setUser(session?.user ?? null);
				if (session?.user) {
					await fetchUserProfile(session.user.id, session.user.email);
				} else {
					setUserProfile(null);
					setLoading(false);
				}
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	const fetchUserProfile = async (authUuid, email = null) => {
		try {
			setLoading(true);

			// Get email if not provided
			let userEmail = email;
			if (!userEmail) {
				const {
					data: { user: currentUser },
				} = await supabase.auth.getUser();
				userEmail = currentUser?.email;
			}

			// First, try to get staff by email (staff are in a separate table)
			if (userEmail) {
				try {
					const staff = await adminAPI.getStaffByEmail(userEmail);
					if (staff) {
						// Staff extends User, so all User fields (fname, lname, email, userId, authUuid, role) are directly on staff
						// Also include staff-specific fields
						const profile = {
							userId: staff.userId || staff.staffId,
							staffId: staff.staffId,
							clinicId: staff.clinic?.id || staff.clinicId,
							authUuid: staff.authUuid,
							email: staff.email,
							fname: staff.fname,
							lname: staff.lname,
							role: staff.role || "STAFF",
						};
						setUserProfile(profile);
						setLoading(false);
						return;
					}
				} catch (staffError) {
					// Check if it's a 404 (not found) - that's expected, continue searching
					if (
						staffError.status === 404 ||
						staffError.message?.includes("404") ||
						staffError.message?.includes("Not Found")
					) {
						// Staff not found, continue to check Patient table
						console.log("Staff not found, checking Patient table");
					} else {
						console.error("Error fetching staff:", staffError);
					}
				}
			}

			// If not staff, try to get patient by email (patients are in a separate table)
			if (userEmail) {
				try {
					const patient = await adminAPI.getPatientByEmail(userEmail);
					if (patient) {
						// Patient extends User, so all User fields (fname, lname, email, userId, authUuid, role) are directly on patient
						// Also include patient-specific fields
						const profile = {
							userId: patient.userId || patient.patientId,
							patientId: patient.patientId,
							authUuid: patient.authUuid,
							email: patient.email,
							fname: patient.fname,
							lname: patient.lname,
							role: patient.role || "PATIENT",
							patientIc: patient.patientIc,
							dateOfBirth: patient.dateOfBirth,
							gender: patient.gender,
						};
						setUserProfile(profile);
						setLoading(false);
						return;
					}
				} catch (patientError) {
					// Check if it's a 404 (not found) - that's expected, continue searching
					if (
						patientError.status === 404 ||
						patientError.message?.includes("404") ||
						patientError.message?.includes("Not Found")
					) {
						// Patient not found by email, try User table
						console.log("Patient not found by email, checking User table");
					} else {
						console.error("Error fetching patient:", patientError);
					}
				}
			}

			// Fallback: try to get user from User table by authUuid
			try {
				const users = await userAPI.getAll();
				if (users && Array.isArray(users)) {
					const profile = users.find((u) => u.authUuid === authUuid);

					if (profile) {
						setUserProfile(profile);
						setLoading(false);
						return;
					}
				}
			} catch (userError) {
				console.error("Error fetching from User table:", userError);
			}

			// If user doesn't exist in any table, this is an error condition
			// Don't create a generic profile - throw an error instead
			console.error("User profile not found in any table for:", {
				authUuid,
				email: userEmail,
			});
			throw new Error("User profile not found. Please contact support.");
		} catch (error) {
			console.error("Error fetching user profile:", error);
			// Only set a minimal profile if it's a network/API error, not a "not found" error
			if (
				error.message?.includes("not found") ||
				error.message?.includes("Not Found") ||
				error.message?.includes("User profile not found")
			) {
				// User doesn't exist - this shouldn't happen for valid sign-ins
				// Sign out the user since they don't have a valid profile
				await supabase.auth.signOut();
				setUserProfile(null);
				setUser(null);
			} else {
				// For other errors (network issues, etc.), set a basic profile with at least email
				const {
					data: { user: currentUser },
				} = await supabase.auth.getUser();
				setUserProfile({
					role: "PATIENT",
					authUuid,
					email: currentUser?.email || email || "",
					fname: "",
					lname: "",
					userId: null,
				});
			}
		} finally {
			setLoading(false);
		}
	};

	const signUp = async (email, password, userData) => {
		try {
			// Step 1: Create auth account
			// Note: If email confirmation is disabled in Supabase, user will be automatically signed in
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					// Disable email confirmation redirect - we want to sign in immediately
					emailRedirectTo: undefined,
				},
			});

			if (error) throw error;

			if (data.user) {
				// Step 2: Create patient record in backend using the patient endpoint
				try {
					const { adminAPI } = await import("../lib/api");

					// Format dateOfBirth to YYYY-MM-DD if it's not already in that format
					let formattedDateOfBirth = userData.dateOfBirth;
					if (formattedDateOfBirth && formattedDateOfBirth.includes("T")) {
						formattedDateOfBirth = formattedDateOfBirth.split("T")[0];
					}

					await adminAPI.createPatient({
						authUuid: data.user.id,
						email: data.user.email,
						fname: userData.fname,
						lname: userData.lname,
						role: "PATIENT",
						patientIc: userData.patientIc,
						dateOfBirth: formattedDateOfBirth,
						gender: userData.gender,
					});
				} catch (backendError) {
					console.error("Error creating patient record:", backendError);
					// If patient creation fails, throw error so user knows signup failed
					throw new Error(
						backendError.message || "Failed to create patient account"
					);
				}

				// Step 3: If user has a session (email confirmation disabled), fetch profile and sign them in
				// Otherwise, if email confirmation is required, the session will be null
				if (data.session) {
					// User is automatically signed in (email confirmation disabled)
					setUser(data.user);
					await fetchUserProfile(data.user.id, data.user.email);
				} else {
					// Email confirmation is required - sign in the user anyway after creating the account
					// This allows immediate access if email confirmation is disabled in Supabase settings
					const { data: signInData, error: signInError } =
						await supabase.auth.signInWithPassword({
							email,
							password,
						});

					if (signInError) {
						// If sign in fails, it might be because email confirmation is required
						// In that case, we'll let the auth state change handler deal with it
						console.warn("Could not auto-sign in after signup:", signInError.message);
					} else if (signInData.user) {
						setUser(signInData.user);
						await fetchUserProfile(signInData.user.id, signInData.user.email);
					}
				}
			}

			return { data, error: null };
		} catch (error) {
			return { data: null, error };
		}
	};

	const signIn = async (email, password) => {
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) throw error;

			if (data.user) {
				await fetchUserProfile(data.user.id, data.user.email);
			}

			return { data, error: null };
		} catch (error) {
			return { data: null, error };
		}
	};

	const signOut = async () => {
		try {
			const { error } = await supabase.auth.signOut();
			if (error) throw error;
			setUser(null);
			setUserProfile(null);
			return { error: null };
		} catch (error) {
			return { error };
		}
	};

	const setIgnoreAuthChanges = (value) => {
		ignoreAuthChangesRef.current = value;
	};

	const setOriginalSession = (session) => {
		originalSessionRef.current = session;
	};

	const value = {
		user,
		userProfile,
		loading,
		signUp,
		signIn,
		signOut,
		setIgnoreAuthChanges,
		setOriginalSession,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
