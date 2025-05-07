// backend/routes/livekit.js
const express = require('express');
const { createRoom, generateToken } = require('../services/livekitService');

const router = express.Router();
const AGENT_IDENTITY = 'alex-agent'; // Consistent agent identity

// POST /api/livekit/create-room
router.post('/create-room', async (req, res) => {
    const { roomName, adminIdentity } = req.body;

    if (!roomName || !adminIdentity) {
        console.error('Create room request missing roomName or adminIdentity');
        return res.status(400).json({ error: 'Missing required fields: roomName and adminIdentity' });
    }

    console.log(`Received request to create room "${roomName}" for admin "${adminIdentity}"`);

    try {
        // 1. Create the LiveKit Room
        const room = await createRoom(roomName);
        console.log(`Room "${room.name}" created.`);

        // 2. Generate token for the Admin user
        const adminToken = generateToken(room.name, adminIdentity, false, true); // Mark as admin
        console.log(`Admin token generated for ${adminIdentity}.`);

        // 3. Generate token for the AI Agent
        const agentToken = generateToken(room.name, AGENT_IDENTITY, true, false); // Mark as agent
        console.log(`Agent token generated for ${AGENT_IDENTITY}.`);
        console.warn(`IMPORTANT: Use this Agent Token for the AI Agent process: ${agentToken}`); // Log for easy copying during setup

        res.status(200).json({
            roomName: room.name,
            adminToken: adminToken,
            agentToken: agentToken, // Send agent token back - useful if agent is started dynamically
            message: `Room created. Agent token logged on backend.`,
        });

    } catch (error) {
        console.error(`Failed to process create-room request for "${roomName}":`, error);
        // Check for specific errors if needed, e.g., room already exists
        if (error.message && error.message.includes('room already exists')) {
             return res.status(409).json({ error: `Room "${roomName}" already exists.` });
        }
        res.status(500).json({ error: 'Failed to create room or generate tokens.' });
    }
});

// POST /api/livekit/generate-token
router.post('/generate-token', (req, res) => {
    const { roomName, participantIdentity } = req.body;

    if (!roomName || !participantIdentity) {
         console.error('Generate token request missing roomName or participantIdentity');
        return res.status(400).json({ error: 'Missing required fields: roomName and participantIdentity' });
    }

    // Basic check to prevent easily forging agent/admin identity via this endpoint
    if (participantIdentity === AGENT_IDENTITY) {
        console.warn(`Attempt to generate token for reserved agent identity "${AGENT_IDENTITY}" denied.`);
        return res.status(403).json({ error: 'Cannot generate token for reserved agent identity.' });
    }
    // In a real app, you'd have proper authentication/authorization here
    // For simplicity, we assume any non-agent identity is a regular participant.

    console.log(`Received request to generate token for "${participantIdentity}" in room "${roomName}"`);

    try {
        // Generate token for a regular participant (not admin, not agent)
        const participantToken = generateToken(roomName, participantIdentity, false, false);
        console.log(`Participant token generated for ${participantIdentity}.`);

        res.status(200).json({
            identity: participantIdentity,
            token: participantToken,
        });
    } catch (error) {
        console.error(`Failed to generate token for "${participantIdentity}" in room "${roomName}":`, error);
        res.status(500).json({ error: 'Failed to generate participant token.' });
    }
});


module.exports = router;
