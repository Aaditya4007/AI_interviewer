// // backend/services/livekitService.js
// const { RoomServiceClient, AccessToken, Room } = require('livekit-server-sdk');
// require('dotenv').config();

// const apiKey = process.env.LIVEKIT_API_KEY;
// const apiSecret = process.env.LIVEKIT_API_SECRET;
// const livekitHost = process.env.LIVEKIT_URL;

// if (!apiKey || !apiSecret || !livekitHost) {
//     throw new Error('LiveKit API Key, Secret, or Host URL is not defined in .env');
// }

// const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);

// /**
//  * Creates a new LiveKit room.
//  * @param {string} roomName - The desired name for the room.
//  * @returns {Promise<Room>} The created room object.
//  * @throws Will throw an error if room creation fails.
//  */
// async function createRoom(roomName) {
//     console.log(`Attempting to create room: ${roomName}`);
//     try {
//         const room = await roomService.createRoom({
//             name: roomName,
//             emptyTimeout: 10 * 60, // 10 minutes
//             maxParticipants: 10,
//         });
//         console.log(`Room "${roomName}" created successfully:`, room);
//         return room;
//     } catch (error) {
//         console.error(`Error creating room "${roomName}":`, error);
//         throw error; // Re-throw the error to be handled by the caller
//     }
// }

// /**
//  * Generates an access token for a participant.
//  * @param {string} roomName - The name of the room to join.
//  * @param {string} participantIdentity - The unique identity of the participant.
//  * @param {boolean} [isAgent=false] - Whether the token is for the AI agent.
//  * @param {boolean} [isAdmin=false] - Whether the token is for an admin participant.
//  * @returns {string} The generated access token.
//  */
// function generateToken(roomName, participantIdentity, isAgent = false, isAdmin = false) {
//     console.log(`Generating token for identity "${participantIdentity}" in room "${roomName}" (Agent: ${isAgent}, Admin: ${isAdmin})`);
//     const at = new AccessToken(apiKey, apiSecret, {
//         identity: participantIdentity,
//         // ttl: '10m', // Optional: Token Time To Live
//     });

//     const permissions = {
//         room: roomName,
//         roomJoin: true,
//         canPublish: true,
//         canSubscribe: true,
//         canPublishData: true, // Needed for admin controls and potential agent data
//     };

//     if (isAdmin) {
//         permissions.roomAdmin = true;
//         // Add any other specific admin permissions if needed
//         console.log(`Granting Admin permissions to ${participantIdentity}`);
//     }

//     if (isAgent) {
//         // Agents might need specific permissions depending on future features
//         console.log(`Granting Agent-specific base permissions to ${participantIdentity}`);
//     }


//     at.addGrant(permissions);

//     const token = at.toJwt();
//     console.log(`Token generated successfully for ${participantIdentity}`);
//     return token;
// }

// module.exports = {
//     createRoom,
//     generateToken,
// };











// backend/services/livekitService.js
const { RoomServiceClient, AccessToken } = require('livekit-server-sdk');
require('dotenv').config();

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const rawLivekitWsUrl = process.env.LIVEKIT_URL; // This is your WSS URL from .env

if (!apiKey || !apiSecret || !rawLivekitWsUrl) {
    throw new Error('LiveKit API Key, Secret, or Host URL (LIVEKIT_URL) is not defined in .env');
}

// Convert WSS URL to HTTPS URL for the RoomServiceClient
// For example, "wss://my-project.livekit.cloud" becomes "https://my-project.livekit.cloud"
let httpLivekitUrl;
if (rawLivekitWsUrl.startsWith('wss://')) {
    httpLivekitUrl = rawLivekitWsUrl.replace(/^wss:\/\//, 'https://');
} else if (rawLivekitWsUrl.startsWith('ws://')) {
    httpLivekitUrl = rawLivekitWsUrl.replace(/^ws:\/\//, 'http://');
} else {
    // If it doesn't start with ws/wss, it might already be an http/https URL or an invalid one.
    // For safety, we'll log a warning if it's not already http/https, but proceed.
    // Ideally, LIVEKIT_URL in .env should always be the WSS endpoint for consistency with client-side.
    if (!rawLivekitWsUrl.startsWith('http://') && !rawLivekitWsUrl.startsWith('https://')) {
        console.warn(`LIVEKIT_URL "${rawLivekitWsUrl}" does not start with ws:// or wss://. Attempting to use as is for RoomServiceClient, but this might be incorrect if it's not an HTTP/S base URL.`);
    }
    httpLivekitUrl = rawLivekitWsUrl;
}

console.log(`Initializing RoomServiceClient with derived HTTP/S URL: ${httpLivekitUrl}`);
const roomService = new RoomServiceClient(httpLivekitUrl, apiKey, apiSecret);

/**
 * Creates a new LiveKit room.
 * @param {string} roomName - The desired name for the room.
 * @returns {Promise<import('livekit-server-sdk').Room>} The created room object.
 * @throws Will throw an error if room creation fails.
 */
async function createRoom(roomName) {
    console.log(`Attempting to create room: ${roomName}`);
    try {
        const room = await roomService.createRoom({
            name: roomName,
            emptyTimeout: 10 * 60, // 10 minutes
            maxParticipants: 10,
        });
        console.log(`Room "${roomName}" created successfully.`); // Simplified log
        return room;
    } catch (error) {
        console.error(`Error creating room "${roomName}":`, error.message); // Log error message
        // Optionally log full error if needed for deeper debugging: console.error(error);
        throw error;
    }
}

/**
 * Generates an access token for a participant.
 * @param {string} roomName - The name of the room to join.
 * @param {string} participantIdentity - The unique identity of the participant.
 * @param {boolean} [isAgent=false] - Whether the token is for the AI agent.
 * @param {boolean} [isAdmin=false] - Whether the token is for an admin participant.
 * @returns {string} The generated access token.
 */
function generateToken(roomName, participantIdentity, isAgent = false, isAdmin = false) {
    console.log(`Generating token for identity "${participantIdentity}" in room "${roomName}" (Agent: ${isAgent}, Admin: ${isAdmin})`);
    const at = new AccessToken(apiKey, apiSecret, {
        identity: participantIdentity,
    });

    const permissions = {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
    };

    if (isAdmin) {
        permissions.roomAdmin = true;
        console.log(`Granting Admin permissions to ${participantIdentity}`);
    }

    if (isAgent) {
        console.log(`Granting Agent-specific base permissions to ${participantIdentity}`);
    }

    at.addGrant(permissions);
    const token = at.toJwt();
    console.log(`Token generated successfully for ${participantIdentity}`);
    return token;
}

/**
 * Lists all active LiveKit rooms.
 * @returns {Promise<import('livekit-server-sdk').Room[]>} A list of active room objects.
 * @throws Will throw an error if listing rooms fails.
 */
async function listActiveRooms() {
    console.log(`Attempting to list active rooms using roomService.listRooms()`);
    try {
        const rooms = await roomService.listRooms();
        console.log(`Successfully fetched ${rooms.length} active rooms.`);
        return rooms;
    } catch (error) {
        console.error(`Error listing active rooms:`, error.message);
        throw error;
    }
}

module.exports = {
    createRoom,
    generateToken,
    listActiveRooms,
};
