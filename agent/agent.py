import asyncio
import os
import logging
from dotenv import load_dotenv
from pyairtable import Api # Ensure: pip install pyairtable

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions, JobContext
from livekit.plugins import (
    openai,
    cartesia,
    deepgram,
    noise_cancellation,
    silero, 
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel 

from datetime import datetime
import json
from typing import Optional, Tuple

load_dotenv()

# --- Airtable Configuration ---
AIRTABLE_PAT = os.getenv("AIRTABLE_PAT")
AIRTABLE_BASE_ID = "appgRwS5bf1GRGhBI"
SUCCESSFUL_CANDIDATES_TABLE_ID = "tbl1RYRfDafP5vO9O"
FIELD_SC_UNIQUE_ID_NAME = "Unique generated ID"
FIELD_SC_JD_LOOKUP_NAME = "JD in Text (from Applied Position)"
INTERVIEW_SESSIONS_TABLE_ID = "tbl2FlhFsZ2JknhaX"
FIELD_IS_LIVEKIT_ROOM_SID_NAME = "LiveKitRoomSID"
FIELD_IS_TRANSCRIPT_NAME = "Transcript"
FIELD_IS_INTERVIEW_END_TIME_NAME = "InterviewEndTime"
AIRTABLE_API_TIMEOUT = 30

# --- Other Environment Variables ---
OPENAI_MODEL_NAME = os.getenv("OPENAI_MODEL_NAME", "gpt-4o")
OPENAI_TTS_MODEL = os.getenv("OPENAI_TTS_MODEL", "tts-1")
OPENAI_TTS_VOICE = os.getenv("OPENAI_TTS_VOICE", "alloy")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

def parse_candidate_id_from_room_name(room_name_str: Optional[str]) -> Tuple[str, Optional[str]]:
    default_candidate_id = "unknown_candidate_id_for_jd"
    if not room_name_str or not room_name_str.strip():
        logger.warning("Room name (for parsing Candidate ID for JD) is None or empty.")
        return default_candidate_id, None
    try:
        parts = room_name_str.rsplit('_', 1)
        candidate_id = parts[0].strip()
        timestamp_str = parts[1].strip() if len(parts) > 1 and parts[1].strip().isdigit() else None
        if not candidate_id:
            logger.warning(f"Parsed empty Candidate ID part from '{room_name_str}'. Using full name for JD.")
            return room_name_str.strip(), None
        logger.info(f"Parsed Candidate ID '{candidate_id}' (Timestamp: {timestamp_str or 'N/A'}) from '{room_name_str}' for JD.")
        return candidate_id, timestamp_str
    except Exception as e:
        logger.error(f"Exception parsing room name '{room_name_str}' for JD: {e}. Using default for JD.", exc_info=True)
        return default_candidate_id, None

async def fetch_jd_from_airtable(candidate_id_for_jd: str) -> str:
    default_jd_text = "Job Description not available for this session. Please proceed with general technical questions about relevant software development topics."
    if candidate_id_for_jd == "unknown_candidate_id_for_jd":
        logger.warning("Cannot fetch JD for 'unknown_candidate_id_for_jd'. Returning default JD text.")
        return default_jd_text
    if not AIRTABLE_PAT:
        logger.error("CRITICAL: Agent's AIRTABLE_PAT environment variable is not set. Cannot fetch JD.")
        return default_jd_text

    logger.info(f"Attempting to fetch JD from 'Successful Candidates' table (ID: {SUCCESSFUL_CANDIDATES_TABLE_ID}) for Candidate ID: {candidate_id_for_jd}")
    api = Api(AIRTABLE_PAT, timeout=AIRTABLE_API_TIMEOUT)
    jd_to_return = default_jd_text
    try:
        sc_table = api.table(AIRTABLE_BASE_ID, SUCCESSFUL_CANDIDATES_TABLE_ID)
        formula = f"{{{FIELD_SC_UNIQUE_ID_NAME}}} = '{candidate_id_for_jd}'"
        logger.info(f"Using Airtable formula for JD fetch: {formula}")
        candidate_records = await asyncio.get_event_loop().run_in_executor(
            None, lambda: sc_table.all(formula=formula, max_records=1)
        )
        if candidate_records:
            candidate_record = candidate_records[0]
            candidate_fields = candidate_record.get('fields', {})
            raw_jd_lookup_value = candidate_fields.get(FIELD_SC_JD_LOOKUP_NAME)
            if raw_jd_lookup_value and isinstance(raw_jd_lookup_value, list) and len(raw_jd_lookup_value) > 0:
                extracted_jd = raw_jd_lookup_value[0]
                if isinstance(extracted_jd, str) and extracted_jd.strip():
                    jd_to_return = extracted_jd.strip()
                    logger.info(f"Successfully fetched JD for Candidate ID '{candidate_id_for_jd}'.")
                else:
                    logger.warning(f"JD lookup field for Candidate ID '{candidate_id_for_jd}' empty/invalid. Type: {type(extracted_jd)}")
            else:
                logger.warning(f"JD lookup field '{FIELD_SC_JD_LOOKUP_NAME}' empty/not found for Candidate ID '{candidate_id_for_jd}'. Value: {raw_jd_lookup_value}")
        else:
            logger.warning(f"No candidate record found in 'Successful Candidates' for Candidate ID: '{candidate_id_for_jd}'.")
    except Exception as e:
        logger.error(f"Error fetching JD for Candidate ID '{candidate_id_for_jd}': {e}", exc_info=True)
    if jd_to_return == default_jd_text:
        logger.info(f"Returning DEFAULT JD TEXT for Candidate ID '{candidate_id_for_jd}'.")
    return jd_to_return

async def update_interview_session_on_shutdown(livekit_room_sid: str, new_transcript_segment: str, interview_end_time_iso: str) -> bool:
    logger.info(f"Attempting to update Airtable 'Interview Session' (ID: {INTERVIEW_SESSIONS_TABLE_ID}) for LiveKitRoomSID: {livekit_room_sid}")
    if not AIRTABLE_PAT:
        logger.error("CRITICAL: Agent's AIRTABLE_PAT not set. Cannot update 'Interview Session'.")
        return False
    api = Api(AIRTABLE_PAT, timeout=AIRTABLE_API_TIMEOUT)
    try:
        interview_sessions_table = api.table(AIRTABLE_BASE_ID, INTERVIEW_SESSIONS_TABLE_ID)
        session_filter_formula = f"{{{FIELD_IS_LIVEKIT_ROOM_SID_NAME}}} = '{livekit_room_sid}'"
        logger.info(f"Fetching 'Interview Session' record using formula: {session_filter_formula}")
        session_records = await asyncio.get_event_loop().run_in_executor(None,
            lambda: interview_sessions_table.all(formula=session_filter_formula, max_records=1)
        )
        if not session_records:
            logger.warning(f"No 'Interview Session' record found for LiveKitRoomSID: '{livekit_room_sid}'. Cannot update Airtable.")
            return False

        session_record_airtable_id = session_records[0]['id']
        logger.info(f"Found 'Interview Session' record (Airtable ID: {session_record_airtable_id}) for LiveKitRoomSID '{livekit_room_sid}'.")
        current_transcript = session_records[0].get('fields', {}).get(FIELD_IS_TRANSCRIPT_NAME, "")
        updated_transcript_content = current_transcript
        made_transcript_change = False

        is_valid_segment = new_transcript_segment and \
                           new_transcript_segment.strip() and \
                           "not as expected" not in new_transcript_segment and \
                           "No conversational items" not in new_transcript_segment and \
                           "No conversational dialogue" not in new_transcript_segment
        
        if is_valid_segment:
            time_now_formatted = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
            segment_header = f"\n\n--- (Segment Appended by Agent at {time_now_formatted}) ---\n"
            if updated_transcript_content and updated_transcript_content.strip():
                updated_transcript_content += segment_header + new_transcript_segment
            else: 
                updated_transcript_content = new_transcript_segment
            made_transcript_change = True
            logger.info(f"Transcript segment will be appended/set for LiveKitRoomSID '{livekit_room_sid}'.")
        else:
            logger.info(f"No valid new transcript segment to append for LiveKitRoomSID '{livekit_room_sid}'.")

        fields_to_update = { FIELD_IS_INTERVIEW_END_TIME_NAME: interview_end_time_iso }
        if made_transcript_change:
            fields_to_update[FIELD_IS_TRANSCRIPT_NAME] = updated_transcript_content

        await asyncio.get_event_loop().run_in_executor(None,
            lambda: interview_sessions_table.update(session_record_airtable_id, fields_to_update, typecast=True)
        )
        logger.info(f"Successfully updated Airtable 'Interview Session' for LiveKitRoomSID: '{livekit_room_sid}'.")
        return True
    except Exception as e:
        logger.error(f"Error updating Airtable 'Interview Session' for LiveKitRoomSID '{livekit_room_sid}': {e}", exc_info=True)
        return False

def format_transcript_from_history(history_dict: dict) -> str:
    formatted_lines = []
    if not history_dict or not isinstance(history_dict.get('items'), list):
        logger.warning(f"Session history format unexpected or 'items' key missing. History: {history_dict}")
        return "Session history format is not as expected or items are missing."
    conversation_items = history_dict.get('items', [])
    if not conversation_items:
        logger.info("No items in session history to format for transcript.")
        return "No conversational items found in session history."
    for item in conversation_items:
        if not isinstance(item, dict) or item.get('type') != 'message':
            continue
        role = item.get('role')
        content_list = item.get('content', [])
        if not isinstance(content_list, list):
            logger.debug(f"Content for role '{role}' is not a list, skipping: {content_list}")
            continue
        text_content = " ".join(str(c_part) for c_part in content_list if isinstance(c_part, (str, int, float))).strip()
        if not text_content: 
            continue
        speaker = "Alex (AI Interviewer)" if role == 'assistant' else "Candidate" if role == 'user' else None
        if speaker:
            formatted_lines.append(f"{speaker}: {text_content}")
        else:
            logger.debug(f"Unhandled role in history formatting: {role} - Content: {text_content}")
    if not formatted_lines:
        logger.info("No user/assistant messages found in history to format for transcript.")
        return "No conversational dialogue found in session history."
    return "\n".join(formatted_lines)

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions="This default instruction is overridden at runtime by dynamic_llm_instructions.")

