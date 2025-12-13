/**
 * OpenAI Service for AI Assistant
 * Provides intelligent responses using OpenAI's GPT models
 */

const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.client = null;
    
    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey
      });
    }
  }

  async generateResponse(prompt, options = {}) {
    try {
      if (!this.client) {
        console.log('OpenAI API key not configured, using fallback response');
        return this.getFallbackResponse(prompt);
      }

      const completion = await this.client.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant for an event discovery platform. You help users find events, get recommendations, and answer questions about events. Be helpful, friendly, and concise.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating response from OpenAI:', error.message);
      // Re-throw the error so the AI service can handle it properly
      throw error;
    }
  }

  async generateChatResponse(messages, options = {}) {
    try {
      if (!this.client) {
        console.log('OpenAI API key not configured, using fallback response');
        return this.getFallbackResponse(messages[messages.length - 1]?.content || '');
      }

      // Format messages for OpenAI
      const formattedMessages = [
        {
          role: 'system',
          content: 'You are an AI assistant for an event discovery platform. You help users find events, get recommendations, and answer questions about events. Be helpful, friendly, and concise.'
        },
        ...messages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }))
      ];

      const completion = await this.client.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo',
        messages: formattedMessages,
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating chat response from OpenAI:', error.message);
      // Re-throw the error so the AI service can handle it properly
      throw error;
    }
  }

  async generateRAGResponse(query, context, options = {}) {
    try {
      const prompt = `
        You are an AI assistant for an event discovery platform. Use the provided context about events to answer the user's question accurately and helpfully.
        
        Event Context:
        ${context}
        
        User Question:
        ${query}
        
        Instructions:
        - Use the event information provided to give accurate answers
        - If recommending events, explain why they're good matches
        - Be conversational and helpful
        - If the context doesn't contain relevant information, suggest how the user can find what they're looking for
        - Keep responses concise but informative
      `.trim();

      return await this.generateResponse(prompt, options);
    } catch (error) {
      console.error('Error generating RAG response from OpenAI:', error);
      return this.getFallbackResponse(query);
    }
  }

  async generateIntentClassification(message) {
    try {
      if (!this.client) {
        return this.getFallbackIntent(message);
      }

      const prompt = `
        Classify the user's intent from this message. Return only one of these categories:
        - search: Looking for specific events
        - recommend: Wants personalized suggestions
        - create: Wants to create/organize an event
        - moderate: Admin/moderation tasks
        - analyze: Wants analytics or insights
        - general: General conversation or greeting
        
        Message: "${message}"
        
        Category:
      `.trim();

      const response = await this.generateResponse(prompt, { maxTokens: 50, temperature: 0.3 });
      const intent = response.toLowerCase().trim();
      
      const validIntents = ['search', 'recommend', 'create', 'moderate', 'analyze', 'general'];
      return validIntents.includes(intent) ? intent : 'general';
    } catch (error) {
      console.error('Error classifying intent:', error);
      return this.getFallbackIntent(message);
    }
  }

  async generateEventDescription(eventDetails) {
    try {
      const prompt = `
        Create an engaging event description based on these details:
        
        Event Type: ${eventDetails.type || 'Event'}
        Topic/Theme: ${eventDetails.topic || 'General'}
        Target Audience: ${eventDetails.audience || 'General public'}
        Duration: ${eventDetails.duration || 'TBD'}
        Special Features: ${eventDetails.features || 'None specified'}
        
        Write a compelling, professional event description that would attract attendees. Include what participants can expect and why they should attend.
      `.trim();

      return await this.generateResponse(prompt, { maxTokens: 300 });
    } catch (error) {
      console.error('Error generating event description:', error);
      return 'An exciting event that brings people together for a memorable experience.';
    }
  }

  getFallbackResponse(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
      return "Hello! I'm your AI Event Assistant. I can help you find events, get recommendations, and answer questions about events. What would you like to know?";
    }
    
    if (lowerPrompt.includes('event') && (lowerPrompt.includes('find') || lowerPrompt.includes('search'))) {
      return "I can help you find events! Try searching for specific types like 'tech events', 'music concerts', or 'art exhibitions'. You can also specify a location or date range.";
    }
    
    if (lowerPrompt.includes('recommend')) {
      return "I'd love to recommend events for you! For personalized recommendations, please log in to your account. I can also help you search for specific types of events.";
    }
    
    return "I'm here to help you with events! I can assist with finding events, getting recommendations, and answering questions. What would you like to know?";
  }

  getFallbackIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('show')) {
      return 'search';
    }
    
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
      return 'recommend';
    }
    
    if (lowerMessage.includes('create') || lowerMessage.includes('organize')) {
      return 'create';
    }
    
    return 'general';
  }
}

module.exports = new OpenAIService();