const express = require('express');
const router = express.Router();
const enhancedAI = require('../controllers/enhancedAI');

// Get filtered events with advanced criteria
router.get('/events/filter', enhancedAI.getFilteredEvents);

// Get nearby events with distance calculation
router.get('/events/nearby', enhancedAI.getNearbyEvents);

// Get personalized event suggestions
router.post('/events/suggestions', enhancedAI.getEventSuggestions);

// Search events with natural language
router.post('/events/search', enhancedAI.searchEvents);

module.exports = router;
