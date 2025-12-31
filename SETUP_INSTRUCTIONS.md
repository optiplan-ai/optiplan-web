# OptiPlan Setup Instructions

## Prerequisites

- Node.js 18+
- A Neon PostgreSQL database
- Python 3.8+ (for AI service)

## Frontend Setup (optiplan)

### 1. Install Dependencies

```bash
cd optiplan
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the `optiplan` directory:

```bash
# Database
DATABASE_URL=your_neon_postgresql_connection_string

# Better Auth
BETTER_AUTH_SECRET=your_secret_key_here_min_32_chars
BETTER_AUTH_URL=http://localhost:3000

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI Service
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000
```

### 3. Generate Better Auth Schema

Better Auth needs to generate its own database schema. Run:

```bash
npx @better-auth/cli@latest generate
```

This will generate the Better Auth schema files. You may need to integrate them with your existing schema or let Better Auth create separate tables.

### 4. Generate and Run Database Migrations

```bash
# Generate migration files
npx drizzle-kit generate

# Apply migrations to database
npx drizzle-kit migrate
```

### 5. Run Development Server

```bash
npm run dev
```

## Backend Setup (ai)

### 1. Install Dependencies

```bash
cd ai
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file in the `ai` directory:

```bash
# Google API Key for Gemini
GOOGLE_API_KEY=your_google_api_key_here

# Upstash Vector
UPSTASH_VECTOR_REST_URL=your_upstash_vector_url
UPSTASH_VECTOR_REST_TOKEN=your_upstash_vector_token
```

### 3. Run Development Server

```bash
uvicorn main:app --reload
```

## Important Notes

1. **Better Auth Schema**: After running `npx @better-auth/cli@latest generate`, you'll need to either:
   - Use Better Auth's generated schema separately, OR
   - Integrate it with your existing users table by mapping fields

2. **Database Schema**: Your existing schema (users, workspaces, etc.) will coexist with Better Auth's schema. You may need to adjust the Better Auth configuration to map to your existing users table if you want to use the same table.

3. **First Time Setup**: 
   - Better Auth will create its own tables (user, session, etc.)
   - Your existing tables (users, workspaces, projects, tasks, members, user_skills) will be created by Drizzle migrations
   - You may need to sync user data between Better Auth's user table and your users table, or modify the setup to use a single table

## Troubleshooting

### Package Installation Issues

If you encounter peer dependency conflicts:
```bash
npm install --legacy-peer-deps
```

### Better Auth Schema Issues

If Better Auth can't find its schema:
1. Make sure you've run `npx @better-auth/cli@latest generate`
2. Import the generated schema in your `better-auth.ts` file
3. Check that the schema is passed to the drizzleAdapter

### Database Connection Issues

- Verify your `DATABASE_URL` is correct
- Ensure your Neon database is accessible
- Check that all required tables exist

