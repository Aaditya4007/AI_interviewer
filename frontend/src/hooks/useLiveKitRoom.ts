// frontend/src/hooks/useLiveKitRoom.ts
// THIS HOOK IS NOT ACTIVELY USED BY RoomView.tsx anymore, but kept for reference.

import { useEffect, useState, useRef } from 'react';
import {
    Room,
    RoomEvent,
    // Participant, // Removed unused general type
    ConnectionState,
    DisconnectReason,
    RoomOptions,
    LocalParticipant as LkLocalParticipant,
    RemoteParticipant,
} from 'livekit-client';

type LiveKitParticipant = LkLocalParticipant | RemoteParticipant;

interface UseLiveKitRoomProps {
    token: string | null;
    serverUrl: string | undefined;
    connect: boolean;
    options?: RoomOptions;
    onDisconnected?: (reason?: DisconnectReason) => void;
    onError?: (error: Error) => void;
}

interface RoomState {
    room: Room | null;
    connectionState: ConnectionState;
    error: Error | null;
    participants: LiveKitParticipant[];
}

export function useLiveKitRoom({ token, serverUrl, connect, options, onDisconnected, onError }: UseLiveKitRoomProps) {
    const roomRef = useRef<Room | null>(null);
    const [roomState, setRoomState] = useState<RoomState>({
        room: null,
        connectionState: ConnectionState.Disconnected,
        error: null,
        participants: [],
    });

    const updateParticipantsList = () => {
        const currentRoom = roomRef.current;
        // Explicitly check if currentRoom exists and has the expected properties
        if (currentRoom && currentRoom.localParticipant) {
             const localP = currentRoom.localParticipant;
             // Use the public API to get remote participants
             const remotePs = Array.from(currentRoom.remoteParticipants.values());
             const allParticipants = [localP, ...remotePs] as LiveKitParticipant[];
             setRoomState(prev => ({
                 ...prev,
                 participants: allParticipants,
             }));
        } else {
            console.warn("updateParticipantsList skipped: room or participants invalid", currentRoom);
            // Optionally clear participants if room state is inconsistent
            // setRoomState(prev => ({ ...prev, participants: [] }));
        }
    };

    const handleStateChange = (newState: ConnectionState) => {
        console.log('useLiveKitRoom Hook: State ->', newState);
         // Ensure we only update state if the component using the hook is still mounted
         // (Can add isMounted ref pattern if needed, but often state updates are safe)
         setRoomState(prev => ({ ...prev, connectionState: newState }));
          if (newState === ConnectionState.Connected) {
             updateParticipantsList();
         }
    };

    const handleDisconnectCleanup = (reason?: DisconnectReason) => {
         console.log('useLiveKitRoom Hook: Disconnected/Cleanup. Reason:', reason);
         const currentRoom = roomRef.current;
         if (currentRoom) {
             currentRoom.removeAllListeners();
         }
         roomRef.current = null;
         setRoomState({
             room: null,
             connectionState: ConnectionState.Disconnected,
             error: null,
             participants: [],
         });
         if (onDisconnected) onDisconnected(reason);
    };

    useEffect(() => {
        // Connect logic
        if (connect && token && serverUrl && !roomRef.current && roomState.connectionState === ConnectionState.Disconnected) {
            console.log('useLiveKitRoom Hook: Attempting connection...');
            setRoomState(prev => ({ ...prev, error: null, connectionState: ConnectionState.Connecting }));

            const newRoom = new Room(options);
            roomRef.current = newRoom;

            newRoom.on(RoomEvent.ConnectionStateChanged, handleStateChange);
            newRoom.on(RoomEvent.Disconnected, handleDisconnectCleanup);
            newRoom.on(RoomEvent.ParticipantConnected, updateParticipantsList);
            newRoom.on(RoomEvent.ParticipantDisconnected, updateParticipantsList);

            newRoom.connect(serverUrl, token)
                .then(() => {
                    if (roomRef.current === newRoom) { // Check if still the same room instance
                        console.log('useLiveKitRoom Hook: Connection successful.');
                        setRoomState(prev => ({ ...prev, room: newRoom }));
                    } else {
                         console.log('useLiveKitRoom Hook: Connection completed but ref changed, disconnecting.');
                         newRoom.disconnect();
                    }
                })
                .catch((err: Error) => {
                    console.error('useLiveKitRoom Hook: Connection failed:', err);
                    if (onError) onError(err);
                    if (roomRef.current === newRoom) { // Only cleanup if it's the same failed instance
                        handleDisconnectCleanup(DisconnectReason.JOIN_FAILURE);
                    }
                });
        }

        // Disconnect logic
        const roomToDisconnect = roomRef.current; // Capture ref value for the effect instance
        if (!connect && roomToDisconnect && roomToDisconnect.state !== ConnectionState.Disconnected) {
             console.log('useLiveKitRoom Hook: Disconnecting via connect=false...');
             roomToDisconnect.disconnect();
        }

        // Cleanup function
        return () => {
            const roomOnCleanup = roomRef.current;
            // Disconnect only if this effect instance established the connection
            // and it's still connected/connecting. This check is complex.
            // A simpler approach is just to disconnect if it exists on cleanup.
            if (roomOnCleanup && roomOnCleanup.state !== ConnectionState.Disconnected) {
                console.log('useLiveKitRoom Hook: Disconnecting room on cleanup.');
                roomOnCleanup.disconnect(); // handleDisconnectCleanup will clear ref
            }
            // Ensure ref is clear if disconnect didn't run for some reason
            // roomRef.current = null; // handleDisconnectCleanup does this
        };
    }, [connect, token, serverUrl, options, onDisconnected, onError, roomState.connectionState]);

    return roomState;
}
