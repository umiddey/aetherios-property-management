"""
Simple Speech-to-Text Handler for AI Call System
This version uses only OpenAI Whisper to avoid dependency issues
"""

import logging
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class WhisperSpeechHandler:
    def __init__(self, openai_api_key: str):
        from openai import OpenAI
        self.client = OpenAI(api_key=openai_api_key)
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    async def transcribe_audio_file(self, audio_file_path: str) -> Optional[str]:
        """
        Transcribe audio file using OpenAI Whisper
        """
        try:
            loop = asyncio.get_event_loop()
            
            # Run Whisper transcription in thread pool
            text = await loop.run_in_executor(
                self.executor,
                self._whisper_transcribe,
                audio_file_path
            )
            
            return text
            
        except Exception as e:
            logger.error(f"Error with Whisper transcription: {e}")
            return None
    
    def _whisper_transcribe(self, audio_file_path: str) -> Optional[str]:
        """
        Internal method to transcribe using Whisper
        """
        try:
            with open(audio_file_path, "rb") as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
            return transcript
            
        except Exception as e:
            logger.error(f"Whisper transcription error: {e}")
            return None

# Factory function to create speech handler
def create_speech_handler(use_whisper: bool = False, openai_api_key: str = None):
    """
    Create speech handler - only Whisper supported in this version
    """
    if use_whisper and openai_api_key:
        return WhisperSpeechHandler(openai_api_key)
    else:
        return None