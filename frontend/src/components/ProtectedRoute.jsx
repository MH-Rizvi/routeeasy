import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function ProtectedRoute() {
    const { isAuthenticated, isHydrating } = useAuthStore();

    if (isHydrating) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-bg-app">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin text-accent mb-4">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <p className="text-sm text-text-muted font-medium animate-pulse">Checking credentials...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
