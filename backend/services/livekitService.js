// // C:\Users\User\Desktop\CODE FOLDER\ai-interviewer-meet\backend\services\livekitService.js

// const livekitSDK = require('livekit-server-sdk');
// const protocol = require('@livekit/protocol'); // Explicitly require @livekit/protocol
// require('dotenv').config();

// console.log('--- BEGIN SDK & Protocol Load Inspection ---');
// if (livekitSDK && typeof livekitSDK === 'object') {
//     console.log('livekit-server-sdk main module loaded. Exports:', Object.keys(livekitSDK).sort().join(', '));
// } else { console.error('CRITICAL: livekit-server-sdk did not load as an object.'); }
// if (protocol && typeof protocol === 'object') {
//     console.log('@livekit/protocol module loaded. Exports:', Object.keys(protocol).sort().join(', '));
// } else { console.error('CRITICAL: @livekit/protocol did not load as an object.'); }

// // Destructure only what's known to be reliable from the main SDK
// const { RoomServiceClient, AccessToken, EgressClient } = livekitSDK;

// // --- Explicitly resolve Egress-related constructors/enums ---
// // Priority: 1. Directly from @livekit/protocol
// //           2. Fallback to livekitSDK main export (which has been problematic)

// const resolveFromProtocolOrSDK = (name) => {
//     if (protocol && typeof protocol[name] !== 'undefined') {
//         console.log(`Resolved '${name}' from @livekit/protocol.`);
//         return protocol[name];
//     }
//     if (livekitSDK && typeof livekitSDK[name] !== 'undefined') {
//         console.warn(`Resolved '${name}' from livekitSDK (fallback). protocol.${name} was ${typeof protocol[name]}.`);
//         return livekitSDK[name];
//     }
//     console.error(`CRITICAL RESOLUTION FAILURE: '${name}' not found in @livekit/protocol or livekitSDK.`);
//     return undefined;
// };

// const GCPUploadConstructor = resolveFromProtocolOrSDK('GCPUpload');
// const SegmentedFileOutputConstructor = resolveFromProtocolOrSDK('SegmentedFileOutput');
// const SegmentedFileProtocolEnum = resolveFromProtocolOrSDK('SegmentedFileProtocol');
// const EncodingOptionsPresetEnum = resolveFromProtocolOrSDK('EncodingOptionsPreset');
// // Add others if needed, e.g.:
// // const EncodedFileOutputConstructor = resolveFromProtocolOrSDK('EncodedFileOutput');
// // const FileTypeEnum = resolveFromProtocolOrSDK('FileType');

// console.log(`GCPUploadConstructor type: ${typeof GCPUploadConstructor}`);
// console.log(`SegmentedFileOutputConstructor type: ${typeof SegmentedFileOutputConstructor}`);
// console.log(`SegmentedFileProtocolEnum type: ${typeof SegmentedFileProtocolEnum}`);
// console.log(`EncodingOptionsPresetEnum type: ${typeof EncodingOptionsPresetEnum}`);
// console.log('--- END SDK & Protocol Load Inspection ---');

// const apiKey = process.env.LIVEKIT_API_KEY;
// const apiSecret = process.env.LIVEKIT_API_SECRET;
// const rawLivekitWsUrl = process.env.LIVEKIT_URL;
// let gcpCredentialsJsonString = process.env.GCP_RECORDER_CREDENTIALS_JSON;

// // --- Config Validation (abbreviated for brevity, keep your full validation) ---
// if (!apiKey || !apiSecret || !rawLivekitWsUrl) { throw new Error('LiveKit API Key/Secret/URL missing.'); }
// if (!gcpCredentialsJsonString) { console.warn('GCP_RECORDER_CREDENTIALS_JSON missing. Egress disabled.'); }
// else {
//     try { JSON.parse(gcpCredentialsJsonString); console.log('GCP Credentials parsed.'); }
//     catch (e) { console.error('CRITICAL: Failed to parse GCP_RECORDER_CREDENTIALS_JSON.', e.message); gcpCredentialsJsonString = null; }
// }
// // --- End Config Validation ---

