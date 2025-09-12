# AI Integration for Smart Contract Negotiator

This document outlines the AI features integrated into the Smart Contract Negotiator platform.

## Features Implemented

### 1. AI Clause Suggestions

- **Location**: `client/src/components/AIClauseSuggestions.js`
- **API Endpoint**: `POST /api/ai/suggestions`
- **Description**: Generates AI-powered contract clause suggestions based on category and context
- **Categories**: Confidentiality, Termination, Liability, Intellectual Property, Payment, Force Majeure, Governing Law, Warranties

### 2. AI Chatbot Assistant

- **Location**: `client/src/components/AIChatbot.js`
- **API Endpoint**: `POST /api/ai/chat`
- **Description**: Interactive AI assistant for contract-related questions and guidance
- **Features**: Real-time chat, contract context awareness, conversation history

### 3. AI Contract Analysis

- **Location**: `client/src/components/AIContractAnalysis.js`
- **API Endpoint**: `POST /api/ai/analyze`
- **Description**: Comprehensive contract analysis with multiple analysis types
- **Analysis Types**: General, Risk Assessment, Compliance Check, Negotiation Focus

### 4. AI Smart Templates

- **Location**: `client/src/components/AISmartTemplates.js`
- **API Endpoint**: `POST /api/ai/template`
- **Description**: Generates AI-powered contract templates
- **Template Types**: Service Agreement, Employment Contract, NDA, Partnership Agreement, Software License, Consulting Agreement, Purchase Agreement, Lease Agreement

## Backend Implementation

### AI Service

- **Location**: `server/services/aiService.js`
- **Description**: Centralized AI service handling all OpenAI API interactions
- **Features**: Error handling, fallback to mock responses, configurable API key

### API Endpoints

- `POST /api/ai/suggestions` - Get clause suggestions
- `POST /api/ai/analyze` - Analyze contract content
- `POST /api/ai/chat` - Chat with AI assistant
- `POST /api/ai/template` - Generate smart templates
- `GET /api/ai/status` - Check AI service status

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install openai
```

### 2. Environment Configuration

Create a `.env` file in the server directory:

```env
PORT=5000
JWT_SECRET=your_jwt_secret_key_change_in_production
MONGODB_URI=mongodb://localhost:27017/contractdb
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Get OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Add the key to your `.env` file

### 4. Start the Application

```bash
# Start the server
cd server
node index.js

# Start the client (in another terminal)
cd client
npm start
```

## Usage

### AI Clause Suggestions

1. Open a contract in the editor
2. Click the "AI" button in the header
3. Select a clause category
4. Choose from AI-generated suggestions
5. Click "Insert Clause" to add to your contract

### AI Chatbot

1. Click the "Chat" button in the header
2. Type your question or request
3. Get AI-powered responses
4. The AI has access to your current contract context

### Contract Analysis

1. Click the "Analyze" button in the header
2. Select analysis type (General, Risk, Compliance, Negotiation)
3. Click "Analyze Contract"
4. Review AI-generated insights and recommendations

### Smart Templates

1. Click the "Templates" button in the header
2. Select contract type
3. Add specific requirements (optional)
4. Generate AI-powered template
5. Use or copy the generated template

## Fallback Behavior

When the OpenAI API key is not configured:

- All AI features fall back to mock responses
- Users see a notification about mock mode
- Full functionality is available with placeholder content
- No errors or broken features

## Error Handling

- Network errors are gracefully handled
- API failures fall back to mock responses
- User-friendly error messages
- Loading states for all AI operations

## Security Considerations

- All AI API calls require authentication
- Contract content is only sent to AI when explicitly requested
- API keys are stored securely on the server
- No sensitive data is logged

## Future Enhancements

- Real-time AI suggestions while typing
- Contract comparison and diff analysis
- Legal compliance checking
- Multi-language support
- Custom AI model training
- Integration with legal databases

## Troubleshooting

### Common Issues

1. **AI features showing mock responses**
   - Check if OPENAI_API_KEY is set in server/.env
   - Verify the API key is valid and has credits
   - Check server console for error messages

2. **Network errors**
   - Ensure server is running on port 5000
   - Check CORS configuration
   - Verify authentication token

3. **Slow AI responses**
   - This is normal for AI API calls
   - Consider upgrading OpenAI plan for faster responses
   - Check network connection

### Debug Mode

To enable debug logging, add to server/.env:

```env
DEBUG=ai:*
```

This will log all AI service interactions to the console.
