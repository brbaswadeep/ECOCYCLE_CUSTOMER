import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
    const { currentUser, loading } = useAuth(); // Assuming useAuth exposes loading state, which I added in AuthContext

    // Note: logic in AuthContext wrapper prevents children from rendering until not loading.
    // But strictly speaking, we might need a loading check here if AuthProvider doesn't block.
    // My AuthProvider implementation DOES block rendering children until loading is false. 
    // So currentUser checks are safe.

    if (!currentUser) {
        return <Navigate to="/auth" />;
    }

    return children;
}
