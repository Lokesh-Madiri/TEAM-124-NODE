/**
 * Test script for OpenAI API
 * Run this to verify your API key is working
 */

require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey === 'sk-your-actual-openai-key-here') {
    console.log('❌ Please set your OPENAI_API_KEY in the .env file');
    console.log('💡 Get your key from: https://platform.openai.com/account/api-keys');
    return;
  }

  console.log('🧪 Testing OpenAI API...');
  
  try {
    const openai = new OpenAI({
      apiKey: apiKey
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for an event platform.'
        },
        {
          role: 'user',
          content: 'Hello! Can you help me test this API connection?'
        }
      ],
      max_tokens: 100
    });

    const result = completion.choices[0].message.content;
    console.log('✅ OpenAI API is working!');
    console.log('📝 Response:', result);
    console.log('💰 Tokens used:', completion.usage.total_tokens);
    
  } catch (error) {
    console.log('❌ OpenAI API test failed:');
    if (error.status === 401) {
      console.log('🔑 Invalid API key. Please check your OPENAI_API_KEY');
    } else if (error.status === 429) {
      console.log('⏰ Rate limit exceeded. Try again in a moment.');
    } else if (error.status === 402) {
      console.log('💳 Billing issue. Please add payment method at https://platform.openai.com/account/billing');
    } else {
      console.log('Error:', error.message);
    }
  }
}

testOpenAI();