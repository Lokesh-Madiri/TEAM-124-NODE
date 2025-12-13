/**
 * ROLE AWARENESS AGENT
 * Determines user role and adjusts behavior/permissions accordingly
 */

const User = require('../../models/User');

class RoleAgent {
  constructor() {
    this.roleCapabilities = {
      user: {
        canCreateEvents: false,
        canModerate: false,
        canAnalyze: false,
        canViewAll: false,
        isAdmin: false,
        permissions: ['search', 'attend', 'recommend', 'view_public']
      },
      organizer: {
        canCreateEvents: true,
        canModerate: false,
        canAnalyze: true,
        canViewAll: false,
        isAdmin: false,
        permissions: ['search', 'attend', 'recommend', 'create', 'manage_own', 'analytics', 'view_public']
      },
      admin: {
        canCreateEvents: true,
        canModerate: true,
        canAnalyze: true,
        canViewAll: true,
        isAdmin: true,
        permissions: ['all']
      }
    };

    this.roleGreetings = {
      user: "Hi! I'm your AI Event Assistant. I can help you discover amazing events and get personalized recommendations.",
      organizer: "Hello Event Organizer! I can help you find events, create compelling descriptions, and analyze your event performance.",
      admin: "Welcome Admin! I can assist with event moderation, platform analytics, and governance insights."
    };
  }

  async determineRole(userId, providedRole = null) {
    try {
      // If role is provided in request, validate it
      if (providedRole) {
        const userFromDb = await User.findById(userId);
        if (userFromDb && userFromDb.role === providedRole) {
          return this.buildRoleContext(providedRole, userFromDb);
        }
      }

      // Fetch user from database to get actual role
      const user = await User.findById(userId);
      if (!user) {
        // Default to user role for anonymous/unknown users
        return this.buildRoleContext('user', null);
      }

      return this.buildRoleContext(user.role, user);

    } catch (error) {
      console.error('Error determining user role:', error);
      // Default to user role on error
      return this.buildRoleContext('user', null);
    }
  }

  buildRoleContext(role, userDoc) {
    const capabilities = this.roleCapabilities[role] || this.roleCapabilities.user;
    
    return {
      role,
      userId: userDoc?._id,
      userName: userDoc?.name,
      userEmail: userDoc?.email,
      ...capabilities,
      greeting: this.roleGreetings[role] || this.roleGreetings.user,
      contextualHelp: this.getContextualHelp(role),
      restrictions: this.getRoleRestrictions(role)
    };
  }

  getContextualHelp(role) {
    const helpTexts = {
      user: [
        "Ask me to find events near you",
        "Get personalized recommendations",
        "Learn about event details and timing",
        "Find events by category or date"
      ],
      organizer: [
        "Generate compelling event descriptions",
        "Get suggestions for event categories and tags",
        "Analyze your event performance",
        "Check for duplicate events",
        "Get tips to improve event visibility"
      ],
      admin: [
        "Review flagged events and content",
        "Get moderation insights and risk scores",
        "View platform analytics and trends",
        "Manage user reports and safety issues",
        "Monitor system health and performance"
      ]
    };

    return helpTexts[role] || helpTexts.user;
  }

  getRoleRestrictions(role) {
    const restrictions = {
      user: [
        "Cannot create events (upgrade to organizer)",
        "Cannot access moderation tools",
        "Cannot view private analytics"
      ],
      organizer: [
        "Cannot moderate other users' content",
        "Cannot access admin-level analytics",
        "Cannot manage platform settings"
      ],
      admin: [
        "Full access - no restrictions"
      ]
    };

    return restrictions[role] || restrictions.user;
  }

  /**
   * Check if user has permission for specific action
   */
  hasPermission(roleContext, action) {
    if (roleContext.permissions.includes('all')) return true;
    return roleContext.permissions.includes(action);
  }

  /**
   * Get role-specific response formatting
   */
  formatResponseForRole(roleContext, baseResponse) {
    const rolePrefix = {
      user: "🎉 ",
      organizer: "📊 ",
      admin: "🛡️ "
    };

    const prefix = rolePrefix[roleContext.role] || "";
    
    // Add role-specific context to responses
    if (roleContext.role === 'organizer' && baseResponse.includes('event')) {
      baseResponse += "\n\n💡 *Tip: I can help you create better event descriptions and analyze performance!*";
    } else if (roleContext.role === 'admin' && baseResponse.includes('flagged')) {
      baseResponse += "\n\n🔍 *Admin: Use 'review flagged events' to see moderation queue.*";
    }

    return prefix + baseResponse;
  }

  /**
   * Get role-appropriate error messages
   */
  getRoleErrorMessage(roleContext, errorType) {
    const errorMessages = {
      permission_denied: {
        user: "This feature requires organizer privileges. Would you like to upgrade your account?",
        organizer: "This action requires admin privileges.",
        admin: "An unexpected permission error occurred."
      },
      not_found: {
        user: "I couldn't find what you're looking for. Try a different search term.",
        organizer: "No events found matching your criteria. Consider broadening your search.",
        admin: "Resource not found. Check the ID and try again."
      },
      rate_limit: {
        user: "You're asking questions very quickly! Please wait a moment before trying again.",
        organizer: "Rate limit reached. Please wait before making more requests.",
        admin: "Admin rate limit exceeded. Please wait before continuing."
      }
    };

    return errorMessages[errorType]?.[roleContext.role] || 
           "An error occurred. Please try again.";
  }

  /**
   * Determine if user can access specific event data
   */
  canAccessEvent(roleContext, event) {
    // Admins can access everything
    if (roleContext.isAdmin) return true;

    // Organizers can access their own events and public events
    if (roleContext.canCreateEvents) {
      return event.status === 'approved' || 
             event.organizer.toString() === roleContext.userId?.toString();
    }

    // Regular users can only access approved public events
    return event.status === 'approved';
  }

  /**
   * Get role-specific data filtering
   */
  getDataFilter(roleContext) {
    if (roleContext.isAdmin) {
      // Admins see everything
      return {};
    } else if (roleContext.canCreateEvents) {
      // Organizers see approved events + their own
      return {
        $or: [
          { status: 'approved' },
          { organizer: roleContext.userId }
        ]
      };
    } else {
      // Regular users only see approved events
      return { status: 'approved' };
    }
  }
}

module.exports = RoleAgent;