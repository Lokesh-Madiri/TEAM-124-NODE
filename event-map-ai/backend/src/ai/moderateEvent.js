// Enhanced AI moderation service
// In a real implementation, this would use ML models to detect inappropriate content

class EventModerator {
  // Enhanced function to moderate events for inappropriate content
  async moderateEvent(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    // Enhanced keyword-based moderation with severity levels
    const moderationRules = {
      nsfw: {
        keywords: [
          'porn', 'sex', 'xxx', 'adult', 'nude', 'naked', 'erotic', 'explicit',
          'XXX', 'NSFW', 'sexual', 'intimate', 'sensual'
        ],
        severity: 'high',
        weight: 1.0
      },
      abuse: {
        keywords: [
          'hate', 'racist', 'discriminate', 'violence', 'threat', 'harass',
          'abuse', 'bully', 'attack', 'offensive', 'insult'
        ],
        severity: 'high',
        weight: 1.0
      },
      spam: {
        keywords: [
          'click here', 'buy now', 'limited time', 'act fast', 'free money', 
          'miracle cure', 'lose weight', 'get rich', 'no risk', 'guarantee',
          'spam', 'scam', 'fraud', 'rip off'
        ],
        severity: 'medium',
        weight: 0.8
      },
      fake: {
        keywords: [
          'fake event', 'not real', 'scam', 'fraud', 'rip off', 'bogus',
          'phony', 'sham', 'hoax'
        ],
        severity: 'high',
        weight: 1.0
      }
    };
    
    let warnings = [];
    let riskScore = 0;
    let flaggedCategories = [];
    
    // Check each category
    for (const [category, rule] of Object.entries(moderationRules)) {
      let categoryMatches = 0;
      
      for (const keyword of rule.keywords) {
        const regex = new RegExp('\\b' + keyword + '\\b', 'gi');
        const matches = (text.match(regex) || []).length;
        categoryMatches += matches;
      }
      
      if (categoryMatches > 0) {
        const severityMultiplier = rule.severity === 'high' ? 1.0 : 
                                 rule.severity === 'medium' ? 0.7 : 0.5;
        
        const categoryRisk = categoryMatches * rule.weight * severityMultiplier;
        riskScore += categoryRisk;
        flaggedCategories.push(category);
        
        warnings.push({
          category: category,
          matches: categoryMatches,
          severity: rule.severity,
          message: `${category.charAt(0).toUpperCase() + category.slice(1)} content detected (${categoryMatches} matches)`
        });
      }
    }
    
    // Additional checks
    // Check for excessive caps (potential spam)
    const capsRatio = this.calculateCapsRatio(text);
    if (capsRatio > 0.5) {
      riskScore += 0.3;
      warnings.push({
        category: 'formatting',
        severity: 'low',
        message: 'Excessive capitalization detected'
      });
    }
    
    // Check for excessive exclamation marks (potential spam)
    const exclamations = (text.match(/!/g) || []).length;
    if (exclamations > 5) {
      riskScore += 0.2;
      warnings.push({
        category: 'formatting',
        severity: 'low',
        message: 'Excessive exclamation marks detected'
      });
    }
    
    // Cap risk score at 1.0
    riskScore = Math.min(riskScore, 1.0);
    
    return {
      riskScore: parseFloat(riskScore.toFixed(2)),
      warnings: warnings,
      isFlagged: riskScore > 0.5,
      flaggedCategories: flaggedCategories
    };
  }
  
  // Calculate ratio of capital letters
  calculateCapsRatio(text) {
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return 0;
    
    const caps = letters.replace(/[^A-Z]/g, '').length;
    return caps / letters.length;
  }
  
  // Get detailed moderation report
  getModerationReport(title, description) {
    const result = this.moderateEvent(title, description);
    
    return {
      ...result,
      titleAnalysis: this.analyzeTitle(title),
      descriptionAnalysis: this.analyzeDescription(description)
    };
  }
  
  // Analyze title quality
  analyzeTitle(title) {
    const analysis = {
      length: title.length,
      wordCount: title.trim().split(/\s+/).length,
      hasExcessiveCaps: this.calculateCapsRatio(title.toLowerCase()) > 0.5,
      exclamationCount: (title.match(/!/g) || []).length
    };
    
    return analysis;
  }
  
  // Analyze description quality
  analyzeDescription(description) {
    const analysis = {
      length: description.length,
      wordCount: description.trim().split(/\s+/).length,
      paragraphCount: description.split('\n\n').length
    };
    
    return analysis;
  }
}

module.exports = new EventModerator();