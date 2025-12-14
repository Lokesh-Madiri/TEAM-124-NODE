/**
 * Context-Aware AI Service with Intent Classification
 * Provides intelligent assistance based on user context, location, and role
 */

class ContextAwareAIService {
  constructor() {
    this.conversationHistory = new Map(); // sessionId -> messages[]
    this.userContext = new Map(); // sessionId -> context
  }

  /**
   * Initialize context for a session
   */
  initializeContext(sessionId, context) {
    this.userContext.set(sessionId, {
      user: context.user || null,
      location: context.location || null,
      currentPage: context.currentPage || 'map',
      events: context.events || [],
      filters: context.filters || {},
      timestamp: Date.now()
    });
  }

  /**
   * Update context for existing session
   */
  updateContext(sessionId, updates) {
    const existing = this.userContext.get(sessionId) || {};
    this.userContext.set(sessionId, { ...existing, ...updates, timestamp: Date.now() });
  }

  /**
   * Get conversation history
   */
  getHistory(sessionId) {
    return this.conversationHistory.get(sessionId) || [];
  }

  /**
   * Add to conversation history
   */
  addToHistory(sessionId, message, sender) {
    const history = this.getHistory(sessionId);
    history.push({
      message,
      sender,
      timestamp: Date.now()
    });
    // Keep only last 20 messages
    if (history.length > 20) {
      history.shift();
    }
    this.conversationHistory.set(sessionId, history);
  }

  /**
   * Main processing function
   */
  async processMessage(sessionId, userMessage, context) {
    // Initialize or update context
    if (context) {
      this.initializeContext(sessionId, context);
    }

    // Add to history
    this.addToHistory(sessionId, userMessage, 'user');

    const currentContext = this.userContext.get(sessionId) || {};
    
    // Classify intent
    const intent = this.classifyIntent(userMessage, currentContext);
    
    // Generate response based on intent
    const response = await this.generateContextualResponse(intent, userMessage, currentContext);
    
    // Add bot response to history
    this.addToHistory(sessionId, response.text, 'bot');
    
    return response;
  }

  /**
   * Intent Classification System
   */
  classifyIntent(message, context) {
    const msg = message.toLowerCase();
    
    // Event Discovery Intents
    if (this.matchesPattern(msg, ['show', 'find', 'search', 'look for', 'events', 'what\'s happening'])) {
      return {
        type: 'EVENT_DISCOVERY',
        subType: this.detectEventDiscoverySubType(msg),
        entities: this.extractEventEntities(msg)
      };
    }
    
    // Navigation Intents
    if (this.matchesPattern(msg, ['how do i', 'take me to', 'go to', 'navigate', 'where is', 'show me page'])) {
      return {
        type: 'NAVIGATION',
        subType: this.detectNavigationTarget(msg),
        entities: {}
      };
    }
    
    // Information Intents
    if (this.matchesPattern(msg, ['what is', 'what do', 'how does', 'explain', 'tell me about', 'what\'s the difference'])) {
      return {
        type: 'INFORMATION',
        subType: this.detectInformationTopic(msg),
        entities: {}
      };
    }
    
    // Action Intents
    if (this.matchesPattern(msg, ['register', 'rsvp', 'attend', 'apply', 'filter', 'clear', 'save'])) {
      return {
        type: 'ACTION',
        subType: this.detectActionType(msg),
        entities: this.extractActionEntities(msg)
      };
    }
    
    // Status Check Intents
    if (this.matchesPattern(msg, ['am i', 'what role', 'what filters', 'where am i', 'my location'])) {
      return {
        type: 'STATUS_CHECK',
        subType: this.detectStatusType(msg),
        entities: {}
      };
    }
    
    // Greeting
    if (this.matchesPattern(msg, ['hello', 'hi', 'hey', 'good morning', 'good afternoon'])) {
      return { type: 'GREETING', subType: null, entities: {} };
    }
    
    // Fallback
    return { type: 'UNKNOWN', subType: null, entities: {} };
  }

  /**
   * Pattern matching helper
   */
  matchesPattern(message, patterns) {
    return patterns.some(pattern => message.includes(pattern));
  }

  /**
   * Detect event discovery sub-types
   */
  detectEventDiscoverySubType(msg) {
    if (msg.includes('near me') || msg.includes('nearby')) return 'NEARBY';
    if (msg.includes('category') || msg.includes('type')) return 'BY_CATEGORY';
    if (msg.includes('date') || msg.includes('when') || msg.includes('weekend') || msg.includes('today') || msg.includes('tomorrow')) return 'BY_DATE';
    if (msg.includes('free') || msg.includes('price')) return 'BY_PRICE';
    return 'GENERAL';
  }

