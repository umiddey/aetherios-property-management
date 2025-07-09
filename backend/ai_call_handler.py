"""
AI Call Handler for ERP System
Handles automated customer service calls and creates system entries
"""

import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import openai
import asyncio
from motor.motor_asyncio import AsyncIOMotorDatabase
from uuid import uuid4

class AICallHandler:
    def __init__(self, db: AsyncIOMotorDatabase, openai_api_key: str):
        self.db = db
        openai.api_key = openai_api_key
        self.conversation_state = {}
        
    async def handle_customer_call(self, call_id: str, customer_input: str) -> Dict:
        """
        Main handler for customer calls
        Returns response to customer and any system actions taken
        """
        if call_id not in self.conversation_state:
            self.conversation_state[call_id] = {
                'step': 'greeting',
                'customer_id': None,
                'customer_data': None,
                'service_data': {},
                'conversation_history': []
            }
        
        state = self.conversation_state[call_id]
        state['conversation_history'].append(f"Customer: {customer_input}")
        
        # Process based on current step
        if state['step'] == 'greeting':
            response = await self._handle_greeting(call_id, customer_input)
        elif state['step'] == 'customer_verification':
            response = await self._handle_customer_verification(call_id, customer_input)
        elif state['step'] == 'service_questions':
            response = await self._handle_service_questions(call_id, customer_input)
        elif state['step'] == 'confirmation':
            response = await self._handle_confirmation(call_id, customer_input)
        else:
            response = await self._handle_completion(call_id, customer_input)
        
        state['conversation_history'].append(f"AI: {response['message']}")
        return response
    
    async def _handle_greeting(self, call_id: str, customer_input: str) -> Dict:
        """Handle initial greeting and ask for customer number"""
        state = self.conversation_state[call_id]
        
        # Check if customer provided their number in the greeting
        customer_number = self._extract_customer_number(customer_input)
        if customer_number:
            state['step'] = 'customer_verification'
            return await self._handle_customer_verification(call_id, customer_number)
        
        state['step'] = 'customer_verification'
        return {
            'message': "Hello! I'm your AI assistant. To help you with your service request, could you please provide your customer number or ID?",
            'action': 'ask_customer_number',
            'next_step': 'customer_verification'
        }
    
    async def _handle_customer_verification(self, call_id: str, customer_input: str) -> Dict:
        """Verify customer exists in system"""
        state = self.conversation_state[call_id]
        
        customer_number = self._extract_customer_number(customer_input)
        if not customer_number:
            return {
                'message': "I couldn't find a customer number in your response. Could you please provide your customer number or ID?",
                'action': 'ask_customer_number',
                'next_step': 'customer_verification'
            }
        
        # Search for customer in database
        customer = await self._find_customer(customer_number)
        
        if customer:
            state['customer_id'] = customer['id']
            state['customer_data'] = customer
            state['step'] = 'service_questions'
            state['service_data'] = {'question_index': 0}
            
            return {
                'message': f"Great! I found you in our system, {customer['name']}. How can I help you with your service request today? Please describe what you need fixed or serviced.",
                'action': 'customer_verified',
                'customer_info': customer,
                'next_step': 'service_questions'
            }
        else:
            return {
                'message': f"I couldn't find customer number {customer_number} in our system. Would you like me to create a new customer account for you, or would you like to try a different customer number?",
                'action': 'customer_not_found',
                'next_step': 'customer_verification'
            }
    
    async def _handle_service_questions(self, call_id: str, customer_input: str) -> Dict:
        """Handle service-related questions and data collection"""
        state = self.conversation_state[call_id]
        service_data = state['service_data']
        
        # Extract service information using AI
        service_info = await self._extract_service_information(customer_input, service_data)
        
        # Update service data
        service_data.update(service_info)
        
        # Check if we have enough information
        required_fields = ['service_type', 'description', 'urgency', 'location']
        missing_fields = [field for field in required_fields if field not in service_data or not service_data[field]]
        
        if missing_fields:
            question = self._get_next_question(missing_fields[0])
            return {
                'message': question,
                'action': 'collect_service_info',
                'missing_fields': missing_fields,
                'next_step': 'service_questions'
            }
        else:
            state['step'] = 'confirmation'
            return await self._handle_confirmation(call_id, "")
    
    async def _handle_confirmation(self, call_id: str, customer_input: str) -> Dict:
        """Confirm service request details before creating entry"""
        state = self.conversation_state[call_id]
        
        if not customer_input:  # First time showing confirmation
            service_data = state['service_data']
            confirmation_message = f"""
Let me confirm your service request:

Service Type: {service_data['service_type']}
Description: {service_data['description']}
Location: {service_data['location']}
Urgency: {service_data['urgency']}
Preferred Time: {service_data.get('preferred_time', 'Not specified')}

Is this information correct? Please say 'yes' to confirm or 'no' to make changes.
"""
            return {
                'message': confirmation_message,
                'action': 'confirm_details',
                'service_details': service_data,
                'next_step': 'confirmation'
            }
        
        # Process confirmation response
        confirmation = self._extract_confirmation(customer_input)
        if confirmation:
            # Create task order
            task_order = await self._create_task_order(call_id)
            state['step'] = 'completed'
            
            return {
                'message': f"Perfect! I've created service request #{task_order['id'][:8]} for you. Our team will contact you soon to schedule the service. Is there anything else I can help you with?",
                'action': 'task_created',
                'task_order': task_order,
                'next_step': 'completed'
            }
        else:
            state['step'] = 'service_questions'
            return {
                'message': "No problem! Let's go through the details again. What would you like to change about your service request?",
                'action': 'restart_questions',
                'next_step': 'service_questions'
            }
    
    async def _handle_completion(self, call_id: str, customer_input: str) -> Dict:
        """Handle post-completion conversation"""
        return {
            'message': "Thank you for calling! Your service request has been submitted. Have a great day!",
            'action': 'call_completed',
            'next_step': 'completed'
        }
    
    async def _extract_service_information(self, customer_input: str, current_data: Dict) -> Dict:
        """Use AI to extract service information from customer input"""
        system_prompt = """
        You are an AI assistant helping to extract service request information from customer input.
        Extract the following information when available:
        - service_type: type of service (plumbing, electrical, maintenance, heating, cooling, etc.)
        - description: detailed description of the issue
        - location: specific location (bathroom, kitchen, bedroom, etc.)
        - urgency: urgency level (emergency, urgent, routine)
        - preferred_time: when they want service (ASAP, today, this week, etc.)
        
        Return only a JSON object with the extracted information.
        """
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Customer said: {customer_input}"}
                ],
                temperature=0.3
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
        except Exception as e:
            print(f"Error extracting service info: {e}")
            return {}
    
    def _extract_customer_number(self, text: str) -> Optional[str]:
        """Extract customer number from text using regex"""
        # Look for patterns like "customer number 12345", "ID: 12345", "12345", etc.
        patterns = [
            r'customer\s+(?:number|id)?\s*:?\s*(\w+)',
            r'(?:id|number)\s*:?\s*(\w+)',
            r'\b(\d{4,})\b',  # 4+ digit numbers
            r'\b([A-Z]{2,}\d+)\b'  # Alphanumeric IDs
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    def _extract_confirmation(self, text: str) -> bool:
        """Extract confirmation from customer response"""
        positive_words = ['yes', 'correct', 'right', 'confirm', 'okay', 'ok', 'good', 'accurate']
        negative_words = ['no', 'wrong', 'incorrect', 'change', 'fix', 'modify']
        
        text_lower = text.lower()
        
        for word in positive_words:
            if word in text_lower:
                return True
        
        for word in negative_words:
            if word in text_lower:
                return False
        
        return True  # Default to positive if unclear
    
    def _get_next_question(self, missing_field: str) -> str:
        """Get the next question to ask based on missing field"""
        questions = {
            'service_type': "What type of service do you need? For example: plumbing, electrical, heating, maintenance, etc.",
            'description': "Could you describe the specific issue or what needs to be fixed?",
            'location': "Where is this issue located? For example: bathroom, kitchen, living room, etc.",
            'urgency': "How urgent is this request? Is it an emergency, urgent, or routine maintenance?",
            'preferred_time': "When would you like this service to be performed? ASAP, today, this week, or are you flexible?"
        }
        return questions.get(missing_field, "Could you provide more details about your service request?")
    
    async def _find_customer(self, customer_number: str) -> Optional[Dict]:
        """Find customer in database by number/ID"""
        # Search by ID first
        customer = await self.db.customers.find_one({"id": customer_number})
        if customer:
            return customer
        
        # Search by name or other fields if needed
        customer = await self.db.customers.find_one({
            "$or": [
                {"name": {"$regex": customer_number, "$options": "i"}},
                {"email": {"$regex": customer_number, "$options": "i"}}
            ]
        })
        return customer
    
    async def _create_task_order(self, call_id: str) -> Dict:
        """Create a new task order based on the collected information"""
        state = self.conversation_state[call_id]
        service_data = state['service_data']
        customer_data = state['customer_data']
        
        # Map urgency to priority
        urgency_to_priority = {
            'emergency': 'high',
            'urgent': 'medium',
            'routine': 'low'
        }
        
        # Calculate due date based on urgency
        urgency_to_days = {
            'emergency': 0,  # Today
            'urgent': 1,     # Tomorrow
            'routine': 7     # Next week
        }
        
        due_date = datetime.now() + timedelta(days=urgency_to_days.get(service_data.get('urgency', 'routine'), 7))
        
        # Create task order
        task_order = {
            'id': str(uuid4()),
            'subject': f"{service_data['service_type']} - {service_data['location']}",
            'description': f"Service Type: {service_data['service_type']}\n"
                          f"Location: {service_data['location']}\n"
                          f"Issue: {service_data['description']}\n"
                          f"Urgency: {service_data['urgency']}\n"
                          f"Preferred Time: {service_data.get('preferred_time', 'Not specified')}\n"
                          f"Created via AI Call System",
            'customer_id': state['customer_id'],
            'priority': urgency_to_priority.get(service_data.get('urgency', 'routine'), 'low'),
            'status': 'pending',
            'due_date': due_date.isoformat(),
            'created_at': datetime.now().isoformat(),
            'created_by': 'ai_system'
        }
        
        # Insert into database
        await self.db.task_orders.insert_one(task_order)
        
        # Create activity log
        activity = {
            'id': str(uuid4()),
            'task_order_id': task_order['id'],
            'description': f"Service request created via AI call system. Customer: {customer_data['name']}",
            'created_at': datetime.now().isoformat(),
            'created_by': 'ai_system'
        }
        
        await self.db.activities.insert_one(activity)
        
        return task_order
    
    def end_call(self, call_id: str):
        """Clean up conversation state"""
        if call_id in self.conversation_state:
            del self.conversation_state[call_id]