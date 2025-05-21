// frontend/src/components/RoomView.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
    useLocalParticipant,
    useRoomContext,
    ConnectionStateToast,
} from '@livekit/components-react';
import { DisconnectReason, RoomOptions } from 'livekit-client';
import AdminControls from './AdminControls';

const AdminControlsWrapper: React.FC = () => {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    if (!room || !localParticipant) return null;
    return <AdminControls localParticipant={localParticipant} />;
};

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

interface RoomViewProps {
    isJoiningFlow?: boolean;
}

const RoomView: React.FC<RoomViewProps> = ({ isJoiningFlow = false }) => {
    const { roomName: roomNameFromDirectJoin, prospectiveRoomName } = useParams<{ roomName?: string; prospectiveRoomName?: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const actualRoomName = useMemo(() => {
        const name = isJoiningFlow ? prospectiveRoomName : roomNameFromDirectJoin;
        if (!name) {
            console.error("Room name is undefined. This should ideally be caught before rendering RoomView.");
        }
        return name;
    }, [isJoiningFlow, prospectiveRoomName, roomNameFromDirectJoin]);

    const [isAdmin, setIsAdmin] = useState<boolean>(() => searchParams.get('admin') === 'true');
    const [participantIdentity, setParticipantIdentity] = useState<string | null>(() => searchParams.get('identity'));
    const [shouldInitiateRoom, setShouldInitiateRoom] = useState<boolean>(() =>
        isJoiningFlow || searchParams.get('initiate') === 'true'
    );

    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [connect, setConnect] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDisconnect, setShowDisconnect] = useState(false);
    const [disconnectReason, setDisconnectReason] = useState<DisconnectReason | null>(null);
    const [nameInput, setNameInput] = useState('');

    // Effect to keep isAdmin state synchronized with URL params
    useEffect(() => {
        setIsAdmin(searchParams.get('admin') === 'true');
    }, [searchParams]);


    useEffect(() => {
        const identityFromUrl = searchParams.get('identity');
        const initiateFromUrl = searchParams.get('initiate') === 'true';

        if (identityFromUrl) {
            if (identityFromUrl !== participantIdentity) setParticipantIdentity(identityFromUrl);
            const newShouldInitiate = isJoiningFlow || initiateFromUrl;
            if (newShouldInitiate !== shouldInitiateRoom) setShouldInitiateRoom(newShouldInitiate);
            
            if (!isLoading && !error && !showDisconnect && !token) {
                setIsLoading(true);
            }
        } else { // No identity in URL
            setIsLoading(false);
            if (participantIdentity) setParticipantIdentity(null);
            if (shouldInitiateRoom !== isJoiningFlow) setShouldInitiateRoom(isJoiningFlow);
            if (token) setToken(null); 
            if (connect) setConnect(false);
        }
    }, [searchParams, isJoiningFlow, isLoading, error, showDisconnect, token, participantIdentity, shouldInitiateRoom, connect]);

    const handleNameSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = nameInput.trim();
        if (trimmedName && actualRoomName) {
            const newParams: Record<string, string> = { identity: trimmedName };
            if (searchParams.get('admin') === 'true') newParams.admin = 'true'; 
            if (isJoiningFlow || searchParams.get('initiate') === 'true') newParams.initiate = 'true'; 

            setSearchParams(newParams, { replace: true });
        }
    }, [nameInput, actualRoomName, setSearchParams, isJoiningFlow, searchParams]);

    const initiateRoomAndFetchToken = useCallback(async () => {
        if (!actualRoomName || !participantIdentity) {
            setIsLoading(false);
            return;
        }
        if (!backendUrl || !livekitUrl) {
            setError("Configuration error: Backend or LiveKit URL missing.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setConnect(false); 
        setToken(null);   

        try {
            if (shouldInitiateRoom) {
                console.log(`Attempting to ensure/create LiveKit room: "${actualRoomName}" for identity: ${participantIdentity} (admin: ${isAdmin})`); // Use isAdmin state
                const createRoomResponse = await fetch(`${backendUrl}/api/livekit/create-room`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        roomName: actualRoomName,
                        adminIdentity: isAdmin ? participantIdentity : `room-creator-${participantIdentity}` 
                    }),
                });
                const createRoomData = await createRoomResponse.json();
                if (!createRoomResponse.ok && createRoomResponse.status !== 409) {
                    throw new Error(createRoomData.error || `Failed to ensure room: ${createRoomResponse.statusText}`);
                }
                console.log(`Room "${actualRoomName}" is now ensured/created. Status: ${createRoomResponse.status}. Message: ${createRoomData.message || 'OK'}`);
            }

            console.log(`Fetching token for "${participantIdentity}" in room "${actualRoomName}" (isAdmin: ${isAdmin})`); // Use isAdmin state
            const tokenResponse = await fetch(`${backendUrl}/api/livekit/generate-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomName: actualRoomName, participantIdentity, isAdmin }), // Use isAdmin state
            });
            const tokenData = await tokenResponse.json();
            if (!tokenResponse.ok) {
                throw new Error(tokenData.error || `Failed to fetch token: ${tokenResponse.statusText}`);
            }

            setToken(tokenData.token);
            setConnect(true);
            
            if (searchParams.has('initiate')) {
                 const newSearchParams = new URLSearchParams(searchParams);
                 newSearchParams.delete('initiate');
                 setSearchParams(newSearchParams, { replace: true });
            }

        } catch (err: any) {
            console.error('Error during room initiation or token fetch:', err);
            setError(err.message || 'Could not prepare or join the room.');
            setConnect(false); 
        } finally {
            setIsLoading(false);
        }
    }, [actualRoomName, participantIdentity, isAdmin, shouldInitiateRoom, backendUrl, livekitUrl, searchParams, setSearchParams]); // Added isAdmin here

    useEffect(() => {
        if (participantIdentity && actualRoomName && !token && !error && !showDisconnect && isLoading) {
            initiateRoomAndFetchToken();
        }
    }, [participantIdentity, actualRoomName, token, error, showDisconnect, isLoading, initiateRoomAndFetchToken]);

    const roomOptions: RoomOptions = useMemo(() => ({
        adaptiveStream: true,
        dynacast: true,
    }), []);

    const onDisconnected = useCallback((reason?: DisconnectReason) => {
        // Use the `isAdmin` state which is kept in sync with searchParams by its own useEffect.
        // This should be the state of `isAdmin` when the user was connected.
        if (isAdmin && reason === DisconnectReason.CLIENT_INITIATED) {
            console.log("Admin client initiated disconnect. Navigating directly to admin page.");
            // Navigate first. This should trigger unmount of RoomView.
            navigate('/admin', { replace: true });
            // It's good practice to reset sensitive states, but the component will unmount.
            // Clearing URL params on the /admin page itself might be cleaner if needed there.
            // For this component, just ensure we don't try to show the disconnect screen.
            setShowDisconnect(false); 
            return; // IMPORTANT: Exit to prevent showing the disconnect screen
        }

        // For all other cases (participant disconnects, or admin non-client-initiated disconnects)
        setConnect(false);
        setToken(null);
        setShowDisconnect(true); // Show the disconnect screen
        setDisconnectReason(reason ?? null);
        setIsLoading(false);
    }, [navigate, isAdmin]); // Depend on the `isAdmin` state and `navigate`

    const handleNavigateToHomeOrAdmin = () => {
        navigate('/admin', { replace: true }); 
        setShowDisconnect(false);
        setError(null);
        setParticipantIdentity(null); 
        setToken(null);
        setNameInput('');
        setConnect(false);
        setSearchParams({}, {replace: true}); 
    };

    const attemptReconnect = () => {
        setShowDisconnect(false);
        setError(null);
        setToken(null);
        setConnect(false); 
        if (participantIdentity && actualRoomName) {
            setIsLoading(true); 
        } else {
            handleNavigateToHomeOrAdmin();
        }
    };
    
    const handleChangeName = () => {
        setShowDisconnect(false);
        setError(null);
        setToken(null);
        setConnect(false);
        setParticipantIdentity(null); 
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('identity'); 
        newSearchParams.delete('admin'); 
        newSearchParams.delete('initiate'); 
        setSearchParams(newSearchParams, { replace: true });
        setNameInput(''); 
        // setIsAdmin(false); // This will be handled by the useEffect watching searchParams
    };

    if (!actualRoomName && !error && !showDisconnect) {
        return (
            <div className="participant-view error-message" style={{ padding: '20px', textAlign: 'center' }}>
                <p>Error: Room name not specified in the URL. Cannot proceed.</p>
                <button onClick={handleNavigateToHomeOrAdmin}>Return to Setup</button>
            </div>
        );
    }

    if (!participantIdentity && !error && !showDisconnect) {
        return (
            <div className="participant-view name-input-container" style={{ padding: '30px', textAlign: 'center', maxWidth: '400px', margin: '50px auto' }}>
                <h3>Enter Your Name to Join Interview: "{actualRoomName}"</h3>
                <form onSubmit={handleNameSubmit}>
                    <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Your Name"
                        required
                        autoFocus
                        style={{ padding: '10px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <button type="submit" style={{ padding: '10px 20px' }} disabled={!nameInput.trim()}>
                        Join Interview
                    </button>
                </form>
            </div>
        );
    }

    if (isLoading) {
        return <div className="participant-view" style={{ padding: '30px', textAlign: 'center' }}>Preparing session for {participantIdentity || 'guest'}...</div>;
    }

    if (error) {
        return (
            <div className="participant-view error-message" style={{ padding: '20px', textAlign: 'center' }}>
                <p>{error.includes("Failed to fetch") || error.includes("Could not reach") ? `${error}. Please check backend service and network.` : `Error: ${error}`}</p>
                <button onClick={handleNavigateToHomeOrAdmin}>Return to Setup</button>
            </div>
        );
    }

    // The showDisconnect block is only rendered if an admin did NOT do a CLIENT_INITIATED leave.
    if (showDisconnect) {
        let title = "Disconnected";
        let message = "You have been disconnected from the session.";
        const reasonKey = disconnectReason !== null && DisconnectReason[disconnectReason] !== undefined 
            ? DisconnectReason[disconnectReason] 
            : "UNKNOWN";

        switch (disconnectReason) {
            case DisconnectReason.CLIENT_INITIATED:
                message = "You have successfully left the session.";
                break;
            case DisconnectReason.ROOM_DELETED:
                message = isAdmin ? "The room has been closed by an administrator." : "This interview session has ended.";
                break;
            case DisconnectReason.PARTICIPANT_REMOVED:
                message = "You were removed from the room by an administrator.";
                break;
            case DisconnectReason.DUPLICATE_IDENTITY:
                title = "Connection Failed";
                message = `Another participant with the name "${participantIdentity || 'your chosen name'}" is already in this room. Please use a different name.`;
                break;
            case DisconnectReason.JOIN_FAILURE:
                title = "Connection Failed";
                message = "Failed to join the room. The session may not exist, your access token might be invalid/expired, or there was a network issue.";
                break;
            case DisconnectReason.STATE_MISMATCH:
                 title = "Connection Error";
                message = "A connection state mismatch occurred. Please try reconnecting.";
                break;
            default: 
                message = `You have been disconnected. Reason: ${reasonKey}.`;
                if (disconnectReason === null) message = "You have been disconnected for an unknown reason.";
                break;
        }
        
        const canAttemptReconnect = !(
            disconnectReason === DisconnectReason.ROOM_DELETED ||
            disconnectReason === DisconnectReason.PARTICIPANT_REMOVED ||
            (disconnectReason === DisconnectReason.JOIN_FAILURE && (message.toLowerCase().includes("token might be invalid") || message.toLowerCase().includes("session may not exist")))
        );

        return (
            <div className="disconnect-overlay">
                <h2>{title}</h2>
                <p>{message}</p>
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {isAdmin ? ( 
                        // This block is for non-CLIENT_INITIATED admin disconnects
                        <>
                            <button onClick={attemptReconnect}>Try Reconnecting</button>
                            <button onClick={handleNavigateToHomeOrAdmin} style={{backgroundColor: '#6c757d'}}>Return to Admin Page</button>
                        </>
                    ) : (
                        // Participant Disconnect Logic (as per your "only try reconnecting" request where viable)
                        <>
                            {disconnectReason === DisconnectReason.DUPLICATE_IDENTITY ? (
                                <button onClick={handleChangeName}>Change Name</button>
                            ) : canAttemptReconnect ? ( 
                                <button onClick={attemptReconnect}>Try Reconnecting</button>
                            ) : (
                                // If reconnect is not an option (e.g., room deleted) AND not DUPLICATE_IDENTITY
                                <button onClick={handleNavigateToHomeOrAdmin}>Go to Homepage</button>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (!connect || !token || !livekitUrl) {
         if (participantIdentity && actualRoomName) {
            return <div className="participant-view" style={{ padding: '30px', textAlign: 'center' }}>Waiting for connection details for {participantIdentity}... If this persists, please try again from the beginning.</div>;
         }
         return <div className="participant-view" style={{ padding: '30px', textAlign: 'center' }}>Preparing session...</div>;
    }

    return (
        <div className="participant-view room-view-container">
            <LiveKitRoom
                token={token}
                serverUrl={livekitUrl}
                connect={connect}
                audio={true}
                video={true}
                options={roomOptions}
                onDisconnected={onDisconnected} 
                onError={(err: Error) => {
                    console.error("LiveKit Room critical error:", err);
                    if (err.message.includes("permission denied") || err.message.includes("authentication failed") || err.message.includes("Forbidden")) {
                        setError(`Authentication failed: ${err.message}. The token might be invalid or expired, or room permissions are not correctly set. Try rejoining.`);
                    } else {
                        setError(`LiveKit Connection error: ${err.message}`);
                    }
                    setConnect(false); 
                    setIsLoading(false);
                }}
            >
                <div style={{ marginBottom: '10px', padding: '5px', background: '#eee', borderRadius:'4px', textAlign:'center' }}>
                    <span style={{ fontWeight: 'bold' }}>Room:</span> {actualRoomName} | <span style={{ fontWeight: 'bold' }}>As:</span> {participantIdentity} {isAdmin ? '(Admin)' : ''}
                </div>

                {isAdmin && <AdminControlsWrapper />}

                <VideoConference />
                <RoomAudioRenderer />
                <ConnectionStateToast />
            </LiveKitRoom>
        </div>
    );
};

export default RoomView;


