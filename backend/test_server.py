"""
Test server for AI Call Handler - simplified version
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid
import json

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Simple in-memory storage for testing
calls = {}
customers = {
    "12345": {
        "id": "12345",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "555-1234",
        "company": "Test Company"
    }
}

class AICallRequest(BaseModel):
    call_id: str
    customer_input: str

class AICallResponse(BaseModel):
    message: str
    action: str
    next_step: str
    customer_info: Optional[dict] = None
    service_details: Optional[dict] = None
    task_order: Optional[dict] = None

def extract_customer_number(text: str) -> Optional[str]:
    """Extract customer number from text"""
    import re
    patterns = [
        r'customer\s+(?:number|id)?\s*:?\s*(\w+)',
        r'(?:id|number)\s*:?\s*(\w+)',
        r'\b(\d{4,})\b',
        r'\b([A-Z]{2,}\d+)\b'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None

@app.post("/api/ai-call/handle", response_model=AICallResponse)
async def handle_ai_call(request: AICallRequest):
    """Handle AI call interaction - simplified version"""
    call_id = request.call_id
    customer_input = request.customer_input
    
    # Initialize call state
    if call_id not in calls:
        calls[call_id] = {
            'step': 'greeting',
            'customer_id': None,
            'customer_data': None,
            'service_data': {},
            'conversation_history': []
        }
    
    state = calls[call_id]
    state['conversation_history'].append(f"Customer: {customer_input}")
    
    # Simple state machine
    if state['step'] == 'greeting':
        # Look for customer number
        customer_number = extract_customer_number(customer_input)
        if customer_number and customer_number in customers:
            state['customer_id'] = customer_number
            state['customer_data'] = customers[customer_number]
            state['step'] = 'service_questions'
            
            response = AICallResponse(
                message=f"Great! I found you in our system, {customers[customer_number]['name']}. How can I help you with your service request today?",
                action="customer_verified",
                next_step="service_questions",
                customer_info=customers[customer_number]
            )
        else:
            response = AICallResponse(
                message="Hello! I'm your AI assistant. Could you please provide your customer number or ID?",
                action="ask_customer_number",
                next_step="customer_verification"
            )
    
    elif state['step'] == 'service_questions':
        # Extract service information
        service_info = {
            'service_type': 'plumbing' if 'plumb' in customer_input.lower() or 'pipe' in customer_input.lower() else 'general',
            'description': customer_input,
            'location': 'bathroom' if 'bathroom' in customer_input.lower() else 'property',
            'urgency': 'emergency' if 'emergency' in customer_input.lower() else 'routine'
        }
        
        state['service_data'].update(service_info)
        state['step'] = 'confirmation'
        
        response = AICallResponse(
            message=f"I understand you need {service_info['service_type']} service. Let me confirm: Service Type: {service_info['service_type']}, Location: {service_info['location']}, Urgency: {service_info['urgency']}. Is this correct?",
            action="confirm_details",
            next_step="confirmation",
            service_details=service_info
        )
    
    elif state['step'] == 'confirmation':
        # Check if confirmed
        if 'yes' in customer_input.lower() or 'correct' in customer_input.lower():
            # Create mock task order
            task_order = {
                'id': str(uuid.uuid4()),
                'subject': f"{state['service_data']['service_type']} - {state['service_data']['location']}",
                'description': state['service_data']['description'],
                'customer_id': state['customer_id'],
                'priority': 'high' if state['service_data']['urgency'] == 'emergency' else 'medium',
                'status': 'pending'
            }
            
            state['step'] = 'completed'
            
            response = AICallResponse(
                message=f"Perfect! I've created service request #{task_order['id'][:8]} for you. Our team will contact you soon.",
                action="task_created",
                next_step="completed",
                task_order=task_order
            )
        else:
            state['step'] = 'service_questions'
            response = AICallResponse(
                message="No problem! Let's go through the details again. What service do you need?",
                action="restart_questions",
                next_step="service_questions"
            )
    
    else:
        response = AICallResponse(
            message="Thank you for calling! Your service request has been submitted.",
            action="call_completed",
            next_step="completed"
        )
    
    state['conversation_history'].append(f"AI: {response.message}")
    return response

@app.post("/api/ai-call/end")
async def end_ai_call(call_id: str):
    """End AI call"""
    if call_id in calls:
        del calls[call_id]
    return {"message": "Call ended successfully"}

@app.get("/api/ai-call/status/{call_id}")
async def get_call_status(call_id: str):
    """Get call status"""
    if call_id in calls:
        return calls[call_id]
    else:
        raise HTTPException(status_code=404, detail="Call not found")

@app.get("/")
async def root():
    return {"message": "AI Call Handler Test Server"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)