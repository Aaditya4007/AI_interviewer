// // frontend/src/components/AdminView.tsx
// import React, { useState, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';

// const backendUrl = import.meta.env.VITE_BACKEND_URL;

// const AdminView: React.FC = () => {
//     const [roomName, setRoomName] = useState(`interview-${Date.now().toString().slice(-6)}`);
//     const [adminIdentity, setAdminIdentity] = useState('admin');
//     const [shareableLink, setShareableLink] = useState<string | null>(null);
//     // const [agentTokenForDisplay, setAgentTokenForDisplay] = useState<string | null>(null); // REMOVED
//     const [isLoading, setIsLoading] = useState(false);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     const handleCreateRoom = useCallback(async () => {
//         if (!roomName.trim() || !adminIdentity.trim()) {
//             setError('Room name and Admin identity cannot be empty.');
//             return;
//         }
//         if (!backendUrl) {
//              setError('Backend URL configuration is missing. Check VITE_BACKEND_URL in .env');
//              console.error("Error: VITE_BACKEND_URL is not defined in environment variables accessible via import.meta.env");
//              return;
//         }
//         setIsLoading(true);
//         setError(null);
//         setShareableLink(null);
//         // setAgentTokenForDisplay(null); // REMOVED
//         console.log(`Requesting creation of room: ${roomName} by admin: ${adminIdentity}`);

//         try {
//             const response = await fetch(`${backendUrl}/api/livekit/create-room`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ roomName: roomName.trim(), adminIdentity: adminIdentity.trim() }),
//             });
//             const data = await response.json();
//             if (!response.ok) throw new Error(data.error || `Failed to create room: ${response.statusText}`);

//             console.log('Room created successfully:', data);
//             // setAgentTokenForDisplay(data.agentToken); // REMOVED
//             const link = `${window.location.origin}/room/${data.roomName}`;
//             setShareableLink(link);
//             // The agent token is still logged on the backend, which is usually sufficient
//             // if the agent is started separately or uses worker mode.
//             if (data.agentToken) {
//                 console.warn(`Agent Token (logged on backend): ${data.agentToken}`);
//             }

//         } catch (err: any) {
//             console.error('Error creating room:', err);
//             setError(err.message || 'An unknown error occurred during room creation.');
//         } finally {
//             setIsLoading(false);
//         }
//     }, [roomName, adminIdentity]);

//     const handleJoinRoom = () => {
//         if (roomName && adminIdentity) {
//             console.log(`Admin ${adminIdentity} navigating to room ${roomName}`);
//             navigate(`/room/${roomName}?identity=${encodeURIComponent(adminIdentity)}&admin=true`);
//         } else {
//              setError("Cannot join room. Room name or admin identity missing.");
//         }
//     };

//     return (
//         <div className="admin-view">
//             <h2>Admin: Create Interview Room</h2>
//             {error && <p className="error-message">{error}</p>}
//             <div>
//                 <label htmlFor="roomName">Room Name:</label>
//                 <input
//                     id="roomName"
//                     type="text"
//                     value={roomName}
//                     onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomName(e.target.value)}
//                     disabled={isLoading || !!shareableLink}
//                     placeholder="e.g., project-alpha-interview"
//                 />
//             </div>
//             <div>
//                 <label htmlFor="adminIdentity">Your Admin Identity:</label>
//                 <input
//                     id="adminIdentity"
//                     type="text"
//                     value={adminIdentity}
//                     onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdminIdentity(e.target.value)}
//                     disabled={isLoading || !!shareableLink}
//                     placeholder="e.g., interviewer-name"
//                 />
//             </div>
//             <button onClick={handleCreateRoom} disabled={isLoading || !!shareableLink || !roomName.trim() || !adminIdentity.trim()}>
//                 {isLoading ? 'Creating...' : 'Create Room & Get Link'}
//             </button>

//             {shareableLink && (
//                 <div className="share-link">
//                     <p>✅ Room Created!</p>
//                     <p>
//                         <strong>Share this link with participants:</strong>
//                         <br/>
//                         <em>(They will be prompted to enter their name when they join)</em>
//                     </p>
//                     <code>{shareableLink}</code>

