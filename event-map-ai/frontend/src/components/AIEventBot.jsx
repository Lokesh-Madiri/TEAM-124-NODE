import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import contextAwareAI from '../api/contextAwareAI';
import './AIEventBot.css';

const AIEventBot = ({ events = [], userLocation = null, filters = {}, onFilterChange = null }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your intelligent Event Assistant with full knowledge of this platform. I can help you find events, navigate the app, answer questions about features, and provide personalized recommendations based on your location and preferences. What would you like to know? 🎉",
      sender: 'bot',
      timestamp: new Date(),
      suggestions: []
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize AI context when component mounts or context changes
  useEffect(() => {
    contextAwareAI.initializeContext(sessionIdRef.current, {
      user: currentUser,
      location: userLocation,
      events: events,
      filters: filters,
      currentPage: window.location.pathname
    });
  }, [currentUser, userLocation, events, filters]);

  // Update greeting message based on user context
  useEffect(() => {
    if (messages.length === 1) {
      const greeting = generateContextualGreeting();
      setMessages([{
        id: 1,
        text: greeting.text,
        sender: 'bot',
        timestamp: new Date(),
        suggestions: greeting.suggestions
      }]);
    }
  }, [currentUser]);

  const generateContextualGreeting = () => {
    const userName = currentUser?.name || 'there';
    const role = currentUser?.role || 'guest';
    
    let text = `Hello ${userName}! 👋\n\n`;
    let suggestions = [];
    
    if (role === 'organizer') {
      text += "As an event organizer, I can help you:\n• Create and manage your events\n• Discover what's happening around you\n• Track RSVPs and engagement\n• Navigate all platform features\n\nWhat would you like to do?";
      suggestions = [
        "How do I create an event?",
        "Show me my organized events",
        "What's happening this weekend?"
      ];
    } else if (role === 'admin') {
      text += "Welcome, Admin! I can assist you with:\n• Event moderation and approval\n• User management\n• Platform analytics\n• All user and organizer features\n\nHow can I help you today?";
      suggestions = [
        "Show pending events",
        "How do I moderate events?",
        "Find events near me"
      ];
    } else if (role === 'user') {
      text += "I'm here to help you discover amazing events! I can:\n• Find events based on your interests\n• Give you directions to events\n• Help you RSVP and manage attendance\n• Answer questions about the platform\n\nWhat are you interested in?";
      suggestions = [
        "Show me events near me",
        "Find music events this weekend",
        "How do I become an organizer?"
      ];
    } else {
      text += "I'm your intelligent Event Assistant! I can help you:\n• 🔍 Discover events near you\n• 📍 Navigate the platform\n• ❓ Answer questions about features\n• 🎯 Get personalized recommendations\n\nCreate an account to unlock more features!";
      suggestions = [
        "Find events near me",
        "How do I create an account?",
        "What can I do on this platform?"
      ];
    }
    
    return { text, suggestions };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // RAG functionality - search through events
  const searchEvents = (query) => {
    const searchTerms = query.toLowerCase().split(' ');
    return events.filter(event => {
      const searchableText = `${event.title} ${event.description} ${event.location} ${event.category}`.toLowerCase();
      return searchTerms.some(term => searchableText.includes(term));
    });
  };

  // Enhanced AI Response Generator using context-aware AI service
  const generateResponse = async (userMessage) => {
    try {
      // Update context before processing
      contextAwareAI.updateContext(sessionIdRef.current, {
        user: currentUser,
        location: userLocation,
        events: events,
        filters: filters,
        currentPage: window.location.pathname
      });

      // Process message with context-aware AI
      const response = await contextAwareAI.processMessage(
        sessionIdRef.current,
        userMessage,
        null // Context already initialized
      );

      // Handle actions
      if (response.actions && response.actions.length > 0) {
        handleAIActions(response.actions);
      }

      return {
        text: response.text,
        suggestions: response.suggestions || []
      };
    } catch (error) {
      console.error('Error calling context-aware AI:', error);
      // Fallback to local processing
      return {
        text: generateLocalResponse(userMessage),
        suggestions: []
      };
    }
  };

  // Handle AI-generated actions
  const handleAIActions = (actions) => {
    actions.forEach(action => {
      switch (action.type) {
        case 'NAVIGATE':
          handleNavigation(action.target);
          break;
        case 'APPLY_FILTER':
          handleFilterApplication(action.data);
          break;
        case 'EXECUTE':
          handleActionExecution(action.command, action.data);
          break;
        default:
          console.log('Unknown action type:', action.type);
      }
    });
  };

  // Navigation handler
  const handleNavigation = (target) => {
    const routes = {
      'CREATE_EVENT': '/create-event',
      'PROFILE': '/profile',
      'LOGIN': '/login',
      'REGISTER': '/register',
      'MAP': '/'
    };

    if (routes[target]) {
      setTimeout(() => {
        navigate(routes[target]);
        setIsOpen(false);
      }, 1000);
    }
  };

  // Filter application handler
  const handleFilterApplication = (filterData) => {
    if (onFilterChange && filterData) {
      const newFilters = { ...filters };
      
      if (filterData.category) {
        newFilters.categories = [filterData.category];
      }
      if (filterData.distance) {
        newFilters.distance = filterData.distance;
      }
      if (filterData.dateRange) {
        // Convert dateRange string to actual dates
        const today = new Date();
        switch (filterData.dateRange) {
          case 'today':
            newFilters.dateRange = { start: today, end: today };
            break;
          case 'weekend':
            // Implementation for weekend
            break;
          default:
            break;
        }
      }
      
      onFilterChange(newFilters);
    }
  };

  // Action execution handler
  const handleActionExecution = (command, data) => {
    switch (command) {
      case 'CLEAR_FILTER':
        if (onFilterChange) {
          onFilterChange({
            categories: [],
            dateRange: { start: null, end: null },
            distance: 10,
            priceRange: { min: 0, max: 1000, free: false },
            timeSlots: [],
            status: ['upcoming'],
            attendeeRange: { min: 0, max: 1000 }
          });
        }
        break;
      default:
        console.log('Unknown command:', command);
    }
  };

  // Fallback local response generator
  const generateLocalResponse = (userMessage) => {
    const query = userMessage.toLowerCase();
    
    // Intent detection
    if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
      return "Hello! How can I help you with events today?";
    }
    
    if (query.includes('find') || query.includes('search') || query.includes('looking for')) {
      const relevantEvents = searchEvents(query);
      if (relevantEvents.length > 0) {
        const eventList = relevantEvents.slice(0, 3).map(event => 
          `• **${event.title}** - ${event.location} (${new Date(event.date).toLocaleDateString()})`
        ).join('\n');
        return `I found ${relevantEvents.length} relevant events:

${eventList}

Would you like more details about any of these?`;
      } else {
        return "I couldn't find any events matching your criteria. Try searching with different keywords like location, date, or event type.";
      }
    }
    
    if (query.includes('when') || query.includes('date') || query.includes('time')) {
      const relevantEvents = searchEvents(query);
      if (relevantEvents.length > 0) {
        const event = relevantEvents[0];
        return `${event.title} is scheduled for ${new Date(event.date).toLocaleDateString()} at ${event.time || 'TBD'}. Location: ${event.location}`;
      }
    }
    
    if (query.includes('where') || query.includes('location')) {
      const relevantEvents = searchEvents(query);
      if (relevantEvents.length > 0) {
        const locations = [...new Set(relevantEvents.map(e => e.location))];
        return `Events are happening at: ${locations.join(', ')}. Would you like specific details about any location?`;
      }
    }
    
    if (query.includes('price') || query.includes('cost') || query.includes('ticket')) {
      const relevantEvents = searchEvents(query);
      if (relevantEvents.length > 0) {
        const event = relevantEvents[0];
        return `${event.title} ${event.price ? `costs $${event.price}` : 'pricing information is not available'}. You can register through our platform!`;
      }
    }
    
    if (query.includes('recommend') || query.includes('suggest')) {
      const popularEvents = events.slice(0, 3);
      if (popularEvents.length > 0) {
        const recommendations = popularEvents.map(event => 
          `• **${event.title}** - ${event.description?.substring(0, 100)}...`
        ).join('\n');
        return `Here are some popular events I'd recommend:\n\n${recommendations}`;
      }
    }
    
    // Default response with context
    return `I understand you're asking about "${userMessage}". I can help you with:
    
• Finding events by location, date, or category
• Getting event details like timing and pricing  
• Recommending popular events
• Answering questions about specific events

Try asking something like "Find music events this weekend" or "What events are near downtown?"`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI processing delay for better UX
    setTimeout(async () => {
      const response = await generateResponse(inputMessage);
      const botMessage = {
        id: Date.now() + 1,
        text: response.text,
        sender: 'bot',
        timestamp: new Date(),
        suggestions: response.suggestions || []
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 800);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
    // Auto-send after a short delay
    setTimeout(() => {
      const inputEvent = { target: { value: suggestion } };
      setInputMessage(suggestion);
      setTimeout(() => handleSendMessage(), 100);
    }, 200);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <div 
        className={`chat-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="chat-icon">
          {isOpen ? '✕' : '🤖'}
        </div>
        <div className="chat-pulse"></div>
      </div>

      {/* Chat Window */}
      <div className={`chat-window ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <div className="bot-avatar">🤖</div>
          <div className="bot-info">
            <h3>Event Assistant</h3>
            <span className="status">Online</span>
          </div>
          <button 
            className="close-chat"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id}>
              <div className={`message ${message.sender}`}>
                <div className="message-content">
                  {message.text.split('\n').map((line, index) => (
                    <div key={index}>
                      {line.includes('**') ? (
                        <span dangerouslySetInnerHTML={{
                          __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        }} />
                      ) : (
                        line
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Event Cards (if present in message) */}
                {message.eventCards && message.eventCards.length > 0 && (
                  <div className="event-cards-container">
                    {message.eventCards.map((event, idx) => (
                      <div key={idx} className="event-card-mini">
                        <div className="event-card-header">
                          <span className="event-category-badge">{event.category}</span>
                          <span className="event-distance">{event.distance}km</span>
                        </div>
                        <h4 className="event-card-title">{event.title}</h4>
                        <div className="event-card-meta">
                          <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                          <span>📍 {event.location}</span>
                        </div>
                        <div className="event-card-actions">
                          <button 
                            className="event-card-btn primary"
                            onClick={() => window.location.href = `/event/${event.id}`}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
              
              {/* Suggestions */}
              {message.sender === 'bot' && message.suggestions && message.suggestions.length > 0 && (
                <div className="message-suggestions">
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className="suggestion-chip"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="message bot">
              <div className="message-content typing">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          <div className="input-container">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about events..."
              rows="1"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="send-button"
            >
              ➤
            </button>
          </div>
          <div className="quick-actions">
            <button onClick={() => setInputMessage("Find events near me")}>
              📍 Near me
            </button>
            <button onClick={() => setInputMessage("Recommend popular events")}>
              ⭐ Popular
            </button>
            <button onClick={() => setInputMessage("Events this weekend")}>
              📅 This weekend
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIEventBot;