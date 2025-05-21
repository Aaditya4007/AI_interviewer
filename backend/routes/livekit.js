// // backend/routes/livekit.js
// const express = require('express');
// const { createRoom, generateToken, listActiveRooms } = require('../services/livekitService'); // Added listActiveRooms

// const router = express.Router();
// const AGENT_IDENTITY = 'alex-agent'; // Consistent agent identity

// // POST /api/livekit/create-room
// router.post('/create-room', async (req, res) => {
//     const { roomName, adminIdentity } = req.body;

//     if (!roomName || !adminIdentity) {
//         console.error('Create room request missing roomName or adminIdentity');
//         return res.status(400).json({ error: 'Missing required fields: roomName and adminIdentity' });
//     }

//     console.log(`Received request to create room "${roomName}" for admin "${adminIdentity}"`);

//     try {
//         // 1. Create the LiveKit Room
//         const room = await createRoom(roomName);
//         console.log(`Room "${room.name}" created.`);

//         // 2. Generate token for the Admin user
//         const adminToken = generateToken(room.name, adminIdentity, false, true); // Mark as admin
//         console.log(`Admin token generated for ${adminIdentity}.`);

//         // 3. Generate token for the AI Agent
//         const agentToken = generateToken(room.name, AGENT_IDENTITY, true, false); // Mark as agent
//         console.log(`Agent token generated for ${AGENT_IDENTITY}.`);
//         console.warn(`IMPORTANT: Use this Agent Token for the AI Agent process: ${agentToken}`); // Log for easy copying during setup

//         res.status(200).json({
//             roomName: room.name,
//             adminToken: adminToken,
//             agentToken: agentToken,
//             message: `Room created. Agent token logged on backend.`,
//         });

//     } catch (error) {
//         console.error(`Failed to process create-room request for "${roomName}":`, error);
//         if (error.message && error.message.includes('room already exists')) {
//              return res.status(409).json({ error: `Room "${roomName}" already exists.` });
//         }
//         res.status(500).json({ error: 'Failed to create room or generate tokens.' });
//     }
// });

// // POST /api/livekit/generate-token
// router.post('/generate-token', (req, res) => {
//     const { roomName, participantIdentity, isAdmin } = req.body;

//     if (!roomName || !participantIdentity) {
//          console.error('Generate token request missing roomName or participantIdentity');
//         return res.status(400).json({ error: 'Missing required fields: roomName and participantIdentity' });
//     }

//     if (participantIdentity === AGENT_IDENTITY && !isAdmin) {
//         console.warn(`Attempt to generate token for reserved agent identity "${AGENT_IDENTITY}" by non-admin denied.`);
//         return res.status(403).json({ error: 'Cannot generate token for reserved agent identity.' });
//     }

//     console.log(`Received request to generate token for "${participantIdentity}" in room "${roomName}" (isAdmin: ${!!isAdmin})`);

//     try {
//         const participantToken = generateToken(roomName, participantIdentity, false, !!isAdmin);
//         console.log(`Participant token generated for ${participantIdentity}.`);

//         res.status(200).json({
//             identity: participantIdentity,
//             token: participantToken,
//         });
//     } catch (error) {
//         console.error(`Failed to generate token for "${participantIdentity}" in room "${roomName}":`, error);
//         res.status(500).json({ error: 'Failed to generate participant token.' });
//     }
// });

// // GET /api/livekit/rooms - New route to list active rooms
// router.get('/rooms', async (req, res) => {
//     console.log('Received request to list active rooms from /api/livekit/rooms');
//     try {
//         const rooms = await listActiveRooms();
//         // The 'rooms' variable here is an array of Room objects from the livekit-server-sdk.
//         // Express will serialize this array of objects into a JSON response.
//         res.status(200).json(rooms);
//     } catch (error) {
//         console.error(`Failed to list active rooms:`, error);
//         res.status(500).json({ error: 'Failed to retrieve active rooms.' });
//     }
// });

// module.exports = router;







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