async def entrypoint(ctx: JobContext):
    agent_session_instance: Optional[AgentSession] = None
    livekit_sid_for_airtable_update: Optional[str] = None
    requested_room_name_for_jd_parsing: str = "unknown_room_name_at_connect_time"

    async def shutdown_operations_callback():
        nonlocal livekit_sid_for_airtable_update, agent_session_instance, requested_room_name_for_jd_parsing
        logger.info("Agent shutdown callback initiated.")
        if not agent_session_instance:
            logger.error("AgentSession (agent_session_instance) not available during shutdown. Cannot process transcript.")
            return

        current_time_obj = datetime.now()
        interview_end_time_iso_str = current_time_obj.isoformat()
        timestamp_for_filename = current_time_obj.strftime("%Y%m%d_%H%M%S")

        sid_for_filename = "UnknownSID"
        if livekit_sid_for_airtable_update and isinstance(livekit_sid_for_airtable_update, str):
             sid_for_filename = livekit_sid_for_airtable_update.replace(':', '_').replace('/', '_')
        
        filename_base_part = f"SID_{sid_for_filename}" if livekit_sid_for_airtable_update else \
                             f"RoomName_{requested_room_name_for_jd_parsing.replace(' ', '_').replace('/', '_')}_NoSID_Error"
        
        transcript_backup_dir = "/tmp/ai_interviewer_transcripts"
        try:
            if not os.path.exists(transcript_backup_dir):
                os.makedirs(transcript_backup_dir, exist_ok=True)
        except OSError as e:
            logger.error(f"Could not create transcript backup directory '{transcript_backup_dir}': {e}.", exc_info=True)

        local_json_transcript_filename = os.path.join(transcript_backup_dir, f"transcript_{filename_base_part}_{timestamp_for_filename}.json")
        history_dict = None
        try:
            history_dict = agent_session_instance.history.to_dict()
            with open(local_json_transcript_filename, 'w') as f:
                json.dump(history_dict, f, indent=2)
            logger.info(f"Local JSON transcript backup saved to: {local_json_transcript_filename}")
        except Exception as e:
            logger.error(f"Failed to write local JSON transcript to {local_json_transcript_filename}: {e}", exc_info=True)

        if not livekit_sid_for_airtable_update: 
            logger.error("LiveKit Room SID was not available (None or not a string) at shutdown. Cannot update Airtable 'Interview Session'.")
            return

        # Ensure SID is a string before passing to Airtable update function
        sid_to_update = str(livekit_sid_for_airtable_update)

        if history_dict:
            formatted_transcript_segment = format_transcript_from_history(history_dict)
            logger.info(f"Formatted transcript segment obtained for Airtable 'Interview Session' (LiveKit SID: {sid_to_update}).")
            await update_interview_session_on_shutdown(sid_to_update, formatted_transcript_segment, interview_end_time_iso_str)
        else:
            logger.warning(f"Session history_dict not available for SID '{sid_to_update}'. Updating end time only.")
            await update_interview_session_on_shutdown(sid_to_update, "", interview_end_time_iso_str)

    ctx.add_shutdown_callback(shutdown_operations_callback)
    await ctx.connect()
    logger.info("Agent successfully connected to LiveKit room.")

    if ctx.room:
        try:
            # ***** CORRECTED SID RETRIEVAL *****
            # livekit.rtc.Room.sid is an async property, access it with await.
            livekit_sid_for_airtable_update = await ctx.room.sid 
            # ***********************************
            logger.info(f"Successfully retrieved LiveKit Room SID: {livekit_sid_for_airtable_update}")
        except Exception as e:
            logger.error(f"Failed to retrieve room.sid: {e}", exc_info=True)
            livekit_sid_for_airtable_update = None 
            
        requested_room_name_for_jd_parsing = ctx.room.name.strip() if ctx.room.name else "unknown_room_name_from_livekit_ctx"
        logger.info(f"Agent Session Details - Room Name (for JD): '{requested_room_name_for_jd_parsing}', LiveKit SID (for Airtable): '{livekit_sid_for_airtable_update}'")
    else:
        logger.error("CRITICAL: ctx.room is None after connect. Cannot get SID or Name.")

    base_candidate_id_for_jd, _ = parse_candidate_id_from_room_name(requested_room_name_for_jd_parsing)
    jd_text_for_llm = await fetch_jd_from_airtable(base_candidate_id_for_jd)
    logger.info(f"Job Description for LLM (Candidate ID: {base_candidate_id_for_jd}, Length: {len(jd_text_for_llm)}): '{jd_text_for_llm[:300]}...'")

    dynamic_llm_instructions = f"""You are 'Alex', an expert AI interviewer.
Your PRIMARY OBJECTIVE is to evaluate a candidate against the SPECIFIC requirements in the Job Description below.
You will ask questions ONE AT A TIME and wait for a response.

--- START OF CRITICAL JOB DESCRIPTION FOR THIS INTERVIEW ---
{jd_text_for_llm}
--- END OF CRITICAL JOB DESCRIPTION FOR THIS INTERVIEW ---

YOUR IMMEDIATE TASK:
You will ask questions ONE AT A TIME and wait for a response.
1.  Analyze the 'CRITICAL JOB DESCRIPTION' to identify the likely position title.
2.  Formulate your GREETING.
3.  Identify ONE foundational, concept-based question based on a core "Primary Skill" or "must-have" technical skill from the Job Description.
4.  SPEAK ONLY your greeting, state the role, check readiness, and then ask ONLY THIS ONE first foundational question. Do NOT list other questions or future steps.

Example of how to start (adapt the role based on the JD):
"Hello, I'm Alex, your interviewer today. I'll interview for a role related to [identified position title/summary from JD]. This technical session will focus on the skills in that job description. Are you ready to begin?"
(Wait for "yes")
You will ask questions ONE AT A TIME and wait for a response.
"Great. Let's start with a foundational question. Based on the job description's emphasis on [Primary Skill from JD], could you explain [concept related to that primary skill]?"

DO NOT reveal the rest of the interview structure or your other planned questions in this first turn.
You will ask questions ONE AT A TIME and wait for a response.
Wait for the candidate's response to this single question.
Future questions will cover medium and challenging topics, also derived from the JD, and you will ask follow-ups if needed. For now, just ask the first foundational question after your greeting.
Avoid any special formatting characters in your spoken output.

IF A CANDIDATE'S ANSWER IS INCOMPLETE, UNCLEAR, OR NOT SUFFICIENTLY DETAILED:
You MUST ask ONE or TWO targeted follow-up questions to probe deeper into their understanding of THAT specific concept or skill from the JD.
Your follow-up should aim to elicit more detail, clarify their reasoning, or test the practical application of their stated knowledge.
Example of a follow-up: "Could you elaborate on that?" or "Can you give me a specific example of how you've applied that concept mentioned in the JD?" or "What challenges might you anticipate with that approach in the context of [relevant aspect from JD]?"
Only after you are satisfied with their response (or have exhausted follow-ups for that point) should you move to the next distinct question.

HANDLING CANDIDATE QUESTIONS ABOUT THE JOB DESCRIPTION:
If the candidate asks you to "tell me more about the job description," or similar questions requesting details from the JD, you SHOULD provide a concise summary or answer their specific query using the information from the 'CRITICAL JOB DESCRIPTION FOR THIS INTERVIEW' section. Do NOT say you don't have access. You DO have access. After answering, gently guide the conversation back to your interview questions.

INTERVIEW STAGES (IN INCREASING ORDER OF DIFFICULTY):

1.  Greeting and Readiness:
    Analyze the 'CRITICAL JOB DESCRIPTION' to identify the position title or main role.
    You will ask questions ONE AT A TIME and wait for a response.
    Start with: "Hello, I'm Alex, your interviewer today. It looks like we're discussing a role related to [mention the identified position title/summary from JD, e.g., 'a Senior PHP Developer position']. This technical session will focus on the technical skills and concepts outlined in that job description. Are you ready to begin?"
    Wait for an affirmative response. Speak naturally, without special characters or formatting. If no clear title is present, say "a software development role focusing on the skills in this description." You will ask questions ONE AT A TIME and wait for a response.
    After they confirm readiness, say: "Great. We'll start with some foundational questions based on the job description, then gradually move to more complex topics."

2.  Stage 1: Foundational Concept-Based Questions (from JD's "Primary" or "Must-Have" Skills):
    You will ask questions ONE AT A TIME and wait for a response.
    Goal: Assess basic understanding of core concepts.
    Identify 2-3 core "Primary Skills" or "must-have" technical skills explicitly listed in the 'CRITICAL JOB DESCRIPTION FOR THIS INTERVIEW'.
    For each of these identified skills, formulate ONE foundational, concept-based question. This question should be designed to assess the candidate's basic understanding of a core concept related to that specific skill as it's described or implied in the JD.
    Apply the follow-up question strategy if answers are insufficient.

3.  Stage 2: Medium-Level Concept-Based Questions (from JD's "Secondary Skills" or "Key Responsibilities"):
    You will ask questions ONE AT A TIME and wait for a response.
    Goal: Assess deeper understanding and ability to compare or relate concepts.
    After completing Stage 1, announce: "Okay, let's move on to some more detailed questions."
    Transition to questions based on "Secondary Skills" or technical skills implied by the "Key Responsibilities" section in the Job Description.
    Formulate 2-3 concept-based questions that require a deeper understanding or ask for comparisons of approaches relevant to those skills from the JD.
    Apply the follow-up question strategy if answers are insufficient.

4.  Stage 3: Challenging Scenario/Concept Questions (from complex aspects of JD):
    You will ask questions ONE AT A TIME and wait for a response.
    Goal: Assess problem-solving, design thinking, and handling of complexity.
    After completing Stage 2, announce: "Now for a couple of more challenging questions that might involve scenarios or deeper technical design."
    Identify 1-2 challenging aspects, a combination of multiple skills mentioned, or a senior-level responsibility from the Job Description.
    Formulate 1-2 concept-based questions or brief hypothetical mini-scenarios that would test problem-solving or design thinking related to these complex elements from the JD. These questions should require the candidate to apply their knowledge of concepts mentioned or implied in the JD.
    Apply the follow-up question strategy if answers are insufficient.

5.  Concluding the Interview:
    You will ask questions ONE AT A TIME and wait for a response.
    Thank the candidate. Your summary MUST directly assess their conceptual understanding of the skills and responsibilities MENTIONED IN THE 'CRITICAL JOB DESCRIPTION', considering their performance across all stages.
    Specifically mention:
    - Grasp of core concepts related to "Primary Skills" from the JD.
    - Understanding of concepts from "Secondary Skills" or "Key Responsibilities" in the JD.
    - Ability to handle more complex scenario-based questions related to the JD.
    - Strengths in conceptual understanding relevant to the JD.
    - Areas where conceptual understanding related to the JD seemed lacking, noting if follow-ups helped clarify.
    Maintain a professional tone. Avoid special formatting characters.
"""

    agent_session_instance = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"),
        llm=openai.LLM(model=OPENAI_MODEL_NAME),
        tts=cartesia.TTS(),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )
    await agent_session_instance.start(
        room=ctx.room, agent=Assistant(),
        room_input_options=RoomInputOptions(noise_cancellation=noise_cancellation.BVC())
    )
    logger.info("Agent session started. Starting generate_reply.")
    await agent_session_instance.generate_reply(instructions=dynamic_llm_instructions)
    logger.info("Initial generate_reply call completed.")

