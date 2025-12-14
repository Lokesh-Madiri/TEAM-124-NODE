/**
 * Simple test script for guest user scenarios using built-in fetch
 */

// Test scenarios for guest users
const guestScenarios = [
  {
    id: 1,
    question: "What tech events are happening this weekend?",
    description: "Guest searching for specific category and time"
  },
  {
    id: 2,
    question: "Can you recommend some events for me?",
    description: "Guest asking for recommendations"
  },
  {
    id: 3,
    question: "How do I create an event?",
    description: "Guest asking about event creation"
  },
  {
    id: 4,
    question: "Show me all events near downtown",
    description: "Guest searching by location"
  },
  {
    id: 5,
    question: "Hello, what can you help me with?",
    description: "Guest general greeting and capabilities inquiry"
  }
];

async function testGuestScenario(scenario) {
  try {
    console.log(`\n🧪 Testing Scenario ${scenario.id}: ${scenario.description}`);
    console.log(`❓ Question: "${scenario.question}"`);
    
    const response = await fetch('http://localhost:5000/api/ai-assistant/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: scenario.question,
        sessionId: `test_guest_${scenario.id}_${Date.now()}`
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Response received (${data.metadata.userRole} role)`);
      console.log(`🤖 AI Response: ${data.message}`);
      console.log(`🔧 Agents Used: ${data.explanation.agentsUsed.join(', ')}`);
      console.log(`⚡ Execution Time: ${data.metadata.executionTime}ms`);
      console.log(`🛡️ Safety Status: ${data.explanation.safetyStatus}`);
      
      return {
        success: true,
        scenario: scenario.id,
        userRole: data.metadata.userRole,
        agentsUsed: data.explanation.agentsUsed,
        responseLength: data.message.length,
        executionTime: data.metadata.executionTime
      };
    } else {
      console.log(`❌ Failed: ${data.error}`);
      return { success: false, scenario: scenario.id, error: data.error };
    }
  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
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
  
  console.log('\n✨ Test completed!');
}

// Run the tests
runAllTests().catch(console.error);