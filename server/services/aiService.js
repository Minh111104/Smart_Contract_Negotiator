const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here'
});

class AIService {
  constructor() {
    this.isConfigured = !!process.env.OPENAI_API_KEY;
  }

  async generateClauseSuggestions(category, context = '') {
    if (!this.isConfigured) {
      return this.getMockSuggestions(category);
    }

    try {
      const prompt = this.buildClausePrompt(category, context);
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a legal contract expert. Generate professional, legally sound contract clauses. Always provide 3-5 high-quality suggestions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      return this.parseClauseResponse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.getMockSuggestions(category);
    }
  }

  async analyzeContract(content, analysisType = 'general') {
    if (!this.isConfigured) {
      return this.getMockAnalysis(analysisType);
    }

    try {
      const prompt = this.buildAnalysisPrompt(content, analysisType);
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a legal contract analyst. Provide detailed, professional analysis of contract content. Focus on clarity, completeness, and potential issues."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      return this.getMockAnalysis(analysisType);
    }
  }

  async chatWithAI(message, contractContext = '') {
    if (!this.isConfigured) {
      return this.getMockChatResponse(message);
    }

    try {
      const systemPrompt = `You are an AI legal assistant for a smart contract negotiation platform. 
      You help users with contract drafting, analysis, and negotiation. 
      ${contractContext ? `Current contract context: ${contractContext.substring(0, 500)}...` : ''}
      
      Provide helpful, accurate legal guidance while reminding users to consult with qualified legal professionals for important matters.`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('AI Chat Error:', error);
      return this.getMockChatResponse(message);
    }
  }

  async generateSmartTemplate(contractType, requirements = {}) {
    if (!this.isConfigured) {
      return this.getMockTemplate(contractType);
    }

    try {
      const prompt = this.buildTemplatePrompt(contractType, requirements);
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a legal contract template generator. Create comprehensive, professional contract templates with placeholders for customization."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.5
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('AI Template Error:', error);
      return this.getMockTemplate(contractType);
    }
  }

  buildClausePrompt(category, context) {
    const categoryPrompts = {
      'confidentiality': 'Generate professional confidentiality clauses for a contract. Include data protection, information security, and duration of confidentiality obligations.',
      'termination': 'Generate professional termination clauses. Include notice periods, breach conditions, and post-termination obligations.',
      'liability': 'Generate professional liability limitation clauses. Include caps on damages, exclusions, and exceptions for gross negligence.',
      'intellectual property': 'Generate professional intellectual property clauses. Include ownership, licensing, and protection of IP rights.',
      'payment': 'Generate professional payment terms clauses. Include payment schedules, late fees, and currency specifications.',
      'force majeure': 'Generate professional force majeure clauses covering unforeseen circumstances and their impact on contract performance.',
      'governing law': 'Generate professional governing law and jurisdiction clauses for dispute resolution.',
      'warranties': 'Generate professional warranty clauses covering product/service guarantees and disclaimers.'
    };

    const basePrompt = categoryPrompts[category] || `Generate professional ${category} clauses for a contract.`;
    const contextAddition = context ? `\n\nConsider this contract context: ${context.substring(0, 300)}` : '';
    
    return `${basePrompt}${contextAddition}\n\nProvide 3-5 specific, actionable clause suggestions. Each should be a complete, professional clause ready for use.`;
  }

  buildAnalysisPrompt(content, analysisType) {
    const analysisPrompts = {
      'general': 'Analyze this contract for completeness, clarity, and potential issues. Provide suggestions for improvement.',
      'risk': 'Analyze this contract for potential risks and liabilities. Identify areas that need attention or clarification.',
      'compliance': 'Analyze this contract for legal compliance issues. Check for standard legal requirements and best practices.',
      'negotiation': 'Analyze this contract from a negotiation perspective. Identify key terms that might need discussion or modification.'
    };

    const basePrompt = analysisPrompts[analysisType] || analysisPrompts['general'];
    return `${basePrompt}\n\nContract content:\n${content}\n\nProvide a detailed analysis with specific recommendations.`;
  }

  buildTemplatePrompt(contractType, requirements) {
    const requirementsText = Object.keys(requirements).length > 0 
      ? `\n\nSpecific requirements:\n${JSON.stringify(requirements, null, 2)}`
      : '';

    return `Generate a comprehensive ${contractType} contract template. Include all standard sections and clauses typically found in such contracts. Use placeholders like [PARTY NAME], [AMOUNT], [DATE], etc. for customization.${requirementsText}`;
  }

  parseClauseResponse(response) {
    // Parse AI response into array of clauses
    const clauses = response.split('\n').filter(line => 
      line.trim() && 
      !line.match(/^\d+\.?\s*$/) && // Remove just numbers
      line.length > 20 // Filter out very short lines
    ).map(clause => clause.replace(/^\d+\.?\s*/, '').trim());

    return clauses.slice(0, 5); // Return max 5 clauses
  }

  // Mock responses for when AI is not configured
  getMockSuggestions(category) {
    const mockSuggestions = {
      'confidentiality': [
        'The Receiving Party shall maintain the confidentiality of all proprietary information disclosed by the Disclosing Party.',
        'Confidential information shall be protected using industry-standard security measures.',
        'The confidentiality obligations shall survive termination of this agreement for a period of [NUMBER] years.'
      ],
      'termination': [
        'Either party may terminate this agreement with [NUMBER] days written notice.',
        'This agreement may be terminated immediately for material breach.',
        'Upon termination, all rights and obligations shall cease except for those that survive termination.'
      ],
      'liability': [
        'Neither party shall be liable for any indirect, incidental, or consequential damages.',
        'The total liability of either party shall not exceed the amount paid under this agreement.',
        'This limitation of liability shall not apply to claims arising from gross negligence or willful misconduct.'
      ],
      'intellectual property': [
        'All intellectual property created during the course of this agreement shall belong to [PARTY NAME].',
        'Each party retains ownership of their pre-existing intellectual property.',
        'Any improvements or modifications to existing IP shall be jointly owned.'
      ],
      'payment': [
        'Payment shall be due within [NUMBER] days of receipt of invoice.',
        'Late payments shall incur interest at the rate of [PERCENTAGE]% per month.',
        'All payments shall be made in [CURRENCY] by bank transfer to the designated account.'
      ]
    };

    return mockSuggestions[category] || ['Please configure OpenAI API key for AI-powered suggestions.'];
  }

  getMockAnalysis(analysisType) {
    return `Mock ${analysisType} analysis: This is a placeholder response. Please configure your OpenAI API key to get real AI-powered contract analysis.`;
  }

  getMockChatResponse(message) {
    return `I'm an AI legal assistant, but I need to be configured with an OpenAI API key to provide real assistance. Your message: "${message}". Please set up the API key to enable full AI functionality.`;
  }

  getMockTemplate(contractType) {
    return `# ${contractType} Contract Template\n\nThis is a placeholder template. Please configure your OpenAI API key to generate AI-powered contract templates.\n\n[Your contract content will be generated here]`;
  }
}

module.exports = new AIService();
