# AI Call Handler Setup Guide

## Overview
This AI Call Handler system automatically processes customer service calls, extracts information, and creates service requests in your ERP system. When customers call, they will be asked a series of questions, and the AI will automatically create entries in your system based on their responses.

## Features

### 🤖 AI Call Processing
- **Customer Verification**: Verifies customers by customer number/ID
- **Intelligent Questioning**: Asks structured questions to understand service needs
- **Automatic Entry Creation**: Creates TaskOrder entries in your ERP system
- **Speech-to-Text**: Supports both text and voice input
- **Conversation Management**: Maintains context throughout the call

### 📋 Service Request Flow
1. Customer provides their customer number
2. AI asks about service type (plumbing, electrical, etc.)
3. AI collects specific details (location, urgency, description)
4. AI confirms details with customer
5. AI creates service request automatically

## Installation

### 1. Backend Setup

Install required Python packages:
```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy and configure the environment file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=erp_database

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI Configuration (REQUIRED for AI features)
OPENAI_API_KEY=your-openai-api-key-here

# Speech Recognition Configuration
USE_WHISPER=true  # Set to false to use Google Speech Recognition instead
```

### 3. OpenAI API Key Setup

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add it to your `.env` file as `OPENAI_API_KEY`

### 4. Speech Recognition Setup

**Option A: OpenAI Whisper (Recommended)**
- Set `USE_WHISPER=true` in `.env`
- Uses your OpenAI API key for high-accuracy transcription

**Option B: Google Speech Recognition (Free)**
- Set `USE_WHISPER=false` in `.env`
- Uses Google's free speech recognition service
- May require additional setup for microphone permissions

## Usage

### 1. Start the Backend Server

```bash
cd backend
uvicorn server:app --reload --port 8000
```

### 2. Access the AI Call Interface

1. Open your ERP system frontend
2. Navigate to the "AI Call" section
3. Click "Start Call" to begin a test conversation

### 3. Test the System

Example conversation flow:
```
AI: Hello! I'm your AI assistant. To help you with your service request, could you please provide your customer number or ID?

Customer: My customer number is 12345

AI: Great! I found you in our system, John Doe. How can I help you with your service request today?

Customer: I need my bathroom pipe fixed, it's leaking badly

AI: I understand you need plumbing service for a bathroom pipe issue. How urgent is this request?

Customer: It's an emergency

AI: When would you like this service to be performed?

Customer: As soon as possible

AI: Let me confirm your service request:
- Service Type: plumbing
- Description: bathroom pipe leaking badly
- Location: bathroom
- Urgency: emergency
- Preferred Time: As soon as possible

Is this correct?

Customer: Yes, that's correct

AI: Perfect! I've created service request #abc12345 for you. Our team will contact you soon.
```

## API Endpoints

### Text-based AI Call
```http
POST /api/ai-call/handle
Content-Type: application/json

{
  "call_id": "unique-call-id",
  "customer_input": "Hello, my customer number is 12345"
}
```

### Speech-to-Text
```http
POST /api/ai-call/speech-to-text
Content-Type: multipart/form-data

Form Data:
- audio_file: [audio file in WAV format]
```

### Speech-based AI Call
```http
POST /api/ai-call/handle-speech
Content-Type: multipart/form-data

Form Data:
- call_id: unique-call-id
- audio_file: [audio file in WAV format]
```

### Call Status
```http
GET /api/ai-call/status/{call_id}
```

### End Call
```http
POST /api/ai-call/end?call_id={call_id}
```

## Testing

### 1. Run the Test Script

```bash
python test_ai_call.py
```

This will test:
- Customer verification
- Service request processing
- Task order creation
- Complete conversation flow

### 2. Manual Testing

1. Create a test customer in your system
2. Use the AI Call interface to simulate a customer call
3. Verify that task orders are created correctly

## Customization

### 1. Modify Question Flow

Edit `ai_call_handler.py` to customize:
- Questions asked to customers
- Service types recognized
- Urgency levels
- Required information fields

### 2. Add New Service Types

Update the `_extract_service_information` method to recognize new service types:
```python
# Add to the system prompt
service_types = [
    "plumbing", "electrical", "heating", "cooling", 
    "maintenance", "cleaning", "repair", "installation"
]
```

### 3. Customize Priority Mapping

Modify the urgency-to-priority mapping in `_create_task_order`:
```python
urgency_to_priority = {
    'emergency': 'high',
    'urgent': 'medium',
    'routine': 'low',
    'scheduled': 'low'
}
```

## Troubleshooting

### Common Issues

1. **OpenAI API Key Error**
   - Ensure your API key is correct in `.env`
   - Check your OpenAI account has sufficient credits

2. **Speech Recognition Not Working**
   - For Whisper: Check OpenAI API key
   - For Google: Check internet connection and microphone permissions

3. **Customer Not Found**
   - Ensure customer exists in the database
   - Check customer ID format matches your system

4. **Task Order Not Created**
   - Check database connection
   - Verify required fields are collected
   - Check server logs for errors

### Debug Mode

Set logging to DEBUG level in `server.py`:
```python
logging.basicConfig(level=logging.DEBUG)
```

## Security Considerations

1. **API Key Protection**: Never commit API keys to version control
2. **Input Validation**: The system validates all customer inputs
3. **Access Control**: AI endpoints require authentication
4. **Data Privacy**: Customer conversations are not permanently stored

## Performance Tips

1. **Concurrent Calls**: The system supports multiple simultaneous calls
2. **Memory Management**: Call states are cleaned up after completion
3. **Database Optimization**: Use indexes on customer lookup fields
4. **API Rate Limits**: Monitor OpenAI API usage

## Integration with Phone Systems

To integrate with actual phone systems:

1. **SIP Integration**: Use libraries like `pjsua2` for SIP phone integration
2. **Twilio Integration**: Use Twilio's API for phone call handling
3. **Voice Gateway**: Set up a voice gateway to convert phone calls to API calls

Example Twilio integration:
```python
from twilio.rest import Client

def handle_phone_call(call_sid, audio_url):
    # Download audio from Twilio
    # Process through speech-to-text
    # Handle with AI call handler
    pass
```

This system provides a complete foundation for AI-automated customer service calls in your ERP system!