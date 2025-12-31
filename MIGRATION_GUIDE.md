# Migration Guide: Appwrite → Better Auth + Neon PostgreSQL

This guide explains the migration from Appwrite to Better Auth and Neon PostgreSQL.

## Database Schema Changes

### User Table

- **Old**: `users` table with custom structure
- **New**: Better Auth's `user` table (singular) with required fields
- **Migration**: Better Auth manages the `user` table. The old `users` table is deprecated.

### Better Auth Tables

Better Auth creates the following tables:
- `user` - User accounts
- `session` - User sessions
- `account` - OAuth accounts and email/password
- `verification` - Email verification tokens

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Create `.env.local`:

```bash
DATABASE_URL=your_neon_postgresql_connection_string
BETTER_AUTH_SECRET=your_secret_key_min_32_chars
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Generate Database Schema

Better Auth schema is already defined in `src/lib/db/schema/better-auth.ts`. 

Generate migrations:

```bash
npm run db:generate
```

### 4. Apply Migrations

```bash
npm run db:migrate
```

Or push schema directly (for development):

```bash
npm run db:push
```

## Key Changes

1. **Authentication**: All auth is handled by Better Auth through `/api/auth/*` routes
2. **User Table**: Use Better Auth's `user` table instead of `users`
3. **Session Management**: Better Auth handles sessions automatically
4. **Foreign Keys**: All tables now reference Better Auth's `user.id`

## Database Indexes

For scalability, the following indexes have been added:

- User: `email`, `createdAt`
- Session: `userId`, `token`, `expiresAt`
- Account: `userId`, `providerId + accountId` (composite)
- Workspaces: `userId`, `inviteCode`, `createdAt`
- Members: `userId`, `workspaceId`, `projectId`, `userId + workspaceId` (composite)
- Tasks: `workspaceId`, `assigneeId`, `projectId`, `status`, `dueDate`, `workspaceId + status` (composite)
- Projects: `workspaceId`, `createdAt`
- User Skills: `memberId`, `workspaceId`, `category`, `memberId + workspaceId` (composite)

## Performance Optimizations

1. **Experimental Joins**: Enabled in Better Auth config for 2-3x performance improvement
2. **Database Indexes**: Strategic indexes on foreign keys and frequently queried fields
3. **Composite Indexes**: For common query patterns (e.g., workspace + status)

## Backward Compatibility

The codebase maintains backward compatibility where possible:
- `COLLECTIONS.users` still works but maps to Better Auth's `user` table
- Old helper functions still work but use Better Auth tables internally