  /**
   * Extract event-related entities
   */
  extractEventEntities(msg) {
    const entities = {};
    
    // Categories
    const categories = ['music', 'sports', 'workshop', 'exhibition', 'college', 'religious', 'promotion'];
    categories.forEach(cat => {
      if (msg.includes(cat)) entities.category = cat;
    });
    
    // Distance
    const distanceMatch = msg.match(/(\d+)\s*(km|kilometer)/i);
    if (distanceMatch) entities.distance = parseInt(distanceMatch[1]);
    
    // Time references
    if (msg.includes('today')) entities.dateRange = 'today';
    else if (msg.includes('tomorrow')) entities.dateRange = 'tomorrow';
    else if (msg.includes('weekend')) entities.dateRange = 'weekend';
    else if (msg.includes('week')) entities.dateRange = 'week';
    else if (msg.includes('month')) entities.dateRange = 'month';
    
    // Price
    if (msg.includes('free')) entities.price = 'free';
    
    return entities;
  }

  /**
   * Detect navigation target
   */
  detectNavigationTarget(msg) {
    if (msg.includes('create event') || msg.includes('add event')) return 'CREATE_EVENT';
    if (msg.includes('profile') || msg.includes('my account')) return 'PROFILE';
    if (msg.includes('login') || msg.includes('sign in')) return 'LOGIN';
    if (msg.includes('register') || msg.includes('sign up')) return 'REGISTER';
    if (msg.includes('map') || msg.includes('home')) return 'MAP';
    return 'UNKNOWN';
  }

  /**
   * Detect information topic
   */
  detectInformationTopic(msg) {
    if (msg.includes('create event') || msg.includes('add event')) return 'CREATE_EVENT_HELP';
    if (msg.includes('organizer') || msg.includes('role')) return 'ROLES';
    if (msg.includes('review')) return 'REVIEWS';
    if (msg.includes('filter')) return 'FILTERS';
    return 'GENERAL';
  }

  /**
   * Detect action type
   */
  detectActionType(msg) {
    if (msg.includes('register') || msg.includes('rsvp') || msg.includes('attend')) return 'ATTEND_EVENT';
    if (msg.includes('apply') || msg.includes('filter')) return 'APPLY_FILTER';
    if (msg.includes('clear')) return 'CLEAR_FILTER';
    return 'UNKNOWN';
  }

  /**
   * Extract action entities
   */
  extractActionEntities(msg) {
    const entities = {};
    
    // Event name (simple extraction)
    const eventMatch = msg.match(/for\s+(.+?)(?:\s+event)?$/i);
    if (eventMatch) entities.eventName = eventMatch[1];
    
    // Filter type
    if (msg.includes('music')) entities.filterCategory = 'music';
    if (msg.includes('sports')) entities.filterCategory = 'sports';
    
    return entities;
  }

  /**
   * Detect status check type
   */
  detectStatusType(msg) {
    if (msg.includes('logged in') || msg.includes('authenticated')) return 'AUTH_STATUS';
    if (msg.includes('role')) return 'USER_ROLE';
    if (msg.includes('filter')) return 'ACTIVE_FILTERS';
    if (msg.includes('location')) return 'LOCATION';
    return 'GENERAL';
  }

  /**
   * Generate contextual response
   */
  async generateContextualResponse(intent, userMessage, context) {
    const response = {
      text: '',
      actions: [],
      suggestions: []
    };

    switch (intent.type) {
      case 'GREETING':
        response.text = this.generateGreeting(context);
        response.suggestions = this.getDefaultSuggestions(context);
        break;

      case 'EVENT_DISCOVERY':
        response.text = await this.handleEventDiscovery(intent, context);
        response.actions = this.getEventDiscoveryActions(intent, context);
        break;

      case 'NAVIGATION':
        response.text = this.handleNavigation(intent, context);
        response.actions = this.getNavigationActions(intent, context);
        break;

      case 'INFORMATION':
        response.text = this.handleInformation(intent, context);
        break;

      case 'ACTION':
        response.text = this.handleAction(intent, context);
        response.actions = this.getActionCommands(intent, context);
        break;

      case 'STATUS_CHECK':
        response.text = this.handleStatusCheck(intent, context);
        break;

      default:
        response.text = this.handleUnknown(userMessage, context);
        response.suggestions = this.getDefaultSuggestions(context);
    }

    return response;
  }

