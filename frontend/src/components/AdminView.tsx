// // frontend/src/components/AdminView.tsx
// import React, { useState, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';

// const backendUrl = import.meta.env.VITE_BACKEND_URL;

// const AdminView: React.FC = () => {
//     const [candidateId, setCandidateId] = useState<string>('');
//     const [adminIdentity, setAdminIdentity] = useState('admin-interviewer'); // Default admin identity
//     const [prospectiveRoomName, setProspectiveRoomName] = useState<string | null>(null);
//     const [shareableLink, setShareableLink] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const [error, setError] = useState<string | null>(null);
//     const navigate = useNavigate();

//     const handleGenerateLink = useCallback(async () => {
//         if (!candidateId.trim() || !adminIdentity.trim()) {
//             setError('Candidate ID and Admin identity cannot be empty.');
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
//         setProspectiveRoomName(null);

//         const timestamp = Date.now();
//         const newProspectiveRoomName = `${candidateId.trim()}_${timestamp}`;
//         setProspectiveRoomName(newProspectiveRoomName);

//         // This link is for the candidate to join; it will trigger room creation.
//         const link = `${window.location.origin}/join-interview/${encodeURIComponent(newProspectiveRoomName)}`;
//         setShareableLink(link);

//         console.log(`Generated shareable link for prospective room: ${newProspectiveRoomName}. Admin: ${adminIdentity}. Link: ${link}`);
//         setIsLoading(false);
//     }, [candidateId, adminIdentity]);

//     const handleJoinRoomAsAdmin = () => {
//         if (prospectiveRoomName && adminIdentity) {
//             console.log(`Admin ${adminIdentity} navigating to join/create room ${prospectiveRoomName}`);
//             // Admin will also go through the flow that ensures room creation if they are first
//             navigate(`/room/${encodeURIComponent(prospectiveRoomName)}?identity=${encodeURIComponent(adminIdentity)}&admin=true&initiate=true`);
//         } else {
//              setError("Cannot join room. Prospective room name or admin identity missing.");
//         }
//     };

//     return (
//         <div className="admin-view">
//             <h2>Admin: Generate Interview Link</h2>
//             {error && <p className="error-message">{error}</p>}
//             <div>
//                 <label htmlFor="candidateId">Candidate ID (Unique Identifier):</label>
//                 <input
//                     id="candidateId"
//                     type="text"
//                     value={candidateId}
//                     onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCandidateId(e.target.value)}
//                     disabled={isLoading || !!shareableLink}
//                     placeholder="e.g., software-engineer-007"
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
//                     placeholder="e.g., interviewer-jane-doe"
//                 />
//             </div>
//             <button onClick={handleGenerateLink} disabled={isLoading || !!shareableLink || !candidateId.trim() || !adminIdentity.trim()}>
//                 {isLoading ? 'Generating...' : 'Generate Interview Link'}
//             </button>

//             {shareableLink && prospectiveRoomName && (
//                 <div className="share-link">
//                     <p>✅ Interview Link Generated!</p>
//                     <p>
//                         <strong>Share this link with the candidate:</strong>
//                         <br/>
//                         <em>(The candidate will be prompted to enter their name to join)</em>
//                     </p>
//                     <code>{shareableLink}</code>
//                     <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#555' }}>
//                         Prospective Room Name: {prospectiveRoomName}
//                     </p>
//                     <button onClick={handleJoinRoomAsAdmin} style={{ marginTop: '15px' }}>
//                         Join Interview as Admin ({adminIdentity})
//                     </button>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default AdminView;






// frontend/src/components/AdminView.tsx
import React, { useState, useCallback } from 'react';
// useNavigate hook is removed as it's no longer used in this component
// import { useNavigate } from 'react-router-dom';

// backendUrl constant is also removed as it's not directly used.

const AdminView: React.FC = () => {
    const [candidateId, setCandidateId] = useState<string>('');
    const [adminIdentity, setAdminIdentity] = useState('admin-interviewer'); // Default admin identity
    const [prospectiveRoomName, setProspectiveRoomName] = useState<string | null>(null);
    const [shareableLink, setShareableLink] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false); // For UI feedback during link generation
    const [error, setError] = useState<string | null>(null);
    // const navigate = useNavigate(); // Removed: navigate is no longer used here

    const handleGenerateLink = useCallback(async () => {
        if (!candidateId.trim() || !adminIdentity.trim()) {
            setError('Candidate ID and Admin identity cannot be empty.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setShareableLink(null);
        setProspectiveRoomName(null);

        const timestamp = Date.now();
        const newProspectiveRoomName = `${candidateId.trim()}_${timestamp}`;
        setProspectiveRoomName(newProspectiveRoomName);

        const link = `${window.location.origin}/join-interview/${encodeURIComponent(newProspectiveRoomName)}`;
        setShareableLink(link);

        console.log(`Generated shareable link for prospective room: ${newProspectiveRoomName}. Admin: ${adminIdentity}. Link: ${link}`);
        setIsLoading(false);
    }, [candidateId, adminIdentity]);

    const handleGenerateAnotherLink = () => {
        setCandidateId(''); 
        setProspectiveRoomName(null);
        setShareableLink(null);
        setError(null);
        setIsLoading(false);
    };

    return (
        <div className="admin-view">
            <h2>Admin: Generate Interview Link</h2>
            {error && <p className="error-message">{error}</p>}
            <div>
                <label htmlFor="candidateId">Candidate ID (from "Successful Candidates" table):</label>
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
                <label htmlFor="adminIdentity">Your Admin Identity (for context during link generation):</label>
                <input
                    id="adminIdentity"
                    type="text"
                    value={adminIdentity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdminIdentity(e.target.value)}
                    disabled={isLoading || !!shareableLink}
                    placeholder="e.g., interviewer-jane-doe"
                />
            </div>

            {!shareableLink && (
                <button 
                    onClick={handleGenerateLink} 
                    disabled={isLoading || !candidateId.trim() || !adminIdentity.trim()}
                >
                    {isLoading ? 'Generating...' : 'Generate Interview Link'}
                </button>
            )}

            {shareableLink && prospectiveRoomName && (
                <div className="share-link">
                    <p>✅ Interview Link Generated! (Session details will be recorded in Airtable upon first join)</p>
                    <p>
                        <strong>Share this link with the candidate:</strong>
                        <br/>
                        <em>(The candidate will be prompted to enter their name to join)</em>
                    </p>
                    <code>{shareableLink}</code>
                    <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#555' }}>
                        Prospective Room Name: {prospectiveRoomName}
                    </p>
                     <button 
                        onClick={handleGenerateAnotherLink} 
                        style={{ marginTop: '15px', backgroundColor: '#6c757d' }}
                        disabled={isLoading}
                    >
                        Generate Another Link
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminView;
