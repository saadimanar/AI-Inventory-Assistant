# Supabase Authentication Setup Guide

## Quick Start

1. **Create a Supabase Project**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Create a new project
   - Wait for the project to be fully set up

2. **Get Your Credentials**
   - Navigate to: Project Settings → API
   - Copy your:
     - Project URL (under "Project URL")
     - Anon/Public Key (under "Project API keys" → "anon" or "public")

3. **Create Environment File**
   - Create a `.env.local` file in the `frontend/` directory
   - Add your credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
     NEXT_PUBLIC_API_URL=http://localhost:8000
     SUPABASE_JWT_SECRET=your_jwt_secret_here
     ```
   - The **JWT Secret** is on the same API settings page (used by the Python backend to validate sessions).

4. **Configure Redirect URLs**
   - In Supabase Dashboard: Authentication → URL Configuration
   - Add to "Redirect URLs":
     - `http://localhost:3000/auth/callback` (for development)
     - Your production URL + `/auth/callback` (for production)

5. **Start the App**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Features Included

- ✅ Email/Password authentication
- ✅ Sign up page (`/auth/signup`)
- ✅ Login page (`/auth/login`)
- ✅ Email verification flow
- ✅ Protected routes (middleware redirects to login)
- ✅ Server-side and client-side Supabase clients

## Project Structure

```
frontend/
├── app/
│   ├── auth/
│   │   ├── login/          # Login page
│   │   ├── signup/         # Signup page
│   │   ├── callback/       # OAuth callback handler
│   │   └── verify-email/   # Email verification page
│   └── page.tsx            # Protected home page
├── utils/
│   └── supabase/
│       ├── client.ts       # Client-side Supabase client
│       ├── server.ts       # Server-side Supabase client
│       └── middleware.ts   # Middleware utilities
└── middleware.ts           # Next.js middleware for auth
```

## Usage Examples

### Get User in Server Component
```typescript
import { createClient } from '@/utils/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  return <div>Hello {user?.email}</div>
}
```

### Get User in Client Component
```typescript
'use client'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export default function Component() {
  const [user, setUser] = useState(null)
  const supabase = createClient()
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])
  
  return <div>Hello {user?.email}</div>
}
```

## Python API integration

The inventory backend (`backend/`) validates Supabase access tokens from the browser:

- Frontend sends `Authorization: Bearer <access_token>` on every API call (`frontend/lib/api-client.ts`).
- Python verifies the JWT with `SUPABASE_JWT_SECRET` and scopes all data by the token's `sub` (user id).
- For local Docker dev without login, set `ALLOW_MOCK_AUTH=true` and `NEXT_PUBLIC_ALLOW_MOCK_AUTH=true`.

## Next Steps

- Customize the authentication pages styling
- Add social authentication (Google, GitHub, etc.)
- Add password reset functionality
- Add user profile management
- Set up Row Level Security (RLS) policies in Supabase
