# MedGuard-BD 
### AI-Powered Pharmaceutical Security & Drug Intelligence Ecosystem

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://medguard-bd-frontend.vercel.app)
[![API Status](https://img.shields.io/badge/API-Online-success?style=for-the-badge&logo=fastapi)](https://medguard-bd-backend.vercel.app)
[![Django](https://img.shields.io/badge/Django-5.0%2B-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://supabase.com/)
[![JWT](https://img.shields.io/badge/Auth-SimpleJWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## Live Deployments

- **Web Application**: [https://medguard-bd-frontend.vercel.app](https://medguard-bd-frontend.vercel.app)
- **Backend API**: [https://medguard-bd-backend.vercel.app/api/](https://medguard-bd-backend.vercel.app/api/)

---

##  Executive Summary

**MedGuard-BD** is an enterprise-grade pharmaceutical verification, supply chain tracking, and drug intelligence platform tailored specifically for Bangladesh’s healthcare ecosystem. The platform combats counterfeit and sub-potent medicine circulation through **SHA-256 cryptographic unit-level serialization**, empowers regulatory oversight by the **Directorate General of Drug Administration (DGDA)**, and provides healthcare providers and citizens with instant authenticity verification and AI health intelligence.

---

## 🏗️ 7-Tier Stakeholder Architecture

MedGuard-BD unifies all seven essential actors in Bangladesh's pharmaceutical landscape into a cohesive, role-protected ecosystem:

```
                          ┌────────────────────────┐
                          │     DGDA REGULATOR     │
                          │  (National Oversight)  │
                          └───────────┬────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       │                              │                              │
┌──────▼───────┐              ┌───────▼────────┐             ┌───────▼────────┐
│ MANUFACTURER │              │  DISTRIBUTOR   │             │   RESEARCHER   │
│ Production & │─────────────►│ Warehousing &  │             │ ADR Signals &  │
│ Unit QR DDP  │              │ Route Transit  │             │ Knowledge Graph│
└──────────────┘              └───────┬────────┘             └────────────────┘
                                      │
                              ┌───────▼────────┐
                              │    PHARMACY    │
                              │ POS Sales & QC │
                              └───────┬────────┘
                                      │
                      ┌───────────────┴───────────────┐
                      │                               │
              ┌───────▼────────┐              ┌───────▼────────┐
              │    CITIZEN     │◄────────────►│     DOCTOR     │
              │ Authentication │ Consultation │ Prescriptions  │
              │  & AI Passport │ & History    │ & Safety Audit │
              └────────────────┘              └────────────────┘
```

| Role | Responsibilities & Capabilities |
| :--- | :--- |
|  **DGDA (Regulator)** | National command center, counterfeit surveillance intelligence, nationwide recall enforcement, facility inspections, and division-level risk heatmaps. |
|  **Manufacturer** | Drug registration, batch serialization, QC test compliance, cryptographic **Digital Drug Passport (DDP)** unit QR minting, and voluntary recall triggers. |
|  **Distributor** | Warehouse management, fleet transit tracking across all 8 divisions, real-time location check-ins, route optimization, and transit risk telemetry. |
|  **Pharmacy** | Point-of-sale unit QR verification before dispensing, inventory control, automated expiry alerts, consumer purchase logging, and counterfeit reporting. |
|  **Doctor** | Teleconsultations, verified patient medication history access, e-prescriptions, drug-drug interaction warnings, and ADR reporting. |
|  **Researcher** | Pharmacovigilance signal detection, anonymized ADR analytics, hypothesis validation, clinical literature mining, and medical knowledge graphs. |
|  **Citizen / Patient** | Camera QR drug authenticity scanning, personal digital drug passport, AI medical assistant, interaction checker, dosage scheduler, and counterfeit reporting. |

---

##  Key Features

### 1.  Cryptographic Serialization & Digital Drug Passport (DDP)
- **Zero-Guesswork Unit Codes**: Every blister pack / vial carries an immutable SHA-256 digest tied to manufacturer credentials, batch numbers, and timestamps.
- **Instant Authenticity Scan**: Directly detects whether a medicine is genuine, unreleased, expired, or under an active DGDA recall.

### 2. Automated Nationwide Recall Engine
- When an out-of-spec test or adverse reaction spike is verified, DGDA or manufacturers issue an instant recall.
- Recalls automatically freeze inventory and prevent point-of-sale dispensing across all connected pharmacies nationwide.

### 3.  AI Clinical Intelligence & Pharmacovigilance
- **AI Health Assistant**: Natural language medical guidance for dosage forms, indications, and precautions in both English and Bengali.
- **Drug-Drug Interaction Checker**: Evaluates polypharmacy combinations against clinical interaction networks.
- **ADR Sentinel Detection**: Aggregates adverse reaction reports by district to flag substandard or contaminated batches before widespread harm.

### 4.  Supply Chain Telemetry & Route Risk Optimization
- Interactive Leaflet maps covering all 8 administrative divisions of Bangladesh.
- Real-time location checkpoints for in-transit consignments with transit time and route deviation tracking.

### 5.  Localization & Accessibility
- **Bilingual Interface**: Seamlessly switchable between English and Bangla (বাংলা).
- **Dual Theme**: High-contrast Dark and Light modes tailored for clinical and field environments.

---

## Technology Stack

| Component | Technology |
| :--- | :--- |
| **Backend Framework** | Django 5.0+ / Django REST Framework (DRF) |
| **Authentication** | djangorestframework-simplejwt (Stateless JWT Tokens) |
| **Database** | PostgreSQL via Supabase (Cloud) / SQLite3 (Local Dev) |
| **Frontend Framework** | React 19 + Vite |
| **Routing & State** | React Router v7 + Context API |
| **Mapping & Visuals** | Leaflet, React-Leaflet, Framer Motion |
| **Scanner Engine** | html5-qrcode (Webcam & mobile camera support) |
| **Icons & UI** | Lucide React, Phosphor Icons, SweetAlert2 |
| **Cloud Hosting** | Vercel (Serverless Python Backend & Frontend SPA) |

---

## 📂 Project Structure

```
MedGuard-BD/
├── backend/
│   ├── api/                       # API router endpoints
│   ├── core/                      # Core models (Medicine, Batch, Shipment, ADR, Recall)
│   │   ├── dgda_views.py          # DGDA command center and policy analytics
│   │   ├── counterfeit_intel_views.py # Counterfeit surveillance endpoints
│   │   └── views.py               # Core business logic and transactions
│   ├── doctor/                    # Doctor consultations, prescriptions, and history
│   ├── researcher/                # ADR analytics, literature mining, and knowledge graphs
│   ├── users/                     # CustomUser model and role profiles
│   ├── medguard/                  # Project configuration, settings, and root URLs
│   ├── requirements.txt           # Python backend dependencies
│   ├── vercel.json                # Serverless deployment configuration
│   └── seed_*.py                  # Database seeders (medicines, DGDA data, shipments)
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable UI components, layout, navbar, modals
│   │   ├── context/               # Auth, Theme, Language, Notification contexts
│   │   ├── pages/                 # Role-specific portals (citizen, dgda, doctor, etc.)
│   │   ├── services/              # Axios API clients
│   │   ├── App.jsx                # Protected route matrix
│   │   └── main.jsx               # Application entrypoint
│   ├── package.json               # Node.js dependencies
│   ├── vercel.json                # Single-page application routing configuration
│   └── vite.config.js             # Vite build configuration
└── README.md                      # Project documentation
```

---

##  Local Development Setup

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18.0 or higher
- **npm** or **pnpm**
- **Git**

---

### 1. Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # On Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # On macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   Create a `.env` file inside `backend/` using the template below:
   ```env
   # Database Configuration
   # Leave blank to use local SQLite, or provide your PostgreSQL connection string
   DATABASE_URL="sqlite:///db.sqlite3"

   # AI Assistant & Pharmacovigilance (Optional)
   OPENROUTER_API_KEY="your-openrouter-api-key-here"
   ```

5. **Apply database schema migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Seed baseline data (Optional for demonstration):**
   ```bash
   python create_test_users.py
   python seed_20_real_medicines.py
   python seed_dgda_data.py
   python seed_pharmacy_data.py
   python seed_research_data.py
   python seed_7_divisions_shipments.py
   ```

7. **Start the Django development server:**
   ```bash
   python manage.py runserver
   ```
   *The backend will be available at `http://127.0.0.1:8000`.*

---

### 2. Frontend Setup

1. **Open a new terminal and navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Configure frontend environment variables (Optional):**
   Create a `.env` file in `frontend/` if targeting a custom backend:
   ```env
   # For local development:
   VITE_API_URL=http://127.0.0.1:8000/api/

   # Or for deployed production API:
   # VITE_API_URL=https://medguard-bd-backend.vercel.app/api/
   ```

4. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   *The frontend will run at `http://localhost:5173`.*

---

## 👥 Role & Access Matrix

MedGuard-BD uses Role-Based Access Control (RBAC). For testing, seed users can be initialized via `create_test_users.py` or registered through `/register`:

| Stakeholder Role | Portal Access Route | Key Capabilities |
| :--- | :--- | :--- |
|  **DGDA Regulator** | `/dashboard/dgda/*` | Nationwide Command Center, Recalls, Entity Inspections |
|  **Manufacturer** | `/dashboard/manufacturer/*` | Batch Production, Unit QR Minting, Recalls |
|  **Distributor** | `/dashboard/distributor/*` | Transit Check-ins, Warehousing, Route Risk Analysis |
|  **Pharmacy** | `/dashboard/pharmacy/*` | Batch Verification, Inventory, Sales Dispensing |
|  **Doctor** | `/dashboard/doctor/*` | Teleconsultations, E-Prescriptions, Patient History |
|  **Researcher** | `/dashboard/researcher/*` | ADR Signal Detection, Clinical Datasets, Graph Explorer |
|  **Citizen** | `/dashboard/*` | Camera QR Scan, Personal Drug Passport, AI Medical Chat |

>  **Security Notice:** Initial test accounts use passwords set during the `create_test_users.py` seeding process. Change all default credentials before staging in production environments.

---

##  Key API Endpoints

###  Authentication (`/api/`)
- `POST /api/token/` — Obtain JWT access and refresh token pair.
- `POST /api/token/refresh/` — Refresh expired access token.
- `POST /api/users/register/` — Register a user with an associated role profile.
- `GET  /api/users/profile/` — Fetch authenticated user profile details.

###  Core Supply Chain (`/api/core/`)
- `GET|POST /api/core/manufacturer/medicines/` — Register and list pharmaceutical products.
- `GET|POST /api/core/manufacturer/batches/` — Generate batch and cryptographic unit QR codes.
- `POST /api/core/pharmacy/verify/` — Authenticate batch or unit QR code before retail sale.
- `GET|POST /api/core/pharmacy/sales/` — Log dispensed medication to citizen accounts.
- `POST /api/core/recall/` — Issue emergency nationwide batch recall.
- `POST /api/core/adr-report/` — Submit Adverse Drug Reaction (ADR) report.
- `POST /api/core/ai-assistant/` — Query AI healthcare assistant.
- `POST /api/core/interaction-check/` — Run multi-drug contraindication analysis.

###  DGDA Regulatory Oversight (`/api/core/dgda/`)
- `GET /api/core/dgda/command-center/` — Regulatory summary metrics and active alerts.
- `GET /api/core/dgda/batch-tracking/` — Complete custody lifecycle tracking for any batch.
- `GET /api/core/dgda/counterfeit-intel/` — Real-time surveillance of counterfeit reports.
- `GET /api/core/dgda/risk-heatmap/` — Geospatial division-level risk telemetry.

---

##  Testing & Verification

An automated end-to-end integration test suite is included in the backend:

```bash
cd backend
python test_end_to_end_chain.py
```

**Workflow Tested:**
1. **Manufacturer** creates medicine and initiates batch.
2. **Quality Control** records inspection results and releases batch.
3. Cryptographic **Digital Drug Passport (DDP)** unit codes are generated.
4. **Distributor** receives shipment, logs transit checkpoints, and delivers to pharmacy.
5. **Pharmacy** verifies unit QR code and dispenses medication to **Citizen**.
6. **Citizen** logs dosage in Digital Passport and submits feedback/ADR.
7. **DGDA** audits the immutable ledger and verifies chain-of-custody integrity.

---

##  Security Architecture

- **Stateless JWT Security**: Secure JSON Web Tokens with token expiration and rotation.
- **RBAC Enforcement**: Dual-layer security at Django REST Framework endpoints and React protected routes.
- **Cryptographic Hashing**: Salted SHA-256 digests prevent duplication and brute-force barcode counterfeiting.
- **Audit Trails**: All status transitions, deliveries, and inspection reports are recorded with timestamps and entity attribution.

---

##  License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <b>Developed for a Safer, Counterfeit-Free Bangladesh 🇧🇩</b><br>
  <i>MedGuard-BD: Safeguarding Lives Through Intelligent Technology.</i>
</p>
