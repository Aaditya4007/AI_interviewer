// backend/routes/livekit.js
const express = require('express');
const { createOrJoinRoomByRequestedName, generateToken, listActiveRooms } = require('../services/livekitService');
const router = express.Router();
const AGENT_TOKEN_IDENTITY = process.env.AGENT_IDENTITY || 'alex-agent';

router.post('/create-room', async (req, res) => {
    const { roomName: requestedRoomName, adminIdentity } = req.body;
    const logPrefix = `[API /create-room Room: "${requestedRoomName}", Admin: "${adminIdentity}"]`;

    if (!requestedRoomName || !adminIdentity) {
        console.error(`${logPrefix} Request missing required fields. Body:`, req.body);
        return res.status(400).json({ error: 'Missing required fields: roomName (requested) and adminIdentity' });
    }
    console.log(`${logPrefix} Processing request.`);
    try {
        const livekitRoom = await createOrJoinRoomByRequestedName(requestedRoomName, adminIdentity);
        console.log(`${logPrefix} LiveKit room processed. Name: "${livekitRoom.name}", SID: "${livekitRoom.sid}"`);

        const adminUserToken = generateToken(livekitRoom.name, adminIdentity, false, true);
        console.log(`${logPrefix} Admin/Initiator token generated for: ${adminIdentity}`);
        
        const agentToken = generateToken(livekitRoom.name, AGENT_TOKEN_IDENTITY, true, false);
        // Removed logging of the full agentToken for security.
        console.log(`${logPrefix} Agent token generated for identity: "${AGENT_TOKEN_IDENTITY}".`); 

        res.status(200).json({
            roomName: livekitRoom.name,
            livekitRoomSid: livekitRoom.sid,
            adminToken: adminUserToken,
            agentToken: agentToken, // Agent token is still sent in the response
            message: `Room processed. SID: ${livekitRoom.sid}. Tokens generated. Airtable interaction logged by service.`
        });
    } catch (error) {
        console.error(`${logPrefix} Failed to process request:`, error.message, error.stack);
        res.status(500).json({ error: 'Server error: Failed to process room or generate tokens.' });
    }
});

router.post('/generate-token', (req, res) => {
    const { roomName, participantIdentity, isAdmin } = req.body;
    const logPrefix = `[API /generate-token Room: "${roomName}", User: "${participantIdentity}"]`;

    if (!roomName || !participantIdentity) {
        console.error(`${logPrefix} Request missing required fields. Body:`, req.body);
        return res.status(400).json({ error: 'Missing fields' });
    }
    if (participantIdentity === AGENT_TOKEN_IDENTITY && !isAdmin) {
        console.warn(`${logPrefix} Attempt to generate token for reserved agent identity by non-admin denied.`);
        return res.status(403).json({ error: 'Agent token restricted.' });
    }
    console.log(`${logPrefix} Request to generate token. isAdmin: ${!!isAdmin}`);
    try {
        const token = generateToken(roomName, participantIdentity, false, !!isAdmin);
        console.log(`${logPrefix} Token generated successfully.`);
        res.status(200).json({ identity: participantIdentity, token: token });
    } catch (error) {
        console.error(`${logPrefix} Failed to generate token:`, error.message, error.stack);
        res.status(500).json({ error: 'Server error: Failed to generate token.' });
    }
});

router.get('/rooms', async (req, res) => {
    const logPrefix = "[API /rooms]";
    console.log(`${logPrefix} Request to list active rooms.`);
    try {
        const activeRooms = await listActiveRooms();
        console.log(`${logPrefix} Found ${activeRooms.length} active room(s).`);
        res.status(200).json(activeRooms);
    } catch (error) {
        console.error(`${logPrefix} Failed to list rooms:`, error.message, error.stack);
        res.status(500).json({ error: 'Server error: Failed to retrieve rooms.' });
    }
});
module.exports = router;
