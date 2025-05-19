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
import './index.css'; // Ensure global styles are imported

const futureFlags = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
};

const AppNavigation: React.FC = () => {
    const location = useLocation();
    const isInRoomView = location.pathname.startsWith('/room/');

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
            {/* Conditional rendering of admin links */}
            {!isInRoomView && (
                <div style={{ display: 'flex', gap: '20px' }}>
                    <Link
                        to="/admin"
                        style={{ textDecoration: 'none', color: location.pathname === '/admin' || location.pathname === '/' ? '#007bff' : '#555', fontWeight: location.pathname === '/admin' || location.pathname === '/' ? 'bold' : 'normal', padding: '8px 12px', borderRadius: '4px', transition: 'background-color 0.2s ease' }}
                        className="nav-link" // Added class for potential hover effects via CSS
                    >
                        Create Room
                    </Link>
                    <Link
                        to="/active-rooms"
                        style={{ textDecoration: 'none', color: location.pathname === '/active-rooms' ? '#007bff' : '#555', fontWeight: location.pathname === '/active-rooms' ? 'bold' : 'normal', padding: '8px 12px', borderRadius: '4px', transition: 'background-color 0.2s ease' }}
                        className="nav-link" // Added class
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
                padding: '30px',
                color: '#D8000C',
                backgroundColor: '#FFD2D2',
                border: '1px solid #D8000C',
                borderRadius: '8px',
                margin: '30px auto',
                maxWidth: '600px',
                fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                textAlign: 'center',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ marginTop: 0, color: '#A30000' }}>Critical Configuration Error</h2>
                <p style={{ lineHeight: '1.6', fontSize: '1.05em' }}>
                    One or more essential environment variables are missing.
                    The application cannot start correctly without them.
                </p>
                <ul style={{ listStyleType: 'none', paddingLeft: 0, textAlign: 'left', display: 'inline-block', marginTop: '15px', marginBottom: '15px' }}>
                    {!backendUrlCheck && <li style={{ marginBottom: '10px', fontSize: '1em' }}>❌ <strong>VITE_BACKEND_URL</strong> is not set.</li>}
                    {!livekitUrlCheck && <li style={{ marginBottom: '10px', fontSize: '1em' }}>❌ <strong>VITE_LIVEKIT_URL</strong> is not set.</li>}
                </ul>
                <p style={{ marginTop: '20px', fontSize: '0.95em', color: '#555' }}>
                    Please ensure your <code>frontend/.env</code> file is correctly configured with these values.
                    Refer to the setup documentation or an <code>.env.example</code> file if available.
                </p>
            </div>
        );
    }

    return (
        <Router future={futureFlags}>
            <div className="app-container">
                <AppNavigation />
                <main style={{ paddingTop: '10px' }}> {/* Added padding top to main content area */}
                    <Routes>
                        <Route path="/admin" element={<AdminView />} />
                        <Route path="/active-rooms" element={<ActiveRoomsView />} />
                        <Route path="/room/:roomName" element={<RoomView />} />
                        <Route path="/" element={<Navigate replace to="/admin" />} /> {/* Default to admin view */}
                        <Route path="*" element={
                            <div style={{ padding: '40px 20px', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', textAlign: 'center' }}>
                                <h2 style={{ fontSize: '2.5em', color: '#333', marginBottom: '15px' }}>404</h2>
                                <p style={{ fontSize: '1.2em', color: '#555', marginBottom: '30px' }}>
                                    Sorry, the page you are looking for could not be found.
                                </p>
                                <button
                                    onClick={() => window.history.back()}
                                    style={{
                                        padding: '12px 25px',
                                        fontSize: '1em',
                                        color: 'white',
                                        backgroundColor: '#007bff',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                    onMouseOver={e => (e.currentTarget.style.backgroundColor = '#0056b3')}
                                    onMouseOut={e => (e.currentTarget.style.backgroundColor = '#007bff')}
                                >
                                    Go Back
                                </button>
                            </div>}
                        />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