//                     {/* REMOVED Agent Token display section */}
//                     {/*
//                      <p style={{ marginTop: '15px' }}>
//                         <strong>Agent Token</strong> (Copy to agent's <code>.env</code> file):
//                      </p>
//                      <code style={{marginTop: '5px', whiteSpace: 'pre-wrap'}}>{agentTokenForDisplay}</code>
//                     */}

//                     <button onClick={handleJoinRoom} style={{ marginTop: '15px' }}>
//                         Join Room as Admin ({adminIdentity})
//                     </button>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default AdminView;











// frontend/src/components/AdminView.tsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const AdminView: React.FC = () => {
    const [candidateId, setCandidateId] = useState<string>('');
    const [adminIdentity, setAdminIdentity] = useState('admin-interviewer'); // Default admin identity
    const [prospectiveRoomName, setProspectiveRoomName] = useState<string | null>(null);
    const [shareableLink, setShareableLink] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleGenerateLink = useCallback(async () => {
        if (!candidateId.trim() || !adminIdentity.trim()) {
            setError('Candidate ID and Admin identity cannot be empty.');
            return;
        }
        if (!backendUrl) {
             setError('Backend URL configuration is missing. Check VITE_BACKEND_URL in .env');
             console.error("Error: VITE_BACKEND_URL is not defined in environment variables accessible via import.meta.env");
             return;
        }

        setIsLoading(true);
        setError(null);
        setShareableLink(null);
        setProspectiveRoomName(null);

        const timestamp = Date.now();
        const newProspectiveRoomName = `${candidateId.trim()}_${timestamp}`;
        setProspectiveRoomName(newProspectiveRoomName);

        // This link is for the candidate to join; it will trigger room creation.
        const link = `${window.location.origin}/join-interview/${encodeURIComponent(newProspectiveRoomName)}`;
        setShareableLink(link);

        console.log(`Generated shareable link for prospective room: ${newProspectiveRoomName}. Admin: ${adminIdentity}. Link: ${link}`);
        setIsLoading(false);
    }, [candidateId, adminIdentity]);

    const handleJoinRoomAsAdmin = () => {
        if (prospectiveRoomName && adminIdentity) {
            console.log(`Admin ${adminIdentity} navigating to join/create room ${prospectiveRoomName}`);
            // Admin will also go through the flow that ensures room creation if they are first
            navigate(`/room/${encodeURIComponent(prospectiveRoomName)}?identity=${encodeURIComponent(adminIdentity)}&admin=true&initiate=true`);
        } else {
             setError("Cannot join room. Prospective room name or admin identity missing.");
        }
    };

    return (
        <div className="admin-view">
            <h2>Admin: Generate Interview Link</h2>
            {error && <p className="error-message">{error}</p>}
            <div>
                <label htmlFor="candidateId">Candidate ID (Unique Identifier):</label>
                <input
                    id="candidateId"
                    type="text"
                    value={candidateId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCandidateId(e.target.value)}
                    disabled={isLoading || !!shareableLink}
                    placeholder="e.g., software-engineer-007"
                />
            </div>
            <div>
                <label htmlFor="adminIdentity">Your Admin Identity:</label>
                <input
                    id="adminIdentity"
                    type="text"
                    value={adminIdentity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdminIdentity(e.target.value)}
                    disabled={isLoading || !!shareableLink}
                    placeholder="e.g., interviewer-jane-doe"
                />
            </div>
            <button onClick={handleGenerateLink} disabled={isLoading || !!shareableLink || !candidateId.trim() || !adminIdentity.trim()}>
                {isLoading ? 'Generating...' : 'Generate Interview Link'}
            </button>

            {shareableLink && prospectiveRoomName && (
                <div className="share-link">
                    <p>✅ Interview Link Generated!</p>
                    <p>
                        <strong>Share this link with the candidate:</strong>
                        <br/>
                        <em>(The candidate will be prompted to enter their name to join)</em>
                    </p>
                    <code>{shareableLink}</code>
                    <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#555' }}>
                        Prospective Room Name: {prospectiveRoomName}
                    </p>
                    <button onClick={handleJoinRoomAsAdmin} style={{ marginTop: '15px' }}>
                        Join Interview as Admin ({adminIdentity})
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminView;
