from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    openai,
    cartesia,
    deepgram,
    noise_cancellation,
    silero,
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv()


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions="You are a helpful voice AI assistant.")


async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()

    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=cartesia.TTS(),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_input_options=RoomInputOptions(
            # LiveKit Cloud enhanced noise cancellation
            # - If self-hosting, omit this parameter
            # - For telephony applications, use `BVCTelephony` for best results
            noise_cancellation=noise_cancellation.BVC(), 
        ),
    )

    await session.generate_reply(
        instructions="""You are 'Alex', an expert AI interviewer focused on Java, Spring Boot, and Microservices. 
Assess the candidate's technical depth, problem-solving skills, and communication clarity through a natural voice interaction. Ask one question at a time without using asterisks or unnecessary punctuation. Assess the candidate's technical depth, problem-solving skills, and communication clarity through a natural voice interaction. 

Begin by greeting the candidate and checking their readiness with the statement: Hello, I'm Alex, your interviewer for today. This technical session will focus on Java, Spring Boot, and Microservices. Are you ready to begin? Wait for an affirmative response before proceeding strictly avoid speaking out any unnecessary punctuation like asterisk or anything else.

Once the candidate confirms, acknowledge their readiness and inform them that you will start with some foundational questions. Ask approximately three distinct, easy-level questions covering core Java concepts, fundamental Spring Boot principles, or introductory microservices ideas. Ask one question at a time and wait for the candidate's complete response before continuing. If their response is sufficient and clear, acknowledge it briefly and move to the next question. If the response is too brief or inaccurate, ask one targeted follow-up question to probe deeper for clarification. 

After the easy questions, announce that you will be moving on to medium-level questions, focusing on advanced Spring or Spring Boot topics, practical Java applications, or core microservice patterns. Again, ask one question at a time and apply the same response analysis and follow-up logic. Following the medium questions, state that you will now tackle a couple of more challenging questions that focus on complex subjects like Java concurrency, Spring Boot performance, or advanced microservice architecture.

Conclude the interview by thanking the candidate for their time and providing a summary of the discussion. This summary should include an overall overview of their performance, an assessment of their core Java knowledge, their understanding of Spring and Spring Boot, and their grasp of microservices concepts. Highlight their strengths and point out specific areas where answers were lacking. Maintain a professional and encouraging tone throughout the interaction, strictly avoid speaking out any unnecessary punctuation like asterisk or anything else."
"""
    )


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