  /**
   * Generate personalized greeting
   */
  generateGreeting(context) {
    const userName = context.user?.name || 'there';
    const role = context.user?.role || 'guest';
    
    let greeting = `Hello ${userName}! 👋 `;
    
    if (role === 'organizer') {
      greeting += "As an event organizer, I can help you create and manage events, or discover what's happening around you.";
    } else if (role === 'admin') {
      greeting += "As an admin, you have full access to all features including the admin panel and event moderation.";
    } else if (role === 'user') {
      greeting += "I can help you discover exciting events near you!";
    } else {
      greeting += "I'm your Event Assistant! I can help you find events, get directions, and answer questions. Want to create an account to unlock more features?";
    }
    
    return greeting;
  }

  /**
   * Handle event discovery intent
   */
  async handleEventDiscovery(intent, context) {
    const { subType, entities } = intent;
    const { events, location, filters } = context;

    // Check if location is needed but not available
    if (subType === 'NEARBY' && !location) {
      return "I'd love to help you find nearby events! However, I need your location permission first. Would you like to enable location access? Alternatively, you can search by entering a specific location or area.";
    }

    // Filter events based on entities
    let matchingEvents = events || [];
    
    if (entities.category) {
      matchingEvents = matchingEvents.filter(e => 
        e.category?.toLowerCase().includes(entities.category)
      );
    }
    
    if (entities.price === 'free') {
      matchingEvents = matchingEvents.filter(e => !e.price || e.price === 0);
    }

    // Build response
    if (matchingEvents.length === 0) {
      return `I couldn't find any events matching your criteria. Try adjusting your filters or browse all available events on the map.`;
    }

    const topEvents = matchingEvents.slice(0, 3);
    let response = `I found ${matchingEvents.length} event${matchingEvents.length > 1 ? 's' : ''} for you:\n\n`;
    
    topEvents.forEach((event, idx) => {
      response += `${idx + 1}. **${event.title}**\n`;
      response += `   📍 ${event.location}\n`;
      response += `   📅 ${new Date(event.date).toLocaleDateString()}\n`;
      if (event.category) response += `   🏷️ ${event.category}\n`;
      response += '\n';
    });

    if (matchingEvents.length > 3) {
      response += `...and ${matchingEvents.length - 3} more events. Would you like to apply these filters to the map?`;
    }

    return response;
  }

  /**
   * Handle navigation intent
   */
  handleNavigation(intent, context) {
    const { subType } = intent;
    const { user } = context;

    switch (subType) {
      case 'CREATE_EVENT':
        if (!user) {
          return "To create events, you need to register as an Event Organizer. Would you like me to take you to the registration page? I can explain the organizer registration process.";
        } else if (user.role === 'user') {
          return "You're currently registered as a regular user. To create events, you need to upgrade to an Event Organizer account. You can do this from your Profile page under Account Settings. Would you like me to navigate there?";
        } else if (user.role === 'organizer' || user.role === 'admin') {
          return "Great! As an organizer, you can create events by clicking 'Create Event' in the navigation bar. You'll need to provide:\n\n• Event title and description\n• Location (click on map or enter manually)\n• Date and time\n• Category (Music, Sports, Workshop, etc.)\n• Optional: Photos, end date\n\nWould you like me to open the Create Event page?";
        }
        break;

      case 'PROFILE':
        if (!user) {
          return "You need to be logged in to access your profile. Would you like to log in or create an account?";
        }
        return "I'll take you to your profile page where you can view your attended events, organized events (if you're an organizer), and update your account settings.";

      case 'LOGIN':
        if (user) {
          return `You're already logged in as ${user.name}. Is there something specific you'd like to do?`;
        }
        return "I'll take you to the login page. You can sign in with your email and password, or use Google/Facebook login.";

      default:
        return "I can help you navigate to different pages. Try asking 'Take me to my profile' or 'How do I create an event?'";
    }
  }

  /**
   * Handle information requests
   */
  handleInformation(intent, context) {
    const { subType } = intent;

    switch (subType) {
      case 'CREATE_EVENT_HELP':
        return "To create an event, you'll need:\n\n1. **Basic Info**: Title, description, category\n2. **Location**: Click on the map or enter address manually\n3. **Date & Time**: When your event starts (and optionally ends)\n4. **Optional**: Upload photos, set price, add additional details\n\nAll events go through AI moderation and admin approval before appearing on the map.";

      case 'ROLES':
        return "We have three user roles:\n\n🙋 **Regular User**: Can browse events, RSVP, leave reviews\n\n👔 **Event Organizer**: All user features + create and manage events\n\n👑 **Admin**: Full access including event moderation and user management\n\nYou can upgrade to Organizer from your profile settings!";

      case 'FILTERS':
        return "Our advanced filtering system lets you:\n\n📂 Filter by category (Music, Sports, Workshop, etc.)\n📍 Set distance radius from your location\n📅 Choose date ranges or time of day\n💰 Filter by price (including free events)\n⭐ Save your favorite filter combinations\n\nClick the 'Advanced Filters' button to explore all options!";

      default:
        return "I can explain various features of the platform. Try asking about 'How do I create an event?', 'What are the different roles?', or 'How do filters work?'";
    }
  }

