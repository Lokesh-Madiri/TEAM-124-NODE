const Event = require('../models/Event');

/**
 * Enhanced AI Chat Controller with Context-Aware Responses
 */
class EnhancedAIChatController {
  
  /**
   * Get filtered events based on advanced criteria
   */
  async getFilteredEvents(req, res) {
    try {
      const {
        categories,
        location,
        distance,
        dateRange,
        priceRange,
        timeSlots,
        status,
        attendeeRange
      } = req.query;

      let query = {};

      // Category filter
      if (categories) {
        const categoryArray = Array.isArray(categories) ? categories : categories.split(',');
        query.category = { $in: categoryArray.map(c => new RegExp(c, 'i')) };
      }

      // Status filter
      if (status) {
        const statusArray = Array.isArray(status) ? status : status.split(',');
        query.status = { $in: statusArray };
      } else {
        query.status = 'approved'; // Default to approved events
      }

      // Date range filter
      if (dateRange) {
        const { start, end } = JSON.parse(dateRange);
        query.date = {};
        if (start) query.date.$gte = new Date(start);
        if (end) query.date.$lte = new Date(end);
      }

      // Price range filter
      if (priceRange) {
        const { min, max, free } = JSON.parse(priceRange);
        if (free) {
          query.$or = [
            { price: { $exists: false } },
            { price: 0 }
          ];
        } else {
          query.price = { $gte: min, $lte: max };
        }
      }

      // Location-based filtering
      let events;
      if (location && distance) {
        const { lat, lng } = JSON.parse(location);
        const distanceInMeters = parseFloat(distance) * 1000;

        events = await Event.find(query)
          .where('locationCoords')
          .near({
            center: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            maxDistance: distanceInMeters
          })
          .populate('organizer', 'name email')
          .populate('attendees', 'name')
          .lean();
      } else {
        events = await Event.find(query)
          .populate('organizer', 'name email')
          .populate('attendees', 'name')
          .lean();
      }

      // Time slot filter (post-query filtering)
      if (timeSlots) {
        const slots = JSON.parse(timeSlots);
        const TIME_SLOTS = {
          morning: { start: 6, end: 12 },
          afternoon: { start: 12, end: 17 },
          evening: { start: 17, end: 21 },
          night: { start: 21, end: 6 }
        };

        events = events.filter(event => {
          const eventHour = new Date(event.date).getHours();
          return slots.some(slot => {
            const timeSlot = TIME_SLOTS[slot];
            if (!timeSlot) return false;
            if (slot === 'night') {
              return eventHour >= 21 || eventHour < 6;
            }
            return eventHour >= timeSlot.start && eventHour < timeSlot.end;
          });
        });
      }

      // Attendee range filter
      if (attendeeRange) {
        const { min, max } = JSON.parse(attendeeRange);
        events = events.filter(event => {
          const count = event.attendees?.length || 0;
          return count >= min && count <= max;
        });
      }

      res.json({
        success: true,
        count: events.length,
        events: events
      });

    } catch (error) {
      console.error('Error filtering events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to filter events',
        message: error.message
      });
    }
  }

  /**
   * Get nearby events with distance calculation
   */
  async getNearbyEvents(req, res) {
    try {
      const { lat, lng, radius = 10 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required'
        });
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusInMeters = parseFloat(radius) * 1000;

      const events = await Event.find({
        status: 'approved',
        locationCoords: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: radiusInMeters
          }
        }
      })
        .populate('organizer', 'name email')
        .populate('attendees', 'name')
        .limit(50)
        .lean();

      // Calculate distance for each event
      const eventsWithDistance = events.map(event => {
        const distance = calculateDistance(
          latitude,
          longitude,
          event.locationCoords.coordinates[1],
          event.locationCoords.coordinates[0]
        );

        return {
          ...event,
          distance: Math.round(distance * 100) / 100 // Round to 2 decimals
        };
      });

      // Sort by distance
      eventsWithDistance.sort((a, b) => a.distance - b.distance);

      res.json({
        success: true,
        userLocation: { lat: latitude, lng: longitude },
        radius: radius,
        count: eventsWithDistance.length,
        events: eventsWithDistance
      });

    } catch (error) {
      console.error('Error getting nearby events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get nearby events',
        message: error.message
      });
    }
  }

  /**
   * Get event suggestions based on user context
   */
  async getEventSuggestions(req, res) {
    try {
      const { userId, location, preferences } = req.body;

      let query = { status: 'approved' };
      
      // Future date filter
      query.date = { $gte: new Date() };

      // Get user's attended events to understand preferences
      if (userId) {
        const userEvents = await Event.find({
          attendees: userId
        }).select('category').lean();

        if (userEvents.length > 0) {
          // Extract frequently attended categories
          const categoryCount = {};
          userEvents.forEach(event => {
            categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
          });

          const topCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category]) => category);

          if (topCategories.length > 0) {
            query.category = { $in: topCategories.map(c => new RegExp(c, 'i')) };
          }
        }
      }

      // Apply user preferences
      if (preferences?.categories) {
        query.category = { $in: preferences.categories.map(c => new RegExp(c, 'i')) };
      }

      if (preferences?.maxPrice) {
        query.$or = [
          { price: { $lte: preferences.maxPrice } },
          { price: { $exists: false } }
        ];
      }

      let suggestions;

      // Location-based suggestions
      if (location?.lat && location?.lng) {
        suggestions = await Event.find(query)
          .where('locationCoords')
          .near({
            center: {
              type: 'Point',
              coordinates: [location.lng, location.lat]
            },
            maxDistance: 20000 // 20km
          })
          .populate('organizer', 'name')
          .limit(10)
          .lean();
      } else {
        suggestions = await Event.find(query)
          .populate('organizer', 'name')
          .sort({ date: 1 })
          .limit(10)
          .lean();
      }

      res.json({
        success: true,
        count: suggestions.length,
        suggestions: suggestions
      });

    } catch (error) {
      console.error('Error getting event suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get event suggestions',
        message: error.message
      });
    }
  }

  /**
   * Search events with natural language
   */
  async searchEvents(req, res) {
    try {
      const { query: searchQuery } = req.body;

      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      // Create search conditions
      const searchConditions = {
        $or: [
          { title: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { location: { $regex: searchQuery, $options: 'i' } },
          { category: { $regex: searchQuery, $options: 'i' } }
        ],
        status: 'approved'
      };

      const events = await Event.find(searchConditions)
        .populate('organizer', 'name email')
        .populate('attendees', 'name')
        .limit(20)
        .lean();

      res.json({
        success: true,
        query: searchQuery,
        count: events.length,
        events: events
      });

    } catch (error) {
      console.error('Error searching events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search events',
        message: error.message
      });
    }
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = new EnhancedAIChatController();
