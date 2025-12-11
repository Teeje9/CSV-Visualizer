# DataViz - CSV Data Visualization & Insights Tool

## Overview

DataViz is a web application that transforms CSV files into beautiful charts and auto-generated insights. Users upload CSV files, and the system automatically detects column types, generates appropriate visualizations (line, bar, scatter, histogram), and produces statistical insights including trends, correlations, outliers, and patterns. The goal is to make data analysis accessible to users who don't know how to choose chart types or analyze data manually.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (dark mode default)
- **Charts**: Recharts library for data visualization (line, bar, scatter, histogram)
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **File Handling**: Multer for multipart file uploads (5MB limit)
- **CSV Parsing**: PapaParse for parsing CSV/TSV files
- **Statistical Analysis**: simple-statistics library for calculations
- **API Pattern**: RESTful endpoint at `/api/analyze` for file upload and processing

### Data Flow
1. User uploads CSV/TSV file via drag-and-drop or file picker
2. File sent to `/api/analyze` endpoint
3. Server parses CSV, detects column types (numeric, categorical, date, boolean, text)
4. Analysis engine calculates statistics, correlations, trends, and generates insights
5. Chart configurations auto-selected based on column type combinations
6. Results returned to frontend for rendering

### Column Type Detection Rules
- **Line chart**: date + number columns
- **Bar chart**: category + number columns
- **Scatter plot**: number + number columns
- **Histogram**: single numeric column

### Design System
- Split-screen layout: Insights panel (40%) + Charts panel (60%)
- Typography: Inter for UI, JetBrains Mono for data values
- Responsive: Stacks vertically on mobile
- Dark mode by default with light mode support

## External Dependencies

### Database
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit with migrations in `./migrations`
- **Current State**: Schema defined but database not actively used in MVP (in-memory storage via MemStorage class)

### Third-Party Services
- None currently integrated (no AI, payment, or external API dependencies)

### Key NPM Packages
- `papaparse`: CSV parsing
- `simple-statistics`: Statistical calculations (mean, median, std dev, correlations)
- `recharts`: React charting library
- `multer`: File upload handling
- `zod`: Schema validation for type safety
- `drizzle-orm` / `drizzle-zod`: Database ORM (prepared for future use)

### Fonts
- Google Fonts: Inter, JetBrains Mono, DM Sans, Fira Code, Geist Mono