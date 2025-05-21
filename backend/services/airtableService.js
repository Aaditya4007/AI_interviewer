// backend/services/airtableService.js
const Airtable = require('airtable');
require('dotenv').config(); // To load AIRTABLE_PAT_BACKEND

// Airtable Constants (IDs from your airtable_description.txt)
const AIRTABLE_BASE_ID = "appgRwS5bf1GRGhBI";
const SUCCESSFUL_CANDIDATES_TABLE_ID = "tbl1RYRfDafP5vO9O";
const INTERVIEW_SESSIONS_TABLE_ID = "tbl2FlhFsZ2JknhaX";

// Field Names (as they appear in Airtable UI, used for formulas)
const FIELD_SC_UNIQUE_ID_NAME = "Unique generated ID";
const FIELD_IS_LIVEKIT_ROOM_SID_NAME = "LiveKitRoomSID";
const FIELD_IS_REQUESTED_ROOM_NAME_NAME = "RequestedRoomName";
const FIELD_IS_CANDIDATE_LINK_NAME = "CandidateLink";
const FIELD_IS_CANDIDATE_ID_TEXT_NAME = "CandidateID_Text";
const FIELD_IS_START_TIME_NAME = "InterviewStartTime";
const FIELD_IS_TRANSCRIPT_NAME = "Transcript";

const AIRTABLE_PAT = process.env.AIRTABLE_PAT_BACKEND;

let isAirtableServiceConfigured = false;
if (AIRTABLE_PAT && AIRTABLE_BASE_ID && SUCCESSFUL_CANDIDATES_TABLE_ID && INTERVIEW_SESSIONS_TABLE_ID) {
    Airtable.configure({ endpointUrl: 'https://api.airtable.com', apiKey: AIRTABLE_PAT });
    isAirtableServiceConfigured = true;
    console.log("[AirtableService] Backend Airtable service configured and ready.");
} else {
    console.error(
        "CRITICAL: Backend Airtable service configuration issue. " +
        `AIRTABLE_PAT_BACKEND: ${AIRTABLE_PAT ? 'SET' : 'MISSING (check .env)'}. ` +
        "Base/Table IDs are hardcoded; ensure they are correct if issues persist."
    );
}
const base = isAirtableServiceConfigured ? Airtable.base(AIRTABLE_BASE_ID) : null;

async function findOrCreateInterviewSessionByLiveKitSID(livekitRoomSID, requestedRoomName, candidateIdToLink, interviewStartTimeISO) {
    const logPrefix = `[AirtableService SID: ${livekitRoomSID}]`;

    if (!base) {
        const errorMsg = `${logPrefix} Airtable service is not properly configured. Cannot process session record.`;
        console.error(errorMsg);
        return { success: false, error: "Airtable service misconfiguration on backend.", created: false, airtableRecordId: null };
    }
    console.log(`${logPrefix} Attempting Find/Create Session. ReqName: ${requestedRoomName}, CandID: ${candidateIdToLink}`);

    try {
        console.log(`${logPrefix} Querying "Interview Session" table for existing record with SID.`);
        const existingSessions = await base(INTERVIEW_SESSIONS_TABLE_ID).select({
            filterByFormula: `{${FIELD_IS_LIVEKIT_ROOM_SID_NAME}} = '${livekitRoomSID}'`, maxRecords: 1
        }).firstPage();

        if (existingSessions && existingSessions.length > 0) {
            const existingRecordId = existingSessions[0].id;
            console.log(`${logPrefix} Found existing "Interview Session" record. Airtable Record ID: ${existingRecordId}`);
            return { success: true, created: false, message: "Existing session found.", airtableRecordId: existingRecordId };
        }

        console.log(`${logPrefix} No existing session for SID. Proceeding to create new one.`);
        let successfulCandidateAirtableRecordId = null;
        if (candidateIdToLink) {
            console.log(`${logPrefix} Querying "Successful Candidates" table for CandidateID_Text: '${candidateIdToLink}'.`);
            const scRecords = await base(SUCCESSFUL_CANDIDATES_TABLE_ID).select({
                filterByFormula: `{${FIELD_SC_UNIQUE_ID_NAME}} = '${candidateIdToLink}'`, maxRecords: 1
            }).firstPage();

            if (scRecords && scRecords.length > 0) {
                successfulCandidateAirtableRecordId = scRecords[0].id;
                console.log(`${logPrefix} Found 'Successful Candidate' (Airtable ID: ${successfulCandidateAirtableRecordId}) for linking.`);
            } else {
                console.warn(`${logPrefix} 'Successful Candidate' with ID '${candidateIdToLink}' not found. Session will be created without this link.`);
            }
        } else {
            console.warn(`${logPrefix} No candidateIdToLink provided. Session will be created without link to 'Successful Candidate'.`);
        }

        const fieldsToCreate = {
            [FIELD_IS_LIVEKIT_ROOM_SID_NAME]: livekitRoomSID,
            [FIELD_IS_REQUESTED_ROOM_NAME_NAME]: requestedRoomName,
            [FIELD_IS_CANDIDATE_ID_TEXT_NAME]: candidateIdToLink || "N/A",
            [FIELD_IS_START_TIME_NAME]: interviewStartTimeISO,
            [FIELD_IS_TRANSCRIPT_NAME]: "" // Initialize transcript
        };
        if (successfulCandidateAirtableRecordId) {
            fieldsToCreate[FIELD_IS_CANDIDATE_LINK_NAME] = [successfulCandidateAirtableRecordId];
        }

        console.log(`${logPrefix} Creating new record in "Interview Session" table with fields:`, JSON.stringify(fieldsToCreate, null, 2));
        const createdRecords = await base(INTERVIEW_SESSIONS_TABLE_ID).create([{ fields: fieldsToCreate }], { typecast: true });

        if (!createdRecords || createdRecords.length === 0) {
            console.error(`${logPrefix} Airtable: Failed to create record in "Interview Session" table (no record returned from Airtable API).`);
            throw new Error("Airtable: Failed to create record (no record returned).");
        }
        
        const newRecordId = createdRecords[0].id;
        console.log(`${logPrefix} Successfully created new "Interview Session" record. Airtable Record ID: ${newRecordId}`);
        return { success: true, created: true, message: "New session created.", airtableRecordId: newRecordId };

    } catch (error) {
        console.error(`${logPrefix} Error during findOrCreateInterviewSession:`, error.message || error, error.stack || '');
        const apiErrorMsg = (error.error && error.statusCode) ? `Airtable API Error (${error.statusCode}): ${error.message}` : error.message;
        return { success: false, error: apiErrorMsg || "Unknown Airtable error.", created: false, airtableRecordId: null };
    }
}
module.exports = { findOrCreateInterviewSessionByLiveKitSID };
