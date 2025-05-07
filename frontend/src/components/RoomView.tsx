// frontend/src/components/RoomView.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
// FIX: Removed unused useNavigate import
import { useParams, useSearchParams, Link } from 'react-router-dom';
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
    if (!room || !localParticipant) {
        // console.warn("AdminControlsWrapper: Skipping render, room or localParticipant not ready."); // Optional: Keep if useful
        return null;
    }
    return <AdminControls localParticipant={localParticipant} />;
};

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

const RoomView: React.FC = () => {
    const { roomName } = useParams<{ roomName: string }>();
    // FIX: Removed unused navigate variable
    const [searchParams, setSearchParams] = useSearchParams();
    // const navigate = useNavigate(); // Removed

    // Initialize state directly from URL search params
    const [participantIdentity, setParticipantIdentity] = useState<string | null>(() => searchParams.get('identity'));
    const [isAdmin, setIsAdmin] = useState<boolean>(() => searchParams.get('admin') === 'true');
    const [token, setToken] = useState<string | null>(null);
    const [isLoadingToken, setIsLoadingToken] = useState(false); // Default to false
    const [connect, setConnect] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDisconnect, setShowDisconnect] = useState(false);
    const [disconnectReason, setDisconnectReason] = useState<DisconnectReason | null>(null);

    const [nameInput, setNameInput] = useState(''); // For the inline name input

    // --- Effect 1: Check for identity when component mounts or URL changes ---
    useEffect(() => {
        console.log("RoomView Effect 1: Checking identity from URL.");
        const identityFromUrl = searchParams.get('identity');
        const isAdminFromUrl = searchParams.get('admin') === 'true';

        if (identityFromUrl) {
            console.log(`RoomView Effect 1: Identity found in URL: ${identityFromUrl}, Admin: ${isAdminFromUrl}`);
            // Update state only if it has actually changed
            if (identityFromUrl !== participantIdentity) {
                setParticipantIdentity(identityFromUrl);
            }
            if (isAdminFromUrl !== isAdmin) {
                 setIsAdmin(isAdminFromUrl);
            }
            // If identity is now set, prepare to fetch token (unless already fetching/error)
            if (!isLoadingToken && !error && !showDisconnect) {
                setIsLoadingToken(true);
            }
        } else {
            console.log("RoomView Effect 1: No identity in URL. Will render name input form.");
            // Ensure loading is off so the form can be shown
            setIsLoadingToken(false);
            // Reset identity/admin state if URL params are removed
            if (participantIdentity) setParticipantIdentity(null);
            if (isAdmin) setIsAdmin(false);
        }
    }, [searchParams]); // Rerun primarily when searchParams change


    // --- Callback to handle name submission from inline form ---
    const handleNameSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = nameInput.trim();
        if (trimmedName) {
            console.log(`RoomView handleNameSubmit: Name submitted: ${trimmedName}`);
            // Update URL search params. This triggers Effect 1 which sets state.
            setSearchParams({ identity: trimmedName }, { replace: true }); // Use replace to avoid back button issues
        } else {
            // setError("Please enter a valid name."); // Or just rely on input validation
            console.warn("Empty name submitted");
        }
    }, [nameInput, setSearchParams]);


    // --- Effect 2: Fetch Token once identity is available ---
    const fetchToken = useCallback(async () => {
        if (!roomName || !participantIdentity || error || showDisconnect) {
            console.log("RoomView FetchToken: Skipping fetch. Conditions not met.", { roomName, participantIdentity, error, showDisconnect });
            setIsLoadingToken(false); // Ensure loading is off if we skip
            return;
        }
        if (!backendUrl || !livekitUrl) {
             setError("Configuration error: Backend or LiveKit URL missing.");
             setIsLoadingToken(false);
             return;
        }

        console.log(`RoomView FetchToken: Fetching for ${participantIdentity}, Admin: ${isAdmin}`);
        setIsLoadingToken(true); // Set loading true before fetch
        setError(null);
        setConnect(false);
        setToken(null);

        try {
            const response = await fetch(`${backendUrl}/api/livekit/generate-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomName, participantIdentity, isAdmin }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `Failed to fetch token: ${response.statusText}`);

            console.log('RoomView FetchToken: Token received.');
            setToken(data.token);
            setConnect(true);
        } catch (err: any) {
            console.error('RoomView FetchToken: Error:', err);
            setError(err.message || 'Could not fetch access token.');
            setConnect(false);
        } finally {
            setIsLoadingToken(false); // Set loading false after fetch attempt
        }
    }, [roomName, participantIdentity, isAdmin, error, showDisconnect, backendUrl, livekitUrl]);

    useEffect(() => {
        // Trigger token fetch only when participantIdentity changes to a non-null value
        if (participantIdentity) {
            console.log("RoomView Effect 2: participantIdentity is set, calling fetchToken.");
            fetchToken();
        } else {
            console.log("RoomView Effect 2: participantIdentity is null, not fetching token.");
             // If identity becomes null (e.g. user navigates back), reset connection state
             setConnect(false);
             setToken(null);
        }
    }, [participantIdentity, fetchToken]); // Depend on identity and the memoized fetch function

    // FIX: Corrected useMemo syntax - removed the comment inside the function call
    const roomOptions: RoomOptions = useMemo(() => ({
        adaptiveStream: true,
        dynacast: true,
    }), []); // Dependency array is empty, options don't change

    const onDisconnected = useCallback((reason?: DisconnectReason) => {
        console.log("Disconnected from LiveKit Room. Reason:", reason);
        setConnect(false);
        setToken(null);
        setShowDisconnect(true);
        setDisconnectReason(reason ?? null);
        setIsLoadingToken(false);
        // Optional: Clear identity state on disconnect? Or keep it for potential reconnect?
        // setParticipantIdentity(null); // Uncomment if you want user to re-enter name on reconnect
    }, []);

    // --- Render Logic ---
    // console.log("RoomView Rendering:", { isLoadingToken, error, showDisconnect, connect, token: !!token, participantIdentity, isAdmin });

    // Render name input form if no identity is set yet
    if (!participantIdentity && !error && !showDisconnect) {
        return (
            <div className="participant-view name-input-container" style={{ padding: '30px', textAlign: 'center', maxWidth: '400px', margin: '50px auto' }}>
                <h3>Enter Your Name to Join Room "{roomName}"</h3>
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
                        Join Room
                    </button>
                </form>
                {/* Removed error display here as main error state handles it */}
            </div>
        );
    }

    // Show loading indicator while fetching token (after identity is provided)
    if (isLoadingToken && !error && !showDisconnect) {
         return <div className="participant-view" style={{ padding: '30px', textAlign: 'center' }}>Loading access for {participantIdentity}...</div>;
    }

    // Show error message if fetch failed or other errors occurred
    if (error) {
        let displayError = `Error: ${error}`;
        if (error.includes("Failed to fetch")) displayError += ". Could not reach backend service.";
        return (
            <div className="participant-view error-message" style={{ padding: '20px', textAlign: 'center' }}>
                <p>{displayError}</p>
                 {/* Allow user to try entering name again if error occurred after identity was set */}
                <button onClick={() => {setError(null); setParticipantIdentity(null); setSearchParams({}); setIsLoadingToken(false);}} style={{marginRight: '10px'}}>Enter Name Again</button>
                <Link to="/admin">Go Back to Admin</Link>
            </div>
        );
    }

    // Show disconnect message
    if (showDisconnect) {
        // ... (disconnect rendering same as before) ...
        let message = "You have been disconnected.";
        if (disconnectReason === DisconnectReason.ROOM_DELETED) message = "The room has been closed.";
        else if (disconnectReason === DisconnectReason.PARTICIPANT_REMOVED) message = "You were removed from the room.";
        else if (disconnectReason === DisconnectReason.STATE_MISMATCH) message = "Connection error (state mismatch).";
        else if (disconnectReason === DisconnectReason.JOIN_FAILURE) message = "Failed to join the room. The room may not exist or the token might be invalid.";
        else if (disconnectReason === DisconnectReason.DUPLICATE_IDENTITY) message = "Another participant with the same identity is already in the room.";
        return (
            <div className="disconnect-overlay">
                <h2>Disconnected</h2>
                <p>{message}</p>
                {disconnectReason !== DisconnectReason.DUPLICATE_IDENTITY && (
                    <button onClick={() => window.location.reload()} style={{marginRight: '10px'}}>Try Reconnecting</button>
                )}
                <Link to="/admin">Go to Admin</Link>
            </div>
        );
    }

    // Show preparing connection if token fetch succeeded but LiveKitRoom hasn't connected yet
     if ((!connect || !token || !livekitUrl) && participantIdentity) {
         return <div className="participant-view" style={{ padding: '30px', textAlign: 'center' }}>Preparing connection for {participantIdentity}...</div>;
    }

    // If we shouldn't render LiveKitRoom yet (e.g. missing config), show generic loading/error
    if (!livekitUrl) {
         return <div className="participant-view error-message" style={{ padding: '20px', textAlign: 'center' }}>Cannot connect: LiveKit URL configuration is missing.</div>;
    }
    if (!token) {
         // Should ideally be covered by isLoadingToken or error states
          return <div className="participant-view" style={{ padding: '30px', textAlign: 'center' }}>Waiting for connection token...</div>;
    }


    // --- Render LiveKit Room ---
    return (
        <div className="participant-view room-view-container">
            <LiveKitRoom
                token={token}
                serverUrl={livekitUrl}
                connect={connect} // Should be true here
                audio={true}
                video={true}
                options={roomOptions}
                onDisconnected={onDisconnected}
                onError={(err: Error) => {
                     console.error("LiveKit Room critical error:", err);
                     if (err.message.includes("permission denied") || err.message.includes("authentication failed")) {
                        setError(`Authentication failed: ${err.message}. Token invalid/expired?`);
                     } else {
                        setError(`Connection error: ${err.message}`);
                     }
                     setConnect(false);
                     setIsLoadingToken(false);
                 }}
            >
                 <div style={{ marginBottom: '10px', padding: '5px', background: '#eee', borderRadius:'4px' }}>
                    <span style={{ fontWeight: 'bold' }}>Room:</span> {roomName} | <span style={{ fontWeight: 'bold' }}>As:</span> {participantIdentity} {isAdmin ? '(Admin)' : ''}
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