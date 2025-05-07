// backend/services/livekitService.js
const { RoomServiceClient, AccessToken, Room } = require('livekit-server-sdk');
require('dotenv').config();

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const livekitHost = process.env.LIVEKIT_URL;

if (!apiKey || !apiSecret || !livekitHost) {
    throw new Error('LiveKit API Key, Secret, or Host URL is not defined in .env');
}

const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);

/**
 * Creates a new LiveKit room.
 * @param {string} roomName - The desired name for the room.
 * @returns {Promise<Room>} The created room object.
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
        console.log(`Room "${roomName}" created successfully:`, room);
        return room;
    } catch (error) {
        console.error(`Error creating room "${roomName}":`, error);
        throw error; // Re-throw the error to be handled by the caller
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
        // ttl: '10m', // Optional: Token Time To Live
    });

    const permissions = {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true, // Needed for admin controls and potential agent data
    };

    if (isAdmin) {
        permissions.roomAdmin = true;
        // Add any other specific admin permissions if needed
        console.log(`Granting Admin permissions to ${participantIdentity}`);
    }

    if (isAgent) {
        // Agents might need specific permissions depending on future features
        console.log(`Granting Agent-specific base permissions to ${participantIdentity}`);
    }


    at.addGrant(permissions);

    const token = at.toJwt();
    console.log(`Token generated successfully for ${participantIdentity}`);
    return token;
}

module.exports = {
    createRoom,
    generateToken,
};
