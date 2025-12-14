/**
 * Test script for guest user scenarios
 * Tests 5 different guest user questions to verify AI assistant responses
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// 5 test scenarios for guest users
const guestScenarios = [
  {
    id: 1,
    question: "What tech events are happening this weekend?",
    expectedType: "search",
    description: "Guest searching for specific category and time"
  },
  {
    id: 2,
    question: "Can you recommend some events for me?",
    expectedType: "recommendation",
    description: "Guest asking for recommendations"
  },
  {
    id: 3,
    question: "How do I create an event?",
    expectedType: "create",
    description: "Guest asking about event creation"
  },
  {
    id: 4,
    question: "Show me all events near downtown",
    expectedType: "search",
    description: "Guest searching by location"
  },
  {
    id: 5,
    question: "Hello, what can you help me with?",
    expectedType: "general",
    description: "Guest general greeting and capabilities inquiry"
  }
];

async function testGuestScenario(scenario) {
  try {
    console.log(`\n🧪 Testing Scenario ${scenario.id}: ${scenario.description}`);
    console.log(`❓ Question: "${scenario.question}"`);
    
    const response = await axios.post(`${API_BASE}/ai-assistant/message`, {
      message: scenario.question,
      sessionId: `test_guest_${scenario.id}_${Date.now()}`
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data.success) {
      console.log(`✅ Response received (${response.data.metadata.userRole} role)`);
      console.log(`🤖 AI Response: ${response.data.message}`);
      console.log(`🔧 Agents Used: ${response.data.explanation.agentsUsed.join(', ')}`);
      console.log(`⚡ Execution Time: ${response.data.metadata.executionTime}ms`);
      console.log(`🛡️ Safety Status: ${response.data.explanation.safetyStatus}`);
      
      if (response.data.data && Object.keys(response.data.data).length > 0) {
        console.log(`📊 Additional Data: ${JSON.stringify(response.data.data, null, 2)}`);
      }
      
      return {
        success: true,
        scenario: scenario.id,
        userRole: response.data.metadata.userRole,
        agentsUsed: response.data.explanation.agentsUsed,
        responseLength: response.data.message.length,
        executionTime: response.data.metadata.executionTime
      };
    } else {
      console.log(`❌ Failed: ${response.data.error}`);
      return { success: false, scenario: scenario.id, error: response.data.error };
    }
  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    if (error.response) {
      console.log(`📄 Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { success: false, scenario: scenario.id, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Guest User AI Assistant Tests');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const scenario of guestScenarios) {
    const result = await testGuestScenario(scenario);
    results.push(result);
    
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎯 Successful Tests:');
    successful.forEach(result => {
      console.log(`  • Scenario ${result.scenario}: Role=${result.userRole}, Agents=${result.agentsUsed?.join(',')}, Time=${result.executionTime}ms`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n💥 Failed Tests:');
    failed.forEach(result => {
      console.log(`  • Scenario ${result.scenario}: ${result.error}`);
    });
  }
  
  console.log('\n🔍 Analysis:');
  if (successful.length > 0) {
    const avgTime = successful.reduce((sum, r) => sum + (r.executionTime || 0), 0) / successful.length;
    console.log(`  • Average response time: ${avgTime.toFixed(0)}ms`);
    
    const guestRoles = successful.filter(r => r.userRole === 'guest').length;
    console.log(`  • Correctly identified as guest: ${guestRoles}/${successful.length}`);
    
    const usedGuestWorkflow = successful.filter(r => 
      r.agentsUsed && r.agentsUsed.includes('AgentOrchestrator')
    ).length;
    console.log(`  • Used orchestrator: ${usedGuestWorkflow}/${successful.length}`);
  }
  
  console.log('\n✨ Test completed!');
}

// Run the tests
runAllTests().catch(console.error);