// let httpLivekitUrl = rawLivekitWsUrl.startsWith('wss://') ? rawLivekitWsUrl.replace(/^wss:\/\//, 'https://') :
//                      rawLivekitWsUrl.startsWith('ws://') ? rawLivekitWsUrl.replace(/^ws:\/\//, 'http://') : rawLivekitWsUrl;

// console.log(`Initializing LiveKit Service Clients with URL: ${httpLivekitUrl}`);
// const roomService = new RoomServiceClient(httpLivekitUrl, apiKey, apiSecret);
// const egressClient = new EgressClient(httpLivekitUrl, apiKey, apiSecret);

// async function createRoom(roomName) {
//     console.log(`[Room: ${roomName}] Create Room: Process started.`);
//     let room;
//     try {
//         room = await roomService.createRoom({ name: roomName, emptyTimeout: 10 * 60, maxParticipants: 10 });
//         console.log(`[Room: ${roomName}] Create Room: LiveKit room entity created.`);
//     } catch (error) {
//         console.error(`[Room: ${roomName}] Create Room: Failed. Error:`, error.message);
//         throw error;
//     }

//     if (gcpCredentialsJsonString && room) {
//         console.log(`[Room: ${roomName}] Egress: GCP credentials present. Attempting recording.`);
//         const recordingFolderInBucket = roomName;
//         const baseFilenameForRecording = "interview_session";

//         if (typeof GCPUploadConstructor !== 'function' || typeof SegmentedFileOutputConstructor !== 'function' || typeof SegmentedFileProtocolEnum !== 'object') {
//             console.error(`[Room: ${roomName}] Egress FATAL: Required constructors/enums not valid. GCPUpload: ${typeof GCPUploadConstructor}, SegmentedFileOutput: ${typeof SegmentedFileOutputConstructor}, SegmentedFileProtocol: ${typeof SegmentedFileProtocolEnum}. Recording aborted.`);
//             return room;
//         }

//         let gcpUploadConfig;
//         try {
//             gcpUploadConfig = new GCPUploadConstructor({ credentials: gcpCredentialsJsonString, bucket: "recording-xpo" });
//             console.log(`[Room: ${roomName}] Egress: GCPUpload config created.`);
//         } catch (configError) {
//             console.error(`[Room: ${roomName}] Egress FATAL: Error instantiating GCPUpload. Error: ${configError.message}`, configError);
//             return room;
//         }

//         let segmentedHLSOutput;
//         try {
//             segmentedHLSOutput = new SegmentedFileOutputConstructor({ // USE THE RESOLVED CONSTRUCTOR
//                 filenamePrefix: `${recordingFolderInBucket}/${baseFilenameForRecording}`,
//                 playlistName: `${recordingFolderInBucket}/${baseFilenameForRecording}_playlist.m3u8`,
//                 segmentDuration: 5,
//                 protocol: SegmentedFileProtocolEnum.HLS, // USE THE RESOLVED ENUM
//             });
//             segmentedHLSOutput.gcp = gcpUploadConfig;
//             console.log(`[Room: ${roomName}] Egress: SegmentedFileOutput (HLS) configured. Target: gs://${gcpUploadConfig.bucket}/${segmentedHLSOutput.filenamePrefix}`);
//         } catch (outputError) {
//             console.error(`[Room: ${roomName}] Egress FATAL: Error instantiating SegmentedFileOutput. Error: ${outputError.message}`, outputError);
//             return room;
//         }

//         const roomCompositeOptions = {
//             layout: "speaker-dark", audioOnly: false, videoOnly: false,
//             // encodingOptions: EncodingOptionsPresetEnum.H264_720P_30FPS_3_LAYERS, // Example
//         };
//         console.log(`[Room: ${roomName}] Egress: RoomCompositeOptions. Layout: ${roomCompositeOptions.layout}.`);

