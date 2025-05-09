import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminView from './components/AdminView';
import RoomView from './components/RoomView';
import './index.css';

const futureFlags = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
};

const AppNavigation: React.FC = () => {
    const location = useLocation();
    const isInRoomView = location.pathname.startsWith('/room/');

    return (
        <nav style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
            {isInRoomView && (
                <span style={{ marginRight: '15px', color: '#777' }}>In Meeting</span>
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
            <div style={{ 
                padding: '20px', 
                color: 'red', 
                border: '1px solid red', 
                margin: '20px', 
                fontFamily:'sans-serif' 
            }}>
                <h2>Configuration Error</h2>
                <p>Missing required environment variables:</p>
                <ul>
                    {!backendUrlCheck && <li>VITE_BACKEND_URL not set</li>}
                    {!livekitUrlCheck && <li>VITE_LIVEKIT_URL not set</li>}
                </ul>
            </div>
        );
    }

    return (
        <Router future={futureFlags}>
            <div className="app-container">
                <AppNavigation />
                <Routes>
                    <Route path="/admin" element={<AdminView />} />
                    <Route path="/room/:roomName" element={<RoomView />} />
                    <Route path="/" element={<Navigate replace to="/admin" />} />
                    <Route path="*" element={
                        <div style={{ padding: '20px', fontFamily:'sans-serif' }}>
                            <h2>404 - Page Not Found</h2>
                            <p>The requested page does not exist.</p>
                            <button onClick={() => window.history.back()}>
                                Go Back
                            </button>
                        </div>}
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
