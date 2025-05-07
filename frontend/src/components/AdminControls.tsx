// frontend/src/components/AdminControls.tsx
import React, { useState, useCallback } from 'react';
// Removed DataPacket_Kind as it's not directly used with DataPublishOptions workaround
import { LocalParticipant, DataPublishOptions } from 'livekit-client';
import { useRemoteParticipant } from '@livekit/components-react';

interface AdminControlsProps {
    localParticipant: LocalParticipant;
}

const AGENT_IDENTITY = 'alex-agent';

const AdminControls: React.FC<AdminControlsProps> = ({ localParticipant }) => {
    const [isAgentMutedCommandSent, setIsAgentMutedCommandSent] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const agentParticipant = useRemoteParticipant(AGENT_IDENTITY);

    const handleMuteToggle = useCallback(async () => {
        if (!agentParticipant || isSending || !localParticipant) {
             console.log("Mute toggle skipped: Agent/local participant missing or sending.");
             return;
        }

        const command = !isAgentMutedCommandSent;
        setIsSending(true);
        console.log(`Admin requesting to ${command ? 'MUTE' : 'UNMUTE'} agent "${AGENT_IDENTITY}"`);

        const payload = { type: 'agent_command', command: 'set_mute', value: command };
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(payload));

        try {
            const options: DataPublishOptions = {
                // kind defaults to RELIABLE
                destinationIdentities: [AGENT_IDENTITY],
            };
            await localParticipant.publishData(data, options);

            console.log(`Mute command (${command}) sent successfully to agent "${AGENT_IDENTITY}".`);
            setIsAgentMutedCommandSent(command);
        } catch (error) {
            console.error(`Failed to send mute command to agent "${AGENT_IDENTITY}":`, error);
        } finally {
             setIsSending(false);
        }

    }, [localParticipant, agentParticipant, isAgentMutedCommandSent, isSending]);

    if (!agentParticipant) {
        return (
            <div className="admin-controls">
                <h4>Admin Controls</h4>
                <p style={{fontStyle: 'italic', color: '#666'}}>Waiting for AI Agent ("{AGENT_IDENTITY}") to join...</p>
            </div>
        );
    }

    return (
        <div className="admin-controls">
            <h4>Admin Controls</h4>
            <label>
                <input
                    type="checkbox"
                    checked={isAgentMutedCommandSent}
                    onChange={handleMuteToggle}
                    disabled={isSending}
                />
                <span>{isAgentMutedCommandSent ? 'Unmute' : 'Mute'} AI Agent ("{AGENT_IDENTITY}")</span>
            </label>
             {isSending && <span style={{ marginLeft: '10px', fontStyle: 'italic', color: '#555' }}>Sending...</span>}
        </div>
    );
};

export default AdminControls;