//         try {
//             console.log(`[Room: ${roomName}] Egress: Calling egressClient.startRoomCompositeEgress...`);
//             const egressInfo = await egressClient.startRoomCompositeEgress(
//                 roomName,
//                 { segments: segmentedHLSOutput },
//                 roomCompositeOptions
//             );
//             console.log(`[Room: ${roomName}] Egress SUCCESS: Recording started. ID: ${egressInfo.egressId}, Status: ${egressInfo.status}`);
//         } catch (egressError) {
//             console.error(`[Room: ${roomName}] Egress FAILED. Error: ${egressError.message}`, egressError);
//             if (egressError.response && egressError.response.data) { console.error(`[Room: ${roomName}] Egress API Error Details:`, JSON.stringify(egressError.response.data, null, 2)); }
//             else if (egressError.cause) { console.error(`[Room: ${roomName}] Egress Error Cause:`, egressError.cause); }
//             else if (egressError.details) { console.error(`[Room: ${roomName}] Egress gRPC Error Details:`, egressError.details); }
//         }
//     } else if (!gcpCredentialsJsonString && room) {
//         console.warn(`[Room: ${roomName}] Egress SKIPPED: GCP credentials missing/invalid.`);
//     } else if (!room) {
//         console.error(`[Room: ${roomName}] Egress SKIPPED: Room object null.`);
//     }
//     return room;
// }

// // --- generateToken and listActiveRooms functions (abbreviated, keep your full versions) ---
// function generateToken(roomName, participantIdentity, isAgent = false, isAdmin = false) {
//     const at = new AccessToken(apiKey, apiSecret, { identity: participantIdentity });
//     const permissions = { room: roomName, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true };
//     if (isAdmin) permissions.roomAdmin = true;
//     at.addGrant(permissions);
//     return at.toJwt();
// }
// async function listActiveRooms() { return roomService.listRooms(); }
// // --- End abbreviated functions ---

// module.exports = { createRoom, generateToken, listActiveRooms };














// backend/services/livekitService.js
const livekitSDK = require('livekit-server-sdk');
const protocol = require('@livekit/protocol');
const { findOrCreateInterviewSessionByLiveKitSID } = require('./airtableService');
require('dotenv').config();

console.log('--- BEGIN SDK & Protocol Load Inspection ---');
if (livekitSDK && typeof livekitSDK === 'object') console.log('livekit-server-sdk loaded.');
else console.error('CRITICAL: livekit-server-sdk did not load as an object.');
if (protocol && typeof protocol === 'object') console.log('@livekit/protocol loaded.');
else console.error('CRITICAL: @livekit/protocol did not load as an object.');

const { RoomServiceClient, AccessToken, EgressClient } = livekitSDK;

const resolveFromProtocolOrSDK = (name, expectedType = 'function') => {
    let resolvedItem;
    let source = 'unknown';
    if (protocol && typeof protocol[name] !== 'undefined') {
        resolvedItem = protocol[name];
        source = '@livekit/protocol';
    } else if (livekitSDK && typeof livekitSDK[name] !== 'undefined') {
        resolvedItem = livekitSDK[name];
        source = 'livekitSDK (main export)';
    }

    if (resolvedItem !== undefined && typeof resolvedItem === expectedType) {
        console.log(`SUCCESS: Resolved '${name}' from ${source}. Type: ${typeof resolvedItem}.`);
        return resolvedItem;
    } else {
        const actualProtocolType = protocol ? typeof protocol[name] : 'undefined (protocol not loaded)';
        const actualSDKType = livekitSDK ? typeof livekitSDK[name] : 'undefined (SDK not loaded)';
        console.error(`CRITICAL RESOLUTION FAILURE: Could not resolve '${name}' (expected type: ${expectedType}). ` +
                      `Attempted from '@livekit/protocol' (found type: ${actualProtocolType}) and 'livekitSDK' (found type: ${actualSDKType}).`);
        return undefined;
    }
};

const GCPUploadConstructor = resolveFromProtocolOrSDK('GCPUpload');
const EncodedFileOutputConstructor = resolveFromProtocolOrSDK('EncodedFileOutput');
const EncodedFileTypeEnum = resolveFromProtocolOrSDK('EncodedFileType', 'object');
const EncodingOptionsPresetEnum = resolveFromProtocolOrSDK('EncodingOptionsPreset', 'object');
console.log('--- END SDK & Protocol Load Inspection ---');

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const rawLivekitWsUrl = process.env.LIVEKIT_URL;
let gcpCredentialsJsonString = process.env.GCP_RECORDER_CREDENTIALS_JSON;

