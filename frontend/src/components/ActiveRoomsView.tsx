// frontend/src/components/ActiveRoomsView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// This interface defines the structure of the room data we expect from the backend
// It should correspond to the properties of the Room object from livekit-server-sdk
// that we are interested in displaying.
interface RoomInfo {
    name: string;
    sid: string;
    emptyTimeout?: number;
    maxParticipants?: number;
    creationTime?: { seconds: string | number; nanos: number }; // seconds can be a large number (string in JS for full precision from Long)
    turnPassword?: string;
    numParticipants?: number;
    numPublishers?: number;
    activeRecording?: boolean;
    metadata?: string;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ActiveRoomsView: React.FC = () => {
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const defaultAdminIdentity = 'admin-rooms-viewer';

    const fetchActiveRooms = useCallback(async () => {
        if (!backendUrl) {
            setError('Backend URL configuration is missing. Please check VITE_BACKEND_URL in your .env file.');
            console.error("Error: VITE_BACKEND_URL is not defined in environment variables accessible via import.meta.env");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${backendUrl}/api/livekit/rooms`);
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || `Failed to fetch rooms: ${response.statusText}`);
            }
            const data: RoomInfo[] = await response.json();
            setRooms(data);
        } catch (err: any) {
            console.error('Error fetching active rooms:', err);
            setError(err.message || 'An unknown error occurred while fetching rooms.');
            setRooms([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchActiveRooms();
        // const intervalId = setInterval(fetchActiveRooms, 30000); // Optional: Refresh every 30 seconds
        // return () => clearInterval(intervalId);
    }, [fetchActiveRooms]);

    const handleJoinRoomAsAdmin = (roomName: string) => {
        if (!roomName) {
            console.error("Cannot join room: room name is invalid.");
            setError("Invalid room name provided.");
            return;
        }
        console.log(`Admin "${defaultAdminIdentity}" attempting to join room "${roomName}"`);
        navigate(`/room/${encodeURIComponent(roomName)}?identity=${encodeURIComponent(defaultAdminIdentity)}&admin=true`);
    };

    const formatCreationTime = (time?: { seconds: string | number; nanos: number }): string => {
        if (!time || (typeof time.seconds !== 'number' && typeof time.seconds !== 'string')) return 'N/A';
        try {
            // Convert seconds to a number if it's a string (from potential 'Long' serialization)
            const secondsAsNumber = typeof time.seconds === 'string' ? parseInt(time.seconds, 10) : time.seconds;
            if (isNaN(secondsAsNumber)) return 'Invalid Date';
            const date = new Date(secondsAsNumber * 1000);
            return date.toLocaleString();
        } catch (e) {
            console.error("Error formatting date:", e);
            return "Invalid Date";
        }
    };

    if (!backendUrl) {
        return <div className="error-message" style={{ padding: '20px', textAlign: 'center' }}>Configuration error: Backend URL (VITE_BACKEND_URL) is not set in the frontend .env file.</div>;
    }

    return (
        <div className="active-rooms-view admin-view" style={{ padding: '20px', maxWidth: '900px', margin: '20px auto' }}>
            <h2>Active Interview Sessions</h2>
            <button onClick={fetchActiveRooms} disabled={isLoading} style={{ marginBottom: '20px', padding: '10px 15px' }}>
                {isLoading ? 'Refreshing...' : 'Refresh List'}
            </button>
            {error && (
                <p className="error-message">
                    {error}
                    <button onClick={fetchActiveRooms} style={{ marginLeft: '10px', padding: '8px 12px' }}>Retry</button>
                </p>
            )}
            {!isLoading && !error && rooms.length === 0 && (
                <p>No active rooms found at the moment.</p>
            )}
            {!isLoading && !error && rooms.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {rooms.map((room) => (
                        <li key={room.sid} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '8px', background: '#f9f9f9', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ flexGrow: 1, minWidth: '250px' }}>
                                    <h4 style={{ marginTop: 0, marginBottom: '8px', color: '#333' }}>{room.name}</h4>
                                    <small style={{ display: 'block', color: '#555', marginBottom: '3px' }}><strong>SID:</strong> {room.sid}</small>
                                    <small style={{ display: 'block', color: '#555', marginBottom: '3px' }}>
                                        <strong>Participants:</strong> {room.numParticipants !== undefined ? room.numParticipants : 'N/A'}
                                    </small>
                                    <small style={{ display: 'block', color: '#555', marginBottom: '3px' }}>
                                        <strong>Created:</strong> {formatCreationTime(room.creationTime)}
                                    </small>
                                    {room.metadata && <small style={{ display: 'block', color: '#555', fontStyle: 'italic' }}>Metadata: {room.metadata}</small>}
                                </div>
                                <button
                                    onClick={() => handleJoinRoomAsAdmin(room.name)}
                                    style={{
                                        padding: '10px 15px',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.9em',
                                        fontWeight: '500',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Join as Admin
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ActiveRoomsView;
