import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const AICallInterface = () => {
  const [callId, setCallId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [customerInfo, setCustomerInfo] = useState(null);
  const [serviceDetails, setServiceDetails] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const generateCallId = () => {
    return `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const startCall = () => {
    const newCallId = generateCallId();
    setCallId(newCallId);
    setCallActive(true);
    setMessages([]);
    setCurrentStep('greeting');
    
    // Send initial greeting
    handleTextMessage(newCallId, "Hello, I need help with a service request.");
  };

  const endCall = async () => {
    if (callId) {
      try {
        await axios.post(`/api/ai-call/end?call_id=${callId}`);
        setCallActive(false);
        setCallId('');
        setCurrentStep('');
        setCustomerInfo(null);
        setServiceDetails(null);
        addMessage('system', 'Call ended successfully.');
      } catch (error) {
        console.error('Error ending call:', error);
        addMessage('system', 'Error ending call.');
      }
    }
  };

  const addMessage = (sender, message, data = null) => {
    const newMessage = {
      id: Date.now(),
      sender,
      message,
      timestamp: new Date().toLocaleTimeString(),
      data
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleTextMessage = async (currentCallId, message) => {
    if (!currentCallId || !message.trim()) return;

    const callIdToUse = currentCallId || callId;
    setIsLoading(true);
    addMessage('customer', message);

    try {
      const response = await axios.post('/api/ai-call/handle', {
        call_id: callIdToUse,
        customer_input: message
      });

      const aiResponse = response.data;
      addMessage('ai', aiResponse.message, aiResponse);
      
      setCurrentStep(aiResponse.next_step);
      
      if (aiResponse.customer_info) {
        setCustomerInfo(aiResponse.customer_info);
      }
      
      if (aiResponse.service_details) {
        setServiceDetails(aiResponse.service_details);
      }
      
      // If task was created, show success message
      if (aiResponse.action === 'task_created' && aiResponse.task_order) {
        addMessage('system', `Service request created successfully! Task ID: ${aiResponse.task_order.id}`);
      }
      
    } catch (error) {
      console.error('Error handling message:', error);
      addMessage('system', 'Error processing your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleTextMessage(callId, inputText);
      setInputText('');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleAudioMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      addMessage('system', 'Recording started... Speak now!');
    } catch (error) {
      console.error('Error starting recording:', error);
      addMessage('system', 'Error accessing microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      addMessage('system', 'Recording stopped. Processing...');
    }
  };

  const handleAudioMessage = async (audioBlob) => {
    if (!callId) return;

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');
      formData.append('call_id', callId);

      const response = await axios.post('/api/ai-call/handle-speech', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const { transcribed_text, ai_response } = response.data;
      
      addMessage('customer', `🎤 ${transcribed_text}`);
      addMessage('ai', ai_response.message, ai_response);
      
      setCurrentStep(ai_response.next_step);
      
      if (ai_response.customer_info) {
        setCustomerInfo(ai_response.customer_info);
      }
      
      if (ai_response.service_details) {
        setServiceDetails(ai_response.service_details);
      }
      
    } catch (error) {
      console.error('Error handling audio:', error);
      addMessage('system', 'Error processing audio. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const MessageBubble = ({ message }) => (
    <div className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        message.sender === 'customer' 
          ? 'bg-blue-500 text-white' 
          : message.sender === 'ai'
          ? 'bg-gray-200 text-gray-800'
          : 'bg-yellow-100 text-yellow-800'
      }`}>
        <div className="text-sm font-medium mb-1">
          {message.sender === 'customer' ? 'You' : message.sender === 'ai' ? 'AI Assistant' : 'System'}
        </div>
        <div className="text-sm">{message.message}</div>
        <div className="text-xs opacity-75 mt-1">{message.timestamp}</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">AI Customer Service Call</h2>
        <p className="text-gray-600">
          Simulate a customer service call where AI handles service requests automatically
        </p>
      </div>

      {/* Call Status */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Call Status: </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              callActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {callActive ? 'Active' : 'Inactive'}
            </span>
            {currentStep && (
              <span className="ml-2 text-sm text-gray-600">
                Step: {currentStep}
              </span>
            )}
          </div>
          <div className="space-x-2">
            {!callActive ? (
              <button
                onClick={startCall}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Start Call
              </button>
            ) : (
              <button
                onClick={endCall}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                End Call
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer Info */}
      {customerInfo && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium mb-2">Customer Information</h3>
          <div className="text-sm text-gray-700">
            <p><strong>Name:</strong> {customerInfo.name}</p>
            <p><strong>Email:</strong> {customerInfo.email}</p>
            <p><strong>Phone:</strong> {customerInfo.phone || 'Not provided'}</p>
          </div>
        </div>
      )}

      {/* Service Details */}
      {serviceDetails && Object.keys(serviceDetails).length > 0 && (
        <div className="mb-4 p-4 bg-green-50 rounded-lg">
          <h3 className="font-medium mb-2">Service Request Details</h3>
          <div className="text-sm text-gray-700">
            {serviceDetails.service_type && <p><strong>Service Type:</strong> {serviceDetails.service_type}</p>}
            {serviceDetails.description && <p><strong>Description:</strong> {serviceDetails.description}</p>}
            {serviceDetails.location && <p><strong>Location:</strong> {serviceDetails.location}</p>}
            {serviceDetails.urgency && <p><strong>Urgency:</strong> {serviceDetails.urgency}</p>}
            {serviceDetails.preferred_time && <p><strong>Preferred Time:</strong> {serviceDetails.preferred_time}</p>}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="mb-4 h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            Start a call to begin the conversation
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200">
              <div className="text-sm">AI is thinking...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {callActive && (
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
            >
              Send
            </button>
          </form>

          <div className="flex justify-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`px-6 py-2 rounded-lg font-medium ${
                isRecording 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              } disabled:bg-gray-300`}
            >
              {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium mb-2">How to test:</h3>
        <ol className="text-sm text-gray-700 space-y-1">
          <li>1. Click "Start Call" to begin</li>
          <li>2. Provide your customer number (you can use any existing customer ID)</li>
          <li>3. Describe your service request (e.g., "I need my bathroom pipe fixed")</li>
          <li>4. Answer follow-up questions about location, urgency, etc.</li>
          <li>5. Confirm the details to create the service request</li>
        </ol>
      </div>
    </div>
  );
};

export default AICallInterface;