if (!apiKey || !apiSecret || !rawLivekitWsUrl) throw new Error('CRITICAL: LiveKit Key/Secret/URL missing.');
console.log('[LiveKitService] CONFIG INFO: LiveKit API credentials and URL loaded.');

if (!gcpCredentialsJsonString) console.warn('[LiveKitService] CONFIG WARNING: GCP_RECORDER_CREDENTIALS_JSON missing. Recording disabled.');
else {
    try {
        const parsedCreds = JSON.parse(gcpCredentialsJsonString);
        if (!parsedCreds.project_id) console.warn('[LiveKitService] CONFIG WARNING: Parsed GCP credentials JSON missing project_id.');
        else console.log(`[LiveKitService] GCP Credentials parsed. Project ID: ${parsedCreds.project_id}`);
    } catch (e) {
        console.error('[LiveKitService] CRITICAL CONFIG ERROR: Failed to parse GCP_RECORDER_CREDENTIALS_JSON.', e.message);
        gcpCredentialsJsonString = null;
    }
}

let httpLivekitUrl = rawLivekitWsUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
console.log(`[LiveKitService] Initializing LiveKit Clients with URL: ${httpLivekitUrl}`);
const roomService = new RoomServiceClient(httpLivekitUrl, apiKey, apiSecret);
const egressClient = new EgressClient(httpLivekitUrl, apiKey, apiSecret);

function parseCandidateIdFromRequestedRoomName(roomNameStr) {
    if (!roomNameStr || !roomNameStr.trim()) return null;
    try { return roomNameStr.split('_')[0].trim() || null; }
    catch (e) { console.warn(`[LiveKitService] Parse candidateId error for "${roomNameStr}": ${e.message}`); return null; }
}

