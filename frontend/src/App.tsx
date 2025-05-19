// import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
// import AdminView from './components/AdminView';
// import RoomView from './components/RoomView';
// import './index.css';

// const futureFlags = {
//     v7_startTransition: true,
//     v7_relativeSplatPath: true,
// };

// const AppNavigation: React.FC = () => {
//     const location = useLocation();
//     const isInRoomView = location.pathname.startsWith('/room/');

//     return (
//         <nav style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
//             {isInRoomView && (
//                 <span style={{ marginRight: '15px', color: '#777' }}>In Meeting</span>
//             )}
//             <span style={{color: '#666'}}> | AI Interviewer Meet Room</span>
//         </nav>
//     );
// };

// function App() {
//     const backendUrlCheck = import.meta.env.VITE_BACKEND_URL;
//     const livekitUrlCheck = import.meta.env.VITE_LIVEKIT_URL;

//     if (!backendUrlCheck || !livekitUrlCheck) {
//         return (
//             <div style={{ 
//                 padding: '20px', 
//                 color: 'red', 
//                 border: '1px solid red', 
//                 margin: '20px', 
//                 fontFamily:'sans-serif' 
//             }}>
//                 <h2>Configuration Error</h2>
//                 <p>Missing required environment variables:</p>
//                 <ul>
//                     {!backendUrlCheck && <li>VITE_BACKEND_URL not set</li>}
//                     {!livekitUrlCheck && <li>VITE_LIVEKIT_URL not set</li>}
//                 </ul>
//             </div>
//         );
//     }

//     return (
//         <Router future={futureFlags}>
//             <div className="app-container">
//                 <AppNavigation />
//                 <Routes>
//                     <Route path="/admin" element={<AdminView />} />
//                     <Route path="/room/:roomName" element={<RoomView />} />
//                     <Route path="/" element={<Navigate replace to="/admin" />} />
//                     <Route path="*" element={
//                         <div style={{ padding: '20px', fontFamily:'sans-serif' }}>
//                             <h2>404 - Page Not Found</h2>
//                             <p>The requested page does not exist.</p>
//                             <button onClick={() => window.history.back()}>
//                                 Go Back
//                             </button>
//                         </div>}
//                     />
//                 </Routes>
//             </div>
//         </Router>
//     );
// }

// export default App;








// frontend/src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import AdminView from './components/AdminView';
import RoomView from './components/RoomView';
import ActiveRoomsView from './components/ActiveRoomsView'; 
import './index.css';

const futureFlags = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
};

const AppNavigation: React.FC = () => {
    const location = useLocation();
    const isInRoomView = location.pathname.startsWith('/room/') || location.pathname.startsWith('/join-interview/');

    return (
        <nav style={{
            marginBottom: '25px',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            paddingLeft: '10px',
            paddingRight: '10px'
        }}>
            <div style={{ marginRight: '20px' }}>
                {isInRoomView ? (
                    <span style={{ color: '#2c3e50', fontWeight: 'bold', fontSize: '1.3em' }}>
                        AI Interview Session
                    </span>
                ) : (
                    <Link to="/admin" style={{ textDecoration: 'none', color: '#2c3e50', fontWeight: 'bold', fontSize: '1.3em' }}>
                        AI Interviewer Platform
                    </Link>
                )}
            </div>
            {!isInRoomView && (
                <div style={{ display: 'flex', gap: '20px' }}>
                    <Link
                        to="/admin"
                        style={{ textDecoration: 'none', color: location.pathname === '/admin' || location.pathname === '/' ? '#007bff' : '#555', fontWeight: location.pathname === '/admin' || location.pathname === '/' ? 'bold' : 'normal', padding: '8px 12px', borderRadius: '4px', transition: 'background-color 0.2s ease' }}
                        className="nav-link"
                    >
                        Generate Link
                    </Link>
                    <Link
                        to="/active-rooms"
                        style={{ textDecoration: 'none', color: location.pathname === '/active-rooms' ? '#007bff' : '#555', fontWeight: location.pathname === '/active-rooms' ? 'bold' : 'normal', padding: '8px 12px', borderRadius: '4px', transition: 'background-color 0.2s ease' }}
                        className="nav-link"
                    >
                        Active Rooms
                    </Link>
                </div>
            )}
        </nav>
    );
};

function App() {
    const backendUrlCheck = import.meta.env.VITE_BACKEND_URL;
    const livekitUrlCheck = import.meta.env.VITE_LIVEKIT_URL;

    if (!backendUrlCheck || !livekitUrlCheck) {
        return (
            <div style={{
                padding: '30px', color: '#D8000C', backgroundColor: '#FFD2D2', border: '1px solid #D8000C',
                borderRadius: '8px', margin: '30px auto', maxWidth: '600px', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                textAlign: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ marginTop: 0, color: '#A30000' }}>Critical Configuration Error</h2>
                <p style={{ lineHeight: '1.6', fontSize: '1.05em' }}>Essential environment variables are missing.</p>
                <ul style={{ listStyleType: 'none', paddingLeft: 0, textAlign: 'left', display: 'inline-block', marginTop: '15px', marginBottom: '15px' }}>
                    {!backendUrlCheck && <li style={{ marginBottom: '10px', fontSize: '1em' }}>❌ <strong>VITE_BACKEND_URL</strong> is not set.</li>}
                    {!livekitUrlCheck && <li style={{ marginBottom: '10px', fontSize: '1em' }}>❌ <strong>VITE_LIVEKIT_URL</strong> is not set.</li>}
                </ul>
                <p style={{ marginTop: '20px', fontSize: '0.95em', color: '#555' }}>Please ensure <code>frontend/.env</code> is correctly configured.</p>
            </div>
        );
    }

    return (
        <Router future={futureFlags}>
            <div className="app-container">
                <AppNavigation />
                <main style={{ paddingTop: '10px' }}>
                    <Routes>
                        <Route path="/admin" element={<AdminView />} />
                        <Route path="/active-rooms" element={<ActiveRoomsView />} />
                        {/* New route for candidates joining via the generated link */}
                        <Route path="/join-interview/:prospectiveRoomName" element={<RoomView isJoiningFlow={true} />} />
                        {/* Existing route for direct joining (e.g., admin joining an already active room or after generating link) */}
                        <Route path="/room/:roomName" element={<RoomView />} />
                        <Route path="/" element={<Navigate replace to="/admin" />} />
                        <Route path="*" element={
                            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                <h2>404 - Page Not Found</h2>
                                <p>Sorry, the page you are looking for could not be found.</p>
                                <button onClick={() => window.history.back()}>Go Back</button>
                            </div>}
                        />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