  /**
   * Handle action requests
   */
  handleAction(intent, context) {
    const { subType, entities } = intent;
    const { user } = context;

    switch (subType) {
      case 'ATTEND_EVENT':
        if (!user) {
          return "You need to be logged in to RSVP for events. Would you like to create an account? It only takes a minute!";
        }
        if (entities.eventName) {
          return `I'll help you register for ${entities.eventName}. Click on the event marker on the map or find it in the event list to RSVP.`;
        }
        return "Which event would you like to attend? You can click on any event marker on the map to see details and RSVP.";

      case 'APPLY_FILTER':
        if (entities.filterCategory) {
          return `Applying ${entities.filterCategory} filter to the map... You should now see only ${entities.filterCategory} events!`;
        }
        return "You can apply filters using the category chips at the top or click 'Advanced Filters' for more options.";

      case 'CLEAR_FILTER':
        return "Clearing all filters... You should now see all available events on the map!";

      default:
        return "I can help you with various actions like RSVPing to events, applying filters, or managing your profile. What would you like to do?";
    }
  }

  /**
   * Handle status check requests
   */
  handleStatusCheck(intent, context) {
    const { subType } = intent;
    const { user, location, filters } = context;

    switch (subType) {
      case 'AUTH_STATUS':
        if (user) {
          return `Yes, you're logged in as **${user.name}** (${user.email}). Your role is: **${user.role}**.`;
        }
        return "No, you're currently not logged in. You're browsing as a guest. Want to create an account to unlock more features?";

      case 'USER_ROLE':
        if (user) {
          const roleDescriptions = {
            'user': 'Regular User - You can browse and attend events',
            'organizer': 'Event Organizer - You can create and manage events',
            'admin': 'Administrator - You have full access to all features'
          };
          return `Your role is: **${user.role}** (${roleDescriptions[user.role] || 'Unknown role'})`;
        }
        return "You're currently a guest. Log in or register to get a user role!";

      case 'ACTIVE_FILTERS':
        const activeFilters = [];
        if (filters.categories?.length > 0) activeFilters.push(`Categories: ${filters.categories.join(', ')}`);
        if (filters.distance) activeFilters.push(`Distance: ${filters.distance}km`);
        if (filters.dateRange) activeFilters.push(`Date range active`);
        
        if (activeFilters.length === 0) {
          return "No filters are currently active. You're seeing all available events!";
        }
        return `Active filters:\n${activeFilters.map(f => `• ${f}`).join('\n')}`;

      case 'LOCATION':
        if (location) {
          return `Your location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}${location.accuracy ? `\nAccuracy: ${location.accuracy < 100 ? '🎯 Precise' : '📡 Approximate'}` : ''}`;
        }
        return "Location permission not granted. Enable location access to see nearby events!";

      default:
        return "I can check your login status, role, active filters, or location. What would you like to know?";
    }
  }

  /**
   * Handle unknown intents
   */
  handleUnknown(userMessage, context) {
    return `I'm not sure I understood that correctly. I can help you with:

• 🔍 **Finding events** - "Show me music events near me"
• 📍 **Navigation** - "Take me to create event page"
• ℹ️ **Information** - "How do I become an organizer?"
• ✅ **Actions** - "RSVP for this event"
• 📊 **Status** - "Am I logged in?"

What would you like to know?`;
  }

  /**
   * Get default suggestions
   */
  getDefaultSuggestions(context) {
    const suggestions = [];
    
    if (context.location) {
      suggestions.push("Show me events near me");
    } else {
      suggestions.push("Find events in my area");
    }
    
    if (!context.user) {
      suggestions.push("How do I create an account?");
    } else if (context.user.role === 'user') {
      suggestions.push("How do I become an organizer?");
    } else if (context.user.role === 'organizer') {
      suggestions.push("How do I create an event?");
    }
    
    suggestions.push("What's happening this weekend?");
    
    return suggestions;
  }

  /**
   * Get event discovery actions
   */
  getEventDiscoveryActions(intent, context) {
    return [
      { type: 'APPLY_FILTER', data: intent.entities },
      { type: 'SHOW_ON_MAP', data: intent.entities }
    ];
  }

  /**
   * Get navigation actions
   */
  getNavigationActions(intent, context) {
    return [
      { type: 'NAVIGATE', target: intent.subType }
    ];
  }

  /**
   * Get action commands
   */
  getActionCommands(intent, context) {
    return [
      { type: 'EXECUTE', command: intent.subType, data: intent.entities }
    ];
  }
}

export default new ContextAwareAIService();
