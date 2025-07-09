"""
Phone Integration Handler for ERP AI System
Handles incoming phone calls using Twilio and integrates with AI Call Handler
"""

import os
import asyncio
import logging
from typing import Dict, Optional
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Gather, Say
from backend.ai_call_handler import AICallHandler
from motor.motor_asyncio import AsyncIOMotorDatabase
import tempfile
import uuid
import json

logger = logging.getLogger(__name__)

class PhoneHandler:
    def __init__(self, db: AsyncIOMotorDatabase, ai_call_handler: AICallHandler):
        self.db = db
        self.ai_call_handler = ai_call_handler
        
        # Initialize Twilio client
        self.twilio_client = Client(
            os.environ.get('TWILIO_ACCOUNT_SID'),
            os.environ.get('TWILIO_AUTH_TOKEN')
        )
        
        # Store active calls
        self.active_calls = {}
        
        # TTS settings
        self.tts_voice = "alice"  # Twilio voice
        self.tts_language = "en-US"
    
    def handle_incoming_call(self, request_data: Dict) -> str:
        """
        Handle incoming phone call from Twilio webhook
        Returns TwiML response
        """
        call_sid = request_data.get('CallSid')
        from_number = request_data.get('From')
        
        logger.info(f"Incoming call from {from_number}, SID: {call_sid}")
        
        # Initialize call session
        self.active_calls[call_sid] = {
            'from_number': from_number,
            'call_id': str(uuid.uuid4()),
            'step': 'greeting'
        }
        
        # Create TwiML response
        response = VoiceResponse()
        
        # Welcome message and gather input
        gather = Gather(
            input='speech',
            action='/api/phone/process-speech',
            method='POST',
            speech_timeout='3',
            timeout=10,
            language=self.tts_language
        )
        
        gather.say(
            "Hello! Welcome to our service center. I'm your AI assistant. "
            "To help you with your service request, please tell me your customer number or describe your issue.",
            voice=self.tts_voice,
            language=self.tts_language
        )
        
        response.append(gather)
        
        # Fallback if no input
        response.say(
            "I didn't receive any input. Please call back when you're ready to speak.",
            voice=self.tts_voice,
            language=self.tts_language
        )
        response.hangup()
        
        return str(response)
    
    async def process_speech_input(self, request_data: Dict) -> str:
        """
        Process speech input from Twilio and generate AI response
        """
        call_sid = request_data.get('CallSid')
        speech_result = request_data.get('SpeechResult', '')
        
        if call_sid not in self.active_calls:
            logger.error(f"Call SID {call_sid} not found in active calls")
            return self._create_error_response()
        
        call_session = self.active_calls[call_sid]
        call_id = call_session['call_id']
        
        logger.info(f"Processing speech for call {call_sid}: {speech_result}")
        
        try:
            # Process through AI Call Handler
            ai_response = await self.ai_call_handler.handle_customer_call(call_id, speech_result)
            
            # Create TwiML response based on AI response
            response = VoiceResponse()
            
            # Speak the AI response
            response.say(
                ai_response['message'],
                voice=self.tts_voice,
                language=self.tts_language
            )
            
            # Check if we need to continue the conversation
            if ai_response['next_step'] == 'completed':
                # Call completed, hang up
                response.say(
                    "Thank you for calling. Goodbye!",
                    voice=self.tts_voice,
                    language=self.tts_language
                )
                response.hangup()
                
                # Clean up call session
                self._cleanup_call(call_sid)
                
            else:
                # Continue conversation - gather more input
                gather = Gather(
                    input='speech',
                    action='/api/phone/process-speech',
                    method='POST',
                    speech_timeout='3',
                    timeout=10,
                    language=self.tts_language
                )
                
                if ai_response['next_step'] == 'customer_verification':
                    gather.say(
                        "Please tell me your customer number or ID.",
                        voice=self.tts_voice,
                        language=self.tts_language
                    )
                elif ai_response['next_step'] == 'service_questions':
                    gather.say(
                        "Please continue with your service request details.",
                        voice=self.tts_voice,
                        language=self.tts_language
                    )
                elif ai_response['next_step'] == 'confirmation':
                    gather.say(
                        "Please say yes to confirm or no to make changes.",
                        voice=self.tts_voice,
                        language=self.tts_language
                    )
                
                response.append(gather)
                
                # Fallback
                response.say(
                    "I didn't hear your response. Please try again.",
                    voice=self.tts_voice,
                    language=self.tts_language
                )
                response.redirect('/api/phone/process-speech')
            
            return str(response)
            
        except Exception as e:
            logger.error(f"Error processing speech input: {e}")
            return self._create_error_response()
    
    def handle_call_status(self, request_data: Dict) -> str:
        """
        Handle call status updates from Twilio
        """
        call_sid = request_data.get('CallSid')
        call_status = request_data.get('CallStatus')
        
        logger.info(f"Call {call_sid} status: {call_status}")
        
        if call_status in ['completed', 'failed', 'no-answer', 'canceled', 'busy']:
            self._cleanup_call(call_sid)
        
        return "OK"
    
    def _create_error_response(self) -> str:
        """
        Create error response TwiML
        """
        response = VoiceResponse()
        response.say(
            "I'm sorry, there was an error processing your request. Please try calling again later.",
            voice=self.tts_voice,
            language=self.tts_language
        )
        response.hangup()
        return str(response)
    
    def _cleanup_call(self, call_sid: str):
        """
        Clean up call session data
        """
        if call_sid in self.active_calls:
            call_session = self.active_calls[call_sid]
            call_id = call_session['call_id']
            
            # End AI call session
            self.ai_call_handler.end_call(call_id)
            
            # Remove from active calls
            del self.active_calls[call_sid]
            
            logger.info(f"Cleaned up call session {call_sid}")
    
    def make_outbound_call(self, to_number: str, message: str) -> Optional[str]:
        """
        Make an outbound call (for notifications, confirmations, etc.)
        """
        try:
            call = self.twilio_client.calls.create(
                twiml=f'<Response><Say voice="{self.tts_voice}" language="{self.tts_language}">{message}</Say></Response>',
                to=to_number,
                from_=os.environ.get('TWILIO_PHONE_NUMBER')
            )
            logger.info(f"Outbound call created: {call.sid}")
            return call.sid
        except Exception as e:
            logger.error(f"Error making outbound call: {e}")
            return None
    
    def get_call_status(self, call_sid: str) -> Optional[Dict]:
        """
        Get status of a specific call
        """
        if call_sid in self.active_calls:
            call_session = self.active_calls[call_sid]
            call_id = call_session['call_id']
            
            # Get AI call status
            ai_status = None
            if call_id in self.ai_call_handler.conversation_state:
                ai_status = self.ai_call_handler.conversation_state[call_id]
            
            return {
                'call_sid': call_sid,
                'call_id': call_id,
                'from_number': call_session['from_number'],
                'ai_status': ai_status
            }
        
        return None
    
    def get_active_calls(self) -> Dict:
        """
        Get all active calls
        """
        return self.active_calls