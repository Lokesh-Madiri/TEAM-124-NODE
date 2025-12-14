# 🚀 Production Setup Guide

## Prerequisites

- Node.js 16+ installed
- MongoDB instance (local or Atlas)
- Gemini API key (https://makersuite.google.com/app/apikey)
- Git installed

---

## 📋 Quick Start (5 Minutes)

### 1. Clone & Install

```bash
# Clone repository
git clone <your-repo-url>
cd TEAM-124-NODE

# Install backend dependencies
cd event-map-ai/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

```bash
# Backend: Copy example and edit
cd event-map-ai/backend
cp .env.example .env

# Edit .env with your values
# Minimum required:
# - MONGODB_URI
# - JWT_SECRET (generate with: openssl rand -base64 32)
# - GEMINI_API_KEY (optional but recommended)
```

**Critical .env Variables:**
```env
MONGODB_URI=mongodb://localhost:27017/event-map-ai
JWT_SECRET=your-32-char-secret-key-here
GEMINI_API_KEY=your-gemini-key-here
FRONTEND_URL=http://localhost:5173
```

### 3. Database Setup

```bash
# Start MongoDB (if local)
mongod

# Run coordinate fix script (optional but recommended)
cd event-map-ai/backend
node utils/fixEventCoordinates.js
```

### 4. Start Services

```bash
# Terminal 1: Backend
cd event-map-ai/backend
npm start
# Should see: "Server running on port 5000"

# Terminal 2: Frontend  
cd event-map-ai/frontend
npm run dev
# Should see: "Local: http://localhost:5173/"
```

### 5. Access Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **API Health:** http://localhost:5000/api/health

---

## 🔐 Security Checklist

### Before Production Deployment:

- [ ] Change all default secrets in `.env`
- [ ] Use strong JWT_SECRET (min 32 characters)
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS for production domain
- [ ] Set NODE_ENV=production
- [ ] Review and restrict API rate limits
- [ ] Enable MongoDB authentication
- [ ] Secure file upload directory
- [ ] Set up firewall rules
- [ ] Implement API key rotation

### Generate Secure Secrets:

```bash
# JWT Secret (32 chars)
openssl rand -base64 32

# Session Secret (32 chars)
openssl rand -base64 32
```

---

## 🗄️ Database Configuration

### Option 1: Local MongoDB

```env
MONGODB_URI=mongodb://localhost:27017/event-map-ai
```

```bash
# Install MongoDB Community Edition
# https://www.mongodb.com/docs/manual/installation/

# Start MongoDB
mongod --dbpath /path/to/data
```

### Option 2: MongoDB Atlas (Recommended for Production)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster (free tier available)
3. Get connection string
4. Add to .env:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/event-map-ai?retryWrites=true&w=majority
```

### Database Indexes (Automatic)

The application automatically creates these indexes:
- Event location (2dsphere for geospatial queries)
- Event date (for filtering)
- User email (unique index)

---

## 🤖 AI Configuration

### Gemini API Setup

1. Get API key: https://makersuite.google.com/app/apikey
2. Add to .env:

```env
GEMINI_API_KEY=your-key-here
```

**Features enabled with Gemini:**
- Event classification
- AI-powered descriptions
- Content moderation
- Duplicate detection
- Smart search

**Without Gemini:**
- Falls back to keyword-based classification
- Manual event descriptions
- Basic duplicate detection still works

### ChromaDB (Optional)

```bash
# Run with Docker
docker run -p 8000:8000 chromadb/chroma

# Enable in .env
CHROMA_DB_URL=http://localhost:8000
CHROMA_DB_ENABLED=true
```

---

## 🔑 Social Authentication (Optional)

### Google OAuth

1. Create project: https://console.cloud.google.com/
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
5. Add to .env:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### Facebook OAuth

1. Create app: https://developers.facebook.com/
2. Add Facebook Login product
3. Configure OAuth redirect URI
4. Add to .env:

```env
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:5000/api/auth/facebook/callback
```

---

## 📦 Production Build

### Frontend Build

```bash
cd event-map-ai/frontend
npm run build

# Output in: dist/
# Serve with nginx, Apache, or static hosting
```

### Backend Production

```bash
cd event-map-ai/backend

# Set environment
export NODE_ENV=production

# Start with PM2 (recommended)
npm install -g pm2
pm2 start src/server.js --name event-map-api

# Or use node directly
node src/server.js
```

---

## 🌐 Deployment Options

### Option 1: Traditional VPS (DigitalOcean, AWS EC2, etc.)

```bash
# Install Node.js 16+
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
# https://www.mongodb.com/docs/manual/installation/

# Clone and setup
git clone <repo>
cd TEAM-124-NODE
# ... follow setup steps above

# Use PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 2: Vercel (Frontend) + Render (Backend)

**Frontend (Vercel):**
```bash
cd event-map-ai/frontend
vercel --prod
```

**Backend (Render):**
- Connect GitHub repo
- Set build command: `cd event-map-ai/backend && npm install`
- Set start command: `cd event-map-ai/backend && npm start`
- Add environment variables in Render dashboard

### Option 3: Docker Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## 🔧 Troubleshooting

### Backend won't start

```bash
# Check MongoDB connection
mongo --eval "db.adminCommand('ping')"

# Check environment variables
cat .env

# Check logs
tail -f event-map-ai/backend/logs/combined.log
```

### Frontend build fails

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 16+
```

### Database connection issues

```bash
# Test MongoDB connection
mongo mongodb://localhost:27017/event-map-ai

# Check firewall
sudo ufw status
sudo ufw allow 27017
```

### API returns 500 errors

```bash
# Check backend logs
cd event-map-ai/backend
cat logs/error.log

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

---

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# API health
curl http://localhost:5000/api/health

# Database status
mongo --eval "db.serverStatus()"
```

### Log Management

```bash
# Backend logs
cd event-map-ai/backend/logs
tail -f combined.log
tail -f error.log

# Rotate logs (PM2)
pm2 install pm2-logrotate
```

### Database Backup

```bash
# Backup MongoDB
mongodump --uri="mongodb://localhost:27017/event-map-ai" --out=/backup/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://localhost:27017/event-map-ai" /backup/20231201
```

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot connect to MongoDB" | Check MONGODB_URI, ensure MongoDB is running |
| "JWT secret not defined" | Set JWT_SECRET in .env |
| "CORS error" | Add frontend URL to FRONTEND_URL in .env |
| "Port already in use" | Change PORT in .env or kill process on port |
| "File upload fails" | Check uploads/ directory permissions |
| "Gemini API error" | Verify GEMINI_API_KEY, check API quota |

---

## 📞 Support

- **Documentation:** See README.md files in each directory
- **API Documentation:** http://localhost:5000/api-docs (if enabled)
- **Issues:** GitHub Issues
- **Logs:** Check `backend/logs/` directory

---

## ✅ Production Deployment Checklist

Before going live:

- [ ] All .env variables configured
- [ ] MongoDB backups configured
- [ ] HTTPS/SSL certificates installed
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Error logging working
- [ ] Health check endpoint responding
- [ ] File upload directory secured
- [ ] Social auth tested (if using)
- [ ] API keys secured and not in code
- [ ] Frontend build tested
- [ ] Performance tested under load
- [ ] Security audit completed
- [ ] Monitoring dashboard set up

---

**🎉 You're ready for production!**

For detailed feature documentation, see the main README.md file.
