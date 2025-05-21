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
