import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAfeZ7lh8j2vQhgzZycwXH1OIlCCLg_o2M",
    authDomain: "ecocycle-b409a.firebaseapp.com",
    projectId: "ecocycle-b409a",
    storageBucket: "ecocycle-b409a.firebasestorage.app",
    messagingSenderId: "457607732144",
    appId: "1:457607732144:web:ca198ef5bfea9142735475",
    measurementId: "G-TQ702HN3CQ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, analytics, db, auth, storage };
