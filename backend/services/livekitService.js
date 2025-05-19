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











// // backend/services/livekitService.js
// const { RoomServiceClient, AccessToken } = require('livekit-server-sdk');
// require('dotenv').config();

// const apiKey = process.env.LIVEKIT_API_KEY;
// const apiSecret = process.env.LIVEKIT_API_SECRET;
// const rawLivekitWsUrl = process.env.LIVEKIT_URL; // This is your WSS URL from .env

// if (!apiKey || !apiSecret || !rawLivekitWsUrl) {
//     throw new Error('LiveKit API Key, Secret, or Host URL (LIVEKIT_URL) is not defined in .env');
// }

// // Convert WSS URL to HTTPS URL for the RoomServiceClient
// // For example, "wss://my-project.livekit.cloud" becomes "https://my-project.livekit.cloud"
// let httpLivekitUrl;
// if (rawLivekitWsUrl.startsWith('wss://')) {
//     httpLivekitUrl = rawLivekitWsUrl.replace(/^wss:\/\//, 'https://');
// } else if (rawLivekitWsUrl.startsWith('ws://')) {
//     httpLivekitUrl = rawLivekitWsUrl.replace(/^ws:\/\//, 'http://');
// } else {
//     // If it doesn't start with ws/wss, it might already be an http/https URL or an invalid one.
//     // For safety, we'll log a warning if it's not already http/https, but proceed.
//     // Ideally, LIVEKIT_URL in .env should always be the WSS endpoint for consistency with client-side.
//     if (!rawLivekitWsUrl.startsWith('http://') && !rawLivekitWsUrl.startsWith('https://')) {
//         console.warn(`LIVEKIT_URL "${rawLivekitWsUrl}" does not start with ws:// or wss://. Attempting to use as is for RoomServiceClient, but this might be incorrect if it's not an HTTP/S base URL.`);
//     }
//     httpLivekitUrl = rawLivekitWsUrl;
// }

// console.log(`Initializing RoomServiceClient with derived HTTP/S URL: ${httpLivekitUrl}`);
// const roomService = new RoomServiceClient(httpLivekitUrl, apiKey, apiSecret);

// /**
//  * Creates a new LiveKit room.
//  * @param {string} roomName - The desired name for the room.
//  * @returns {Promise<import('livekit-server-sdk').Room>} The created room object.
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
//         console.log(`Room "${roomName}" created successfully.`); // Simplified log
//         return room;
//     } catch (error) {
//         console.error(`Error creating room "${roomName}":`, error.message); // Log error message
//         // Optionally log full error if needed for deeper debugging: console.error(error);
//         throw error;
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
//     });

//     const permissions = {
//         room: roomName,
//         roomJoin: true,
//         canPublish: true,
//         canSubscribe: true,
//         canPublishData: true,
//     };

//     if (isAdmin) {
//         permissions.roomAdmin = true;
//         console.log(`Granting Admin permissions to ${participantIdentity}`);
//     }

//     if (isAgent) {
//         console.log(`Granting Agent-specific base permissions to ${participantIdentity}`);
//     }

//     at.addGrant(permissions);
//     const token = at.toJwt();
//     console.log(`Token generated successfully for ${participantIdentity}`);
//     return token;
// }

// /**
//  * Lists all active LiveKit rooms.
//  * @returns {Promise<import('livekit-server-sdk').Room[]>} A list of active room objects.
//  * @throws Will throw an error if listing rooms fails.
//  */
// async function listActiveRooms() {
//     console.log(`Attempting to list active rooms using roomService.listRooms()`);
//     try {
//         const rooms = await roomService.listRooms();
//         console.log(`Successfully fetched ${rooms.length} active rooms.`);
//         return rooms;
//     } catch (error) {
//         console.error(`Error listing active rooms:`, error.message);
//         throw error;
//     }
// }

// module.exports = {
//     createRoom,
//     generateToken,
//     listActiveRooms,
// };












// C:\Users\User\Desktop\CODE FOLDER\ai-interviewer-meet\backend\services\livekitService.js

const livekitSDK = require('livekit-server-sdk');
const protocol = require('@livekit/protocol'); // Explicitly require @livekit/protocol
require('dotenv').config();