if __name__ == "__main__":
    critical_env_vars = {
        "AIRTABLE_PAT": AIRTABLE_PAT, "OPENAI_API_KEY": OPENAI_API_KEY,
        "DEEPGRAM_API_KEY": DEEPGRAM_API_KEY, "CARTESIA_API_KEY": CARTESIA_API_KEY,
        "LIVEKIT_URL": LIVEKIT_URL
    }
    missing = [k for k, v in critical_env_vars.items() if not v]
    if missing:
        logger.error(f"CRITICAL: Missing .env variables: {', '.join(missing)}. Agent cannot start.")
        exit(1)
    
    if SUCCESSFUL_CANDIDATES_TABLE_ID == "tbl_placeholder_sc" or \
       INTERVIEW_SESSIONS_TABLE_ID == "tbl_placeholder_is" or \
       AIRTABLE_BASE_ID == "app_placeholder_base_id": 
        logger.error("CRITICAL: Airtable ID constants in agent.py are placeholders. Update with actual IDs.")
        exit(1)
        
    tmp_dir = "/tmp/ai_interviewer_transcripts"
    try:
        if not os.path.exists(tmp_dir): os.makedirs(tmp_dir, exist_ok=True)
        logger.info(f"Ensured local transcript directory: {tmp_dir}")
    except OSError as e: logger.error(f"Could not create '{tmp_dir}': {e}", exc_info=True)

    logger.info("All critical configurations appear OK. Starting LiveKit Agent worker...")
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
