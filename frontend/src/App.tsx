import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import AdminView from './components/AdminView';
import RoomView from './components/RoomView';
import './index.css'; // Assuming this imports App.css as well if needed at this level

// This was in your original file dump, keeping it.
// Usually, future flags are for react-router-dom v6.4+ if using data APIs,
// but it won't harm if you're on a version that supports it.
const futureFlags = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
};

const AppNavigation: React.FC = () => {
    const location = useLocation();
    const isInRoomView = location.pathname.startsWith('/room/');
    // This check relies on the URL param, which RoomView.tsx manages.
    const isAdminInRoom = isInRoomView && new URLSearchParams(location.search).get('admin') === 'true';

    return (
        <nav style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px', textAlign: 'left' }}>
            {/* Show Admin link if not in a room, OR if admin is in a room. */}
            {(!isInRoomView || isAdminInRoom) && (
                <Link to="/admin" style={{ marginRight: '15px', textDecoration: 'none', fontWeight: 'bold' }}>Admin Portal</Link>
            )}
            {/* For participants in a room, show a non-clickable status. */}
            {isInRoomView && !isAdminInRoom && (
                 <span style={{ marginRight: '15px', color: '#777', fontWeight: 'bold' }}>In Meeting</span>
            )}
            <span style={{color: '#666'}}> | AI Interviewer Meet Room</span>
        </nav>
    );
};

function App() {
    const backendUrlCheck = import.meta.env.VITE_BACKEND_URL;
    const livekitUrlCheck = import.meta.env.VITE_LIVEKIT_URL;

    if (!backendUrlCheck || !livekitUrlCheck) {
        return (
            <div style={{ padding: '20px', color: 'red', border: '1px solid red', margin: '20px', fontFamily:'sans-serif', textAlign: 'center' }}>
                <h2>Application Configuration Error</h2>
                <p>The application is missing essential configuration variables (Backend URL or LiveKit URL).</p>
                <p>Please ensure <code>VITE_BACKEND_URL</code> and <code>VITE_LIVEKIT_URL</code> are correctly set in your environment.</p>
                <p>If you are an administrator, please check the deployment settings.</p>
            </div>
        );
    }

    return (
        <Router future={futureFlags}>
            <div className="app-container" style={{ textAlign: 'center' /* Ensure overall centering if desired */}}>
                <AppNavigation />
                <Routes>
                    <Route path="/admin" element={<AdminView />} />
                    <Route path="/room/:roomName" element={<RoomView />} />
                    <Route path="/" element={<Navigate replace to="/admin" />} /> {/* Default route redirects to admin */}
                    <Route path="*" element={
                        <div style={{ padding: '20px', fontFamily:'sans-serif', textAlign: 'center' }}>
                            <h2>404 - Page Not Found</h2>
                            <p>The page you are looking for does not exist.</p>
                            {/* Changed to a more generic link to the start/root of the app */}
                            <Link to="/">Go to Start Page</Link>
                        </div>}
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