console.log('--- BEGIN SDK & Protocol Load Inspection ---');
if (livekitSDK && typeof livekitSDK === 'object') {
    console.log('livekit-server-sdk main module loaded. Exports:', Object.keys(livekitSDK).sort().join(', '));
} else { console.error('CRITICAL: livekit-server-sdk did not load as an object.'); }
if (protocol && typeof protocol === 'object') {
    console.log('@livekit/protocol module loaded. Exports:', Object.keys(protocol).sort().join(', '));
} else { console.error('CRITICAL: @livekit/protocol did not load as an object.'); }

// Destructure only what's known to be reliable from the main SDK
const { RoomServiceClient, AccessToken, EgressClient } = livekitSDK;

// --- Explicitly resolve Egress-related constructors/enums ---
// Priority: 1. Directly from @livekit/protocol
//           2. Fallback to livekitSDK main export (which has been problematic)

const resolveFromProtocolOrSDK = (name) => {
    if (protocol && typeof protocol[name] !== 'undefined') {
        console.log(`Resolved '${name}' from @livekit/protocol.`);
        return protocol[name];
    }
    if (livekitSDK && typeof livekitSDK[name] !== 'undefined') {
        console.warn(`Resolved '${name}' from livekitSDK (fallback). protocol.${name} was ${typeof protocol[name]}.`);
        return livekitSDK[name];
    }
    console.error(`CRITICAL RESOLUTION FAILURE: '${name}' not found in @livekit/protocol or livekitSDK.`);
    return undefined;
};

const GCPUploadConstructor = resolveFromProtocolOrSDK('GCPUpload');
const SegmentedFileOutputConstructor = resolveFromProtocolOrSDK('SegmentedFileOutput');
const SegmentedFileProtocolEnum = resolveFromProtocolOrSDK('SegmentedFileProtocol');
const EncodingOptionsPresetEnum = resolveFromProtocolOrSDK('EncodingOptionsPreset');
// Add others if needed, e.g.:
// const EncodedFileOutputConstructor = resolveFromProtocolOrSDK('EncodedFileOutput');
// const FileTypeEnum = resolveFromProtocolOrSDK('FileType');

console.log(`GCPUploadConstructor type: ${typeof GCPUploadConstructor}`);
console.log(`SegmentedFileOutputConstructor type: ${typeof SegmentedFileOutputConstructor}`);
console.log(`SegmentedFileProtocolEnum type: ${typeof SegmentedFileProtocolEnum}`);
console.log(`EncodingOptionsPresetEnum type: ${typeof EncodingOptionsPresetEnum}`);
console.log('--- END SDK & Protocol Load Inspection ---');

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const rawLivekitWsUrl = process.env.LIVEKIT_URL;
let gcpCredentialsJsonString = process.env.GCP_RECORDER_CREDENTIALS_JSON;

// --- Config Validation (abbreviated for brevity, keep your full validation) ---
if (!apiKey || !apiSecret || !rawLivekitWsUrl) { throw new Error('LiveKit API Key/Secret/URL missing.'); }
if (!gcpCredentialsJsonString) { console.warn('GCP_RECORDER_CREDENTIALS_JSON missing. Egress disabled.'); }
else {
    try { JSON.parse(gcpCredentialsJsonString); console.log('GCP Credentials parsed.'); }
    catch (e) { console.error('CRITICAL: Failed to parse GCP_RECORDER_CREDENTIALS_JSON.', e.message); gcpCredentialsJsonString = null; }
}
// --- End Config Validation ---

