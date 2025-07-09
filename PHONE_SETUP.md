# Phone Integration Setup Guide

This guide will help you set up the phone integration system so customers can call a number and interact with the AI bot to create service requests.

## Prerequisites

1. **Twilio Account**: You need a Twilio account to handle phone calls
2. **OpenAI API Key**: Required for AI conversations and speech processing
3. **Public URL**: Your server needs to be accessible from the internet for Twilio webhooks

## Setup Steps

### 1. Create Twilio Account

1. Go to [Twilio Console](https://console.twilio.com/)
2. Create an account if you don't have one
3. Get your Account SID and Auth Token from the console
4. Purchase a phone number from Twilio

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update the following variables:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your-actual-account-sid
TWILIO_AUTH_TOKEN=your-actual-auth-token
TWILIO_PHONE_NUMBER=+1234567890  # Your purchased Twilio number

# OpenAI Configuration (required for AI processing)
OPENAI_API_KEY=your-openai-api-key

# Enable Whisper for speech recognition
USE_WHISPER=true
```

### 3. Make Your Server Publicly Accessible

For development, you can use ngrok:

```bash
# Install ngrok if you haven't already
npm install -g ngrok

# Start your server
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000

# In another terminal, expose your server
ngrok http 8000
```

Note the public URL (e.g., `https://abc123.ngrok.io`)

### 4. Configure Twilio Webhooks

In your Twilio Console:

1. Go to Phone Numbers → Manage → Active Numbers
2. Click on your purchased phone number
3. Set the webhook URLs:
   - **Voice URL**: `https://your-domain.com/api/phone/incoming`
   - **Status Callback URL**: `https://your-domain.com/api/phone/status`
   - **HTTP Method**: POST for both

### 5. Test the Integration

1. Make sure your server is running
2. Call your Twilio phone number
3. The AI bot should answer and guide you through the service request process

## Call Flow

1. **Customer calls** your Twilio number
2. **Twilio** forwards the call to your `/api/phone/incoming` endpoint
3. **AI bot** greets the customer and asks for their customer number
4. **Customer speaks** their response
5. **Twilio** sends speech to `/api/phone/process-speech`
6. **AI processes** the speech and generates a response
7. **Bot responds** with text-to-speech
8. **Process continues** until service request is complete
9. **Task order** is automatically created in the system

## API Endpoints

### Phone Webhooks (called by Twilio)
- `POST /api/phone/incoming` - Handle incoming calls
- `POST /api/phone/process-speech` - Process speech input
- `POST /api/phone/status` - Handle call status updates

### Management Endpoints (require authentication)
- `GET /api/phone/active-calls` - View active calls
- `GET /api/phone/call-status/{call_sid}` - Get call status
- `POST /api/phone/outbound-call` - Make outbound calls

## Features

### Automatic Customer Recognition
- Customers provide their customer number or ID
- System looks up customer information in the database
- If not found, bot can help create new customer records

### Service Request Processing
- AI extracts service details from natural speech
- Collects: service type, description, location, urgency
- Creates task orders automatically

### Real-time Conversation
- Uses Twilio's speech recognition for input
- AI generates contextual responses
- Text-to-speech for bot responses

### Call Management
- Tracks active calls in real-time
- Stores conversation history
- Automatic cleanup when calls end

## Troubleshooting

### Common Issues

1. **Call doesn't connect**
   - Check Twilio webhook URLs are correct
   - Ensure your server is publicly accessible
   - Verify environment variables are set

2. **Speech recognition not working**
   - Ensure `USE_WHISPER=true` in your environment
   - Check OpenAI API key is valid
   - Verify audio quality on the call

3. **AI responses seem off**
   - Check OpenAI API key and billing
   - Review conversation logs in the system
   - Ensure customer exists in database

### Logs

Check server logs for detailed error information:
```bash
# View logs while running
tail -f server.log

# Or check console output when running with uvicorn
```

## Production Considerations

1. **Security**: Use HTTPS and validate Twilio webhooks
2. **Scaling**: Consider load balancing for multiple calls
3. **Monitoring**: Set up call monitoring and alerts
4. **Costs**: Monitor Twilio and OpenAI usage costs
5. **Compliance**: Ensure call recording compliance if needed

## Cost Estimation

- **Twilio**: ~$0.013/minute for calls + phone number rental
- **OpenAI**: ~$0.002/1K tokens for GPT-3.5-turbo
- **Whisper**: ~$0.006/minute for transcription

A typical 5-minute service request call might cost around $0.10-0.20.

## Next Steps

1. Set up the environment variables
2. Configure Twilio webhooks
3. Test with a phone call
4. Monitor and optimize based on usage
5. Add custom features as needed

For support, check the logs and API documentation in the codebase.