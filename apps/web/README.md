# OptiPlan - Project Manager

## Description

**OptiPlan** is a comprehensive project management tool designed to help teams streamline their workflows and manage tasks effectively. Built with the latest technologies, it ensures a smooth and seamless user experience by avoiding server components for data fetching and leveraging optimized client-side techniques.

## Tech Stack

The project utilizes a modern and powerful stack:

- **React 18**: For building dynamic and interactive user interfaces.
- **Next.js 15**: For server-side rendering and optimized web applications.
- **Hono**: A fast web framework for API routes.
- **Better Auth**: Modern authentication library with PostgreSQL adapter.
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle ORM**: Type-safe SQL ORM for database operations.

## Key Libraries and Features

- **nuqs**: Used for utility functions and query handling.
- **TypeScript (TS)**: Ensures type safety and better developer experience.
- **zod** and **zodresolver**: For schema validation and form handling.
- **shadcn**: A design system for building accessible components.
- **TanStack Query**: For efficient and declarative data fetching.
- **RPC**: Remote Procedure Calls for streamlined client-server communication.
- **Hello Pangea DnD**: For a smooth and interactive Kanban board implementation.

## Setup

### Prerequisites

- Node.js 18+ 
- A Neon PostgreSQL database
- Better Auth secret key

### Environment Variables

Create a `.env.local` file in the `optiplan` directory:

```bash
# Database
DATABASE_URL=your_neon_postgresql_connection_string

# Better Auth
BETTER_AUTH_SECRET=your_secret_key_here
BETTER_AUTH_URL=http://localhost:3000

# AI Service
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run database migrations (if using Drizzle migrations):
```bash
npm run db:push  # or your migration command
```

3. Run the development server:
```bash
npm run dev
```

## Optimizations

The application has been **refactored to avoid relying on server components** for data fetching. This change ensures:

- A smoother and faster user experience.
- Improved handling of state and UI updates.
- Better control over caching and performance.

## Database Schema

The application uses Drizzle ORM with Neon PostgreSQL. Schema definitions are in `src/lib/db/schema/`.

## Authentication

Better Auth handles authentication with email/password. OAuth providers can be configured through Better Auth.