let httpLivekitUrl = rawLivekitWsUrl.startsWith('wss://') ? rawLivekitWsUrl.replace(/^wss:\/\//, 'https://') :
                     rawLivekitWsUrl.startsWith('ws://') ? rawLivekitWsUrl.replace(/^ws:\/\//, 'http://') : rawLivekitWsUrl;

console.log(`Initializing LiveKit Service Clients with URL: ${httpLivekitUrl}`);
const roomService = new RoomServiceClient(httpLivekitUrl, apiKey, apiSecret);
const egressClient = new EgressClient(httpLivekitUrl, apiKey, apiSecret);

async function createRoom(roomName) {
    console.log(`[Room: ${roomName}] Create Room: Process started.`);
    let room;
    try {
        room = await roomService.createRoom({ name: roomName, emptyTimeout: 10 * 60, maxParticipants: 10 });
        console.log(`[Room: ${roomName}] Create Room: LiveKit room entity created.`);
    } catch (error) {
        console.error(`[Room: ${roomName}] Create Room: Failed. Error:`, error.message);
        throw error;
    }

    if (gcpCredentialsJsonString && room) {
        console.log(`[Room: ${roomName}] Egress: GCP credentials present. Attempting recording.`);
        const recordingFolderInBucket = roomName;
        const baseFilenameForRecording = "interview_session";

        if (typeof GCPUploadConstructor !== 'function' || typeof SegmentedFileOutputConstructor !== 'function' || typeof SegmentedFileProtocolEnum !== 'object') {
            console.error(`[Room: ${roomName}] Egress FATAL: Required constructors/enums not valid. GCPUpload: ${typeof GCPUploadConstructor}, SegmentedFileOutput: ${typeof SegmentedFileOutputConstructor}, SegmentedFileProtocol: ${typeof SegmentedFileProtocolEnum}. Recording aborted.`);
            return room;
        }

        let gcpUploadConfig;
        try {
            gcpUploadConfig = new GCPUploadConstructor({ credentials: gcpCredentialsJsonString, bucket: "recording-xpo" });
            console.log(`[Room: ${roomName}] Egress: GCPUpload config created.`);
        } catch (configError) {
            console.error(`[Room: ${roomName}] Egress FATAL: Error instantiating GCPUpload. Error: ${configError.message}`, configError);
            return room;
        }

        let segmentedHLSOutput;
        try {
            segmentedHLSOutput = new SegmentedFileOutputConstructor({ // USE THE RESOLVED CONSTRUCTOR
                filenamePrefix: `${recordingFolderInBucket}/${baseFilenameForRecording}`,
                playlistName: `${recordingFolderInBucket}/${baseFilenameForRecording}_playlist.m3u8`,
                segmentDuration: 5,
                protocol: SegmentedFileProtocolEnum.HLS, // USE THE RESOLVED ENUM
            });
            segmentedHLSOutput.gcp = gcpUploadConfig;
            console.log(`[Room: ${roomName}] Egress: SegmentedFileOutput (HLS) configured. Target: gs://${gcpUploadConfig.bucket}/${segmentedHLSOutput.filenamePrefix}`);
        } catch (outputError) {
            console.error(`[Room: ${roomName}] Egress FATAL: Error instantiating SegmentedFileOutput. Error: ${outputError.message}`, outputError);
            return room;
        }

        const roomCompositeOptions = {
            layout: "speaker-dark", audioOnly: false, videoOnly: false,
            // encodingOptions: EncodingOptionsPresetEnum.H264_720P_30FPS_3_LAYERS, // Example
        };
        console.log(`[Room: ${roomName}] Egress: RoomCompositeOptions. Layout: ${roomCompositeOptions.layout}.`);

        try {
            console.log(`[Room: ${roomName}] Egress: Calling egressClient.startRoomCompositeEgress...`);
            const egressInfo = await egressClient.startRoomCompositeEgress(
                roomName,
                { segments: segmentedHLSOutput },
                roomCompositeOptions
            );
            console.log(`[Room: ${roomName}] Egress SUCCESS: Recording started. ID: ${egressInfo.egressId}, Status: ${egressInfo.status}`);
        } catch (egressError) {
            console.error(`[Room: ${roomName}] Egress FAILED. Error: ${egressError.message}`, egressError);
            if (egressError.response && egressError.response.data) { console.error(`[Room: ${roomName}] Egress API Error Details:`, JSON.stringify(egressError.response.data, null, 2)); }
            else if (egressError.cause) { console.error(`[Room: ${roomName}] Egress Error Cause:`, egressError.cause); }
            else if (egressError.details) { console.error(`[Room: ${roomName}] Egress gRPC Error Details:`, egressError.details); }
        }
    } else if (!gcpCredentialsJsonString && room) {
        console.warn(`[Room: ${roomName}] Egress SKIPPED: GCP credentials missing/invalid.`);
    } else if (!room) {
        console.error(`[Room: ${roomName}] Egress SKIPPED: Room object null.`);
    }
    return room;
}

// --- generateToken and listActiveRooms functions (abbreviated, keep your full versions) ---
function generateToken(roomName, participantIdentity, isAgent = false, isAdmin = false) {
    const at = new AccessToken(apiKey, apiSecret, { identity: participantIdentity });
    const permissions = { room: roomName, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true };
    if (isAdmin) permissions.roomAdmin = true;
    at.addGrant(permissions);
    return at.toJwt();
}
async function listActiveRooms() { return roomService.listRooms(); }
// --- End abbreviated functions ---

module.exports = { createRoom, generateToken, listActiveRooms };
