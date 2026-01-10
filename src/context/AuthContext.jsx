import { createContext, useContext, useEffect, useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, getFirestore } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    async function signup(email, password, name = '', phone = '') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create Customer Document
        await setDoc(doc(db, "customers", user.uid), {
            email,
            role: 'customer',
            createdAt: new Date().toISOString(),
            name: name || '',
            phone: phone || ''
        });

        return user;
    }

    async function login(email, password, remember = false) {
        // Set persistence based on "Remember Me"
        await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check verification: Must be a customer
        const docRef = doc(db, "customers", user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            // User exists in Auth (maybe a Vendor), but not as a Customer
            await signOut(auth);
            throw new Error("Access Denied: Not a registered customer account.");
        }

        return user;
    }

    function logout() {
        return signOut(auth);
    }

    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    async function googleSignIn() {
        // Default to local persistence for Google Sign-In, or we could make it configurable. 
        // Usually Social Logins implicate a desire to be remembered, but let's explicit set it to LOCAL for now to be safe.
        await setPersistence(auth, browserLocalPersistence);

        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // For Google Auth, we might need to create the doc if it doesn't exist
        const docRef = doc(db, "customers", user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            // Check if they are a vendor trying to log in? 
            // Or just create a new customer record? 
            // For now, let's assume new Google sign-ins are customers.
            await setDoc(docRef, {
                email: user.email,
                role: 'customer',
                createdAt: new Date().toISOString(),
                name: user.displayName || '',
                phone: ''
            });
        } else {
            // If document exists, ensure it is a customer
            if (docSnap.data().role !== 'customer') {
                await signOut(auth);
                throw new Error("Access Denied: Not a registered customer account.");
            }
        }

        return result;
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Verify role on reload and get full data
                const docRef = doc(db, "customers", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists() && docSnap.data().role === 'customer') {
                    // Spread doc data into user object so we have access to 'location' etc. directly
                    setCurrentUser({ ...user, ...docSnap.data() });
                } else {
                    // Not a customer (or doc missing)
                    await signOut(auth);
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Function to reload user data (useful after profile update)
    const refreshProfile = async () => {
        if (auth.currentUser) {
            const docRef = doc(db, "customers", auth.currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setCurrentUser({ ...auth.currentUser, ...docSnap.data() });
            }
        }
    };

    const value = {
        currentUser,
        signup,
        login,
        logout,
        googleSignIn,
        resetPassword,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
