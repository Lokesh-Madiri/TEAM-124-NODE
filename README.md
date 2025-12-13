---
# AI-Powered Event Viewer Web Application (MVP)

The **AI-Powered Event Viewer Web Application** is a web-based platform that helps users discover, explore, and participate in events using an interactive map and AI-driven search.
It combines **geospatial visualization**, **Machine Learning**, and **Generative AI** to make event discovery faster, smarter, and more intuitive for users, organizers, and administrators.

This project represents a **Minimum Viable Product (MVP)** built for real-world usability .
---

## Problem Statement

Event information is often scattered across multiple platforms and presented in unstructured formats. Users find it difficult to discover nearby or relevant events, while event organizers struggle with categorization, visibility, and management. Traditional event platforms lack intelligent search, personalization, and automation.

---

## Solution Overview

This project solves the problem by introducing:

- A map-based event discovery system
- An AI Event Assistant for conversational search
- Machine Learning for automatic event classification
- RAG (Retrieval-Augmented Generation) to answer queries using real event data
- Agent-based workflows for recommendations and moderation

Together, these features create an intelligent and scalable event management platform.

---

## Why This Matters

- Users easily find events relevant to their location and interests
- Organizers save time using AI-assisted event creation and management
- Admins benefit from automated moderation and oversight
- Communities experience better engagement and participation

The system improves productivity and accessibility using AI.

---

## Core MVP Features

App User

- View events on an interactive map
- View event details
- Login and logout
- RSVP to events
- Ask questions using the AI assistant

Event Organizer

- Create, update, and delete events
- Assign event locations on the map
- Get AI assistance for event descriptions

Admin

- Approve or reject events
- Manage users and events
- Moderate AI-flagged content

---

## Tech Stack

Frontend

- React / Next.js
- JavaScript or TypeScript
- Leaflte API

Backend

- Python (FastAPI or Django) OR Node.js (Express)

AI and Machine Learning

- Python
- LangChain
- ChromaDB (vector database)
- Gemini API
- Traditional ML models for classification

Database

- PostgreSQL
- PostGIS for geolocation support

Authentication

- JWT-based authentication
- Role-based access control (RBAC)

---

## Architecture / Design

1. User accesses the web application
2. Events are fetched from the backend and displayed on the map
3. User queries the AI assistant
4. Query embeddings are matched in ChromaDB
5. Relevant event data is injected into the LLM (RAG)
6. Agents handle search, ranking, or moderation tasks
7. AI response is returned to the user

---

## Assumptions

- Users have internet access during usage
- Event organizers provide accurate event information
- API keys for external LLMs are provided by the user
- Local LLMs are pre-downloaded if used
- MVP focuses on functionality rather than large-scale optimization

---

## Installation Instructions

Clone the repository

git clone https://github.com/Lokesh-Madiri/TEAM-124-NODE.git

cd TEAM-124-NODE

Backend setup

cd backend
pip install -r requirements.txt
uvicorn main:app --reload

Frontend setup

cd frontend
npm install
npm run dev

---

## Usage Examples

- Open the application in a browser
- View nearby events on the map
- Click on an event marker to see details
- Login to RSVP for events
- Ask the AI assistant questions like:
  "What events are happening near me this weekend?"

---

## Configuration Detailss

Create a `.env` file and add:

DATABASE_URL
JWT_SECRET
LLM_API_KEY (Gemini)

If using local LLMs, ensure they are downloaded before running the project.

---

## Limitations and Future Scope

Limitations

- Basic personalization in MVP
- Limited ML model accuracy
- Dependence on external APIs or local hardware
- No real-time event updates

Future Scope

- Advanced event recommendations
- Multi-agent orchestration using MCP
- Real-time notifications
- Event reviews and ratings
- Improved guardrails and evaluations
- Virtual and hybrid event support

---
