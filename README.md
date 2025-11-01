# TwinCity – Digital Twin Scenario Planning Tool

**TwinCity** is a proof-of-concept web-based **Digital Twin Scenario Planning Tool** designed for the **Nelson City Council**.  
It allows users to simulate proposed building developments on real-world parcels, automatically validate them against local zoning rules, and receive AI-assisted explanations of compliance outcomes.

This project demonstrates how **geospatial analytics**, **automated rule checking**, and **AI-driven explainability** can merge into a single interactive planning tool.

---

## Features

### Scenario Planning and Validation
- Interactive map using **Leaflet.js** with **OpenStreetMap** basemaps.
- Parcel visualisation via **GeoJSON** boundary polygons.
- User inputs for **height**, **footprint area**, and **setback distance**.
- Automated validation logic for:
  - Maximum height  
  - Minimum setback  
  - Maximum site coverage  
- Real-time visual feedback:
  - Green overlay for compliance  
  - Red overlay for non-compliance  

### Geospatial Analysis
- **Turf.js** used for geometric operations:
  - Calculating parcel area
  - Generating ghost building footprints
  - Applying setback buffers
  - Computing coverage percentages

### AI-Driven Rule Explanations (Simulated RAG)
- Simulated **Retrieval-Augmented Generation (RAG)** system.  
- When a scenario fails, users can click **“Why?”** to get context-based explanations.  
- Uses **fake embeddings** + **cosine similarity** to retrieve relevant rule text.  
- No external API costs — all processing is done locally.  
- Example output:  Your building height exceeds the permitted maximum. The maximum height for this zone is 7.5 m. (Source: Residential Zone 8.4.3)

### Backend & Data Management
- Built on **Node.js** and **Express.js**.  
- **MongoDB Atlas** for database storage.  
- Automatic seeding of:
- `parcel.geojson` (test parcel)
- `rules.json` (zone rule limits)
- `rules_text.json` (AI explanation text)

---

## Tech Stack

| Layer | Technology | Purpose |
|--------|-------------|----------|
| Frontend | HTML, CSS, JavaScript | UI and interactivity |
| Mapping | Leaflet.js | Map rendering and parcel display |
| Geospatial | Turf.js | Geometry, buffering, area, centroid |
| Backend | Node.js, Express.js | API routes and rule validation |
| Database | MongoDB + Mongoose | Store parcels, rules, and scenarios |
| AI Simulation | Custom cosine similarity engine | Mimics RAG-based retrieval |
| Hosting | Local / Node environment | Development & testing |

---

## Project Structure
<img width="290" height="559" alt="image" src="https://github.com/user-attachments/assets/7a0dc3ac-e1bf-4983-aa98-aad92e5e2f99" />

---

## Installation and Setup

### 1. Clone the repository
```bash
git clone https://github.com/Yugenzariah/TwinCity.git
cd TwinCity
```
### 2. Install dependencies
```bash
npm install
```
### 3. Configure environment variables
Create a .env file in the root directory:
```bash
MONGO_URI=<your_mongodb_connection_string>
PORT=4000
```
### 4. Start the server
```bash
cd server <br>
node app.js
```
### 5. Access the application
```bash
http://localhost:4000
```

---
### How It Works
**Step 1 – Load Parcel**

The app loads a sample parcel from /data/parcel.geojson, calculates its area, and stores it in MongoDB.

**Step 2 – Input Scenario**

User enters proposed building data:

Height (m)

Footprint (m²)

Setback (m)

**Step 3 – Validate**

Backend (/api/scenarios) compares these inputs to zoning limits stored in MongoDB:

heightOK = heightM <= rule.maxHeightM;
coverageOK = (footprintSqm / parcel.areaSqm) * 100 <= rule.maxSiteCoveragePct;
setbackOK = minSetbackM >= rule.minSetbackM;

**Step 4 – Visual Feedback**

Frontend updates Leaflet overlay:

Green = allOK

Red = failed

**Step 5 – Explain**

User clicks “Why?” → triggers /api/ask.
Backend runs a simulated embedding search to return relevant rule texts using cosine similarity.

---

### API Endpoints
| Route |	Method | Description |
|--------|-------------|----------|
| /api/parcels |	GET	| Retrieve parcel GeoJSON |
| /api/rules | GET | Retrieve zoning rules |
| /api/scenarios | POST	| Validate building scenario |
| /api/ask | POST	| Retrieve explanation for failed compliance |

---

### Database Models
| Model | Description|
|--------|-------------|
| Parcel	| Stores zone, GeoJSON geometry, area |
| Rule | Numeric zoning limits (height, setback, coverage) |
| RuleText | Rule text + simulated embeddings for AI |
| Scenario | User submissions and validation results |

---

### Future Work

Multi-Parcel Interaction: Allow multiple parcels to be selected and compared.

3D Visualisation: Integrate BIM data or Three.js for 3D modelling.

Real-Time Data: Connect to live GIS or IoT environmental feeds.

AI Suggestions: Implement actual LLM-based RAG for natural language explanations.

Council Integration: Link directly to Nelson City Council zoning data.

Mobile Version: Build an offline-capable React Native app for on-site inspections.

---

### Screenshots

Map interface with loaded parcel

Ghost building overlay drawn using Turf.js

Validation result (FAIL – red overlay)

Validation result (PASS – green overlay)

“Why?” explanation output panel

---

### License

This project was developed as part of the Bachelor of Information Technology – PRJ703 Capstone Project at NMIT (Nelson Marlborough Institute of Technology).
It is shared for academic demonstration purposes only.

--- 

### Author
Keith Jhaeron M. Cayatoc <br>
Bachelor of Information Technology, NMIT <br>
Nelson, New Zealand <br>
