# Technical Documentation: Village Locator Application

## 1. Project Overview
The Village Locator is a full-stack web application designed to help users search for and locate villages, sub-districts, and districts across various states. The application processes very large demographic datasets (e.g., CSV files exceeding 1.6 GB) and provides a fast, responsive user interface to search through this data and display geographic locations using Google Maps integration.

## 2. Architecture & Technology Stack
The project adopts a modern monolithic repository structure with decoupled frontend and backend logic.

### 2.1 Backend / API Layer
- **Framework:** Next.js (App Directory)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma (`prisma-client-js`)
- **Key Modules:**
  - `csv-parser` for streaming and seeding large demographic CSV files.
  - Next.js API Routes (`app/api`) to handle RESTful client requests.

### 2.2 Frontend / Client Layer
- **Framework:** React 19 via Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS (configured at the root level via PostCSS)
- **Features:** 
  - Dynamic Search Logic
  - Google Maps Modal for village directions.

## 3. Database Schema (Prisma)
The database structure is normalized to reflect the geographic hierarchy:

1. **State**: 
   - Fields: `id`, `code` (Unique), `name`
   - Relations: One-to-many with District
2. **District**: 
   - Fields: `id`, `code` (Unique), `name`, `stateId`
   - Relations: One-to-many with SubDistrict
3. **SubDistrict**: 
   - Fields: `id`, `code` (Unique), `name`, `districtId`
   - Relations: One-to-many with Village
4. **Village**:
   - Fields: `id`, `code` (Unique), `name`, `fullAddress`, `subDistrictId`

## 4. Key Design Decisions
- **Separation of Concerns:** The client interface is hosted under the `/client` directory (Vite), while server-side rendering and API endpoints leverage the Next.js framework in the root.
- **Large Data Processing:** The backend seeding script (`prisma/seed.ts`) uses streams to parse multi-gigabyte CSV datasets without exceeding memory limits.
- **Ignored Artifacts:** `.env`, `.next`, `node_modules`, and heavy raw CSV datasets are explicitly excluded from production builds and Git history to maintain security and portability.
