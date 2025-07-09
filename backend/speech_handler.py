"""
Speech-to-Text Handler for AI Call System
Handles audio input from customer calls and converts to text
"""

import io
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

# Optional speech recognition imports
try:
    import speech_recognition as sr
    SPEECH_RECOGNITION_AVAILABLE = True
except ImportError:
    SPEECH_RECOGNITION_AVAILABLE = False
    sr = None

logger = logging.getLogger(__name__)

class SpeechHandler:
    def __init__(self):
        if not SPEECH_RECOGNITION_AVAILABLE:
            raise ImportError("Speech recognition not available. Install: pip install speechrecognition pyaudio")
        
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Adjust for ambient noise
        with self.microphone as source:
            self.recognizer.adjust_for_ambient_noise(source)
    
    async def transcribe_audio(self, audio_data: bytes) -> Optional[str]:
        """
        Transcribe audio data to text using Google Speech Recognition
        """
        try:
            # Convert bytes to AudioData object
            audio_file = io.BytesIO(audio_data)
            
            # Run speech recognition in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            text = await loop.run_in_executor(
                self.executor, 
                self._recognize_speech, 
                audio_data
            )
            
            return text
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            return None
    
    def _recognize_speech(self, audio_data: bytes) -> Optional[str]:
        """
        Internal method to recognize speech from audio data
        """
        try:
            # Create AudioData object from bytes
            audio_file = io.BytesIO(audio_data)
            
            # Use speech_recognition library
            with sr.AudioFile(audio_file) as source:
                audio = self.recognizer.record(source)
                
            # Recognize speech using Google Speech Recognition
            text = self.recognizer.recognize_google(audio)
            return text
            
        except sr.UnknownValueError:
            logger.warning("Could not understand audio")
            return None
        except sr.RequestError as e:
            logger.error(f"Speech recognition service error: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in speech recognition: {e}")
            return None
    
    async def listen_for_speech(self, timeout: int = 10) -> Optional[str]:
        """
        Listen for speech input from microphone
        """
        try:
            loop = asyncio.get_event_loop()
            
            # Listen for audio in thread pool
            audio = await loop.run_in_executor(
                self.executor,
                self._listen_microphone,
                timeout
            )
            
            if audio:
                # Recognize speech
                text = await loop.run_in_executor(
                    self.executor,
                    self._recognize_audio,
                    audio
                )
                return text
            
            return None
            
        except Exception as e:
            logger.error(f"Error listening for speech: {e}")
            return None
    
    def _listen_microphone(self, timeout: int):
        """
        Listen to microphone input
        """
        try:
            with self.microphone as source:
                print("Listening for speech...")
                audio = self.recognizer.listen(source, timeout=timeout, phrase_time_limit=5)
                return audio
        except Exception as e:
            logger.info(f"Listening timeout or error: {e}")
            return None
    
    def _recognize_audio(self, audio):
        """
        Recognize speech from AudioData object
        """
        try:
            text = self.recognizer.recognize_google(audio)
            return text
        except sr.UnknownValueError:
            logger.warning("Could not understand audio")
            return None
        except sr.RequestError as e:
            logger.error(f"Speech recognition service error: {e}")
            return None

# Alternative implementation using OpenAI Whisper for better accuracy
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

# Factory function to create appropriate speech handler
def create_speech_handler(use_whisper: bool = False, openai_api_key: str = None):
    """
    Create appropriate speech handler based on configuration
    """
    if use_whisper and openai_api_key:
        return WhisperSpeechHandler(openai_api_key)
    elif SPEECH_RECOGNITION_AVAILABLE:
        return SpeechHandler()
    else:
        return None