async function createOrJoinRoomByRequestedName(requestedRoomName, adminIdentityForToken) {
    const logPrefix = `[LiveKitService Room: "${requestedRoomName}", Admin: "${adminIdentityForToken}"]`;
    console.log(`${logPrefix} Processing Create/Join request.`);
    let livekitRoom;
    try {
        livekitRoom = await roomService.createRoom({ name: requestedRoomName, emptyTimeout: 10 * 60, maxParticipants: 10 });
        console.log(`${logPrefix} LiveKit room processed. Name: "${livekitRoom.name}", SID: "${livekitRoom.sid}"`);
    } catch (error) {
        console.error(`${logPrefix} CRITICAL: LiveKit room creation/retrieval failed:`, error.message);
        throw error;
    }

    const { sid: livekitRoomSID, name: actualLiveKitRoomName } = livekitRoom;
    const airtableLogPrefix = `${logPrefix} [Airtable SID: ${livekitRoomSID}]`;

    try {
        const candidateIdToLink = parseCandidateIdFromRequestedRoomName(actualLiveKitRoomName);
        console.log(`${airtableLogPrefix} Initiating Airtable findOrCreateInterviewSession...`);
        const airtableResult = await findOrCreateInterviewSessionByLiveKitSID(
            livekitRoomSID, actualLiveKitRoomName, candidateIdToLink, new Date().toISOString()
        );
        if (!airtableResult.success) {
            console.warn(`${airtableLogPrefix} Airtable interaction finished with warning/error: ${airtableResult.error}`);
        } else {
            console.log(`${airtableLogPrefix} Airtable session processed successfully. Created: ${airtableResult.created}, Airtable Record ID: ${airtableResult.airtableRecordId}`);
        }
    } catch (e) { 
        console.error(`${airtableLogPrefix} Uncaught exception during Airtable service call: ${e.message}`, e.stack);
    }

    if (gcpCredentialsJsonString && livekitRoom &&
        EncodedFileOutputConstructor && EncodedFileTypeEnum && EncodingOptionsPresetEnum && GCPUploadConstructor) {
        
        const egressLogPrefix = `${logPrefix} [Egress SID: ${livekitRoomSID}]`;
        console.log(`${egressLogPrefix} Attempting MP4 recording.`);

        // --- MODIFIED EGRESS FOLDER AND FILENAME ---
        const sanitizedRequestedRoomName = actualLiveKitRoomName.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const sanitizedLiveKitRoomSID = livekitRoomSID.replace(/[^a-zA-Z0-9_.-]/g, '_');

        // New folder structure: candidateID_timestamp_liveKitRoomSID/
        // This becomes the top-level "folder" in the bucket for this session.
        const uniqueSessionFolderNameAsFilepathPrefix = `${sanitizedRequestedRoomName}_${sanitizedLiveKitRoomSID}`;
        const recordingFilename = `interview_session.mp4`; 
        // The full path for the EgressClient's filepath property
        const fullFilepathInBucket = `${uniqueSessionFolderNameAsFilepathPrefix}/${recordingFilename}`; 
        // --- END OF MODIFICATION ---

        console.log(`${egressLogPrefix} Target recording path in bucket: gs://<your-bucket-name>/${fullFilepathInBucket}`);

        try {
            const gcpUpload = new GCPUploadConstructor({ credentials: gcpCredentialsJsonString, bucket: "recording-xpo" }); // Ensure "recording-xpo" is your bucket
            
            const fileOutput = new EncodedFileOutputConstructor({
                fileType: EncodedFileTypeEnum.MP4, 
                filepath: fullFilepathInBucket, // This now uses the new combined path directly
            });
            fileOutput.gcp = gcpUpload; 
            
            console.log(`${egressLogPrefix} MP4 output configured. Target: gs://${gcpUpload.bucket}/${fullFilepathInBucket}`);

            const roomCompositeOptions = {
                layout: "speaker-dark", 
                encodingOptions: EncodingOptionsPresetEnum.H264_720P_30FPS_3_LAYERS,
            };
            
            await egressClient.startRoomCompositeEgress(actualLiveKitRoomName, { file: fileOutput }, roomCompositeOptions);
            console.log(`${egressLogPrefix} SUCCESS: MP4 recording started for ${fullFilepathInBucket}.`);
        } catch (egressError) {
            console.error(`${egressLogPrefix} MP4 Egress FAILED: ${egressError.message}`, egressError.stack);
            if (egressError.response?.data) console.error(`${egressLogPrefix} [Egress API Error Details]:`, JSON.stringify(egressError.response.data, null, 2));
        }
    } else if (!gcpCredentialsJsonString) {
        console.warn(`${logPrefix} [Egress SID: ${livekitRoomSID}] SKIPPED: GCP credentials missing.`);
    } else if (!livekitRoom) {
         console.error(`${logPrefix} [Egress] SKIPPED: livekitRoom object is null.`);
    }
    else {
        console.warn(`${logPrefix} [Egress SID: ${livekitRoomSID}] SKIPPED: One or more Egress SDK components not loaded. Check startup logs for "CRITICAL RESOLUTION FAILURE".`);
    }
    return livekitRoom;
}

function generateToken(roomNameForGrant, participantIdentity, isAgent = false, isAdmin = false) {
    const logPrefix = `[LiveKitService TokenGen Room: "${roomNameForGrant}", User: "${participantIdentity}"]`;
    console.log(`${logPrefix} Generating token. isAdmin: ${isAdmin}, isAgent: ${isAgent}`);
    const at = new AccessToken(apiKey, apiSecret, { identity: participantIdentity });
    const permissions = { room: roomNameForGrant, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true };
    if (isAdmin) permissions.roomAdmin = true;
    at.addGrant(permissions);
    const token = at.toJwt();
    console.log(`${logPrefix} Token generated successfully.`);
    return token;
}

async function listActiveRooms() {
    console.log("[LiveKitService] Listing active rooms.");
    try {
        const rooms = await roomService.listRooms();
        console.log(`[LiveKitService] Found ${rooms.length} active room(s).`);
        return rooms;
    } catch (error) {
        console.error("[LiveKitService] Failed to list active rooms:", error.message, error.stack);
        throw error;
    }
}

module.exports = { createOrJoinRoomByRequestedName, generateToken, listActiveRooms };
