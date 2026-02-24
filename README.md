This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) with Supabase authentication.

## Getting Started

### 1. Set up Supabase

1. Create a project at [Supabase](https://app.supabase.com)
2. Go to your project settings → API
3. Copy your project URL and anon key

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Optional – AI chat search** (natural language item search):

```bash
OPENAI_API_KEY=your_openai_api_key
```

If set, the app will use OpenAI for query understanding and semantic search. Without it, chat search still works with keyword filters and full-text search (after running the chat-search migration).

### 3. (Optional) Enable AI Chat Search

To use the **AI Search** feature (natural language search over your inventory):

1. Run the chat-search migration in the Supabase SQL Editor: open `supabase-chat-search-migration.sql`, copy its contents, and run it in your project. This adds `search_text` and `embedding` columns to `items` and a hybrid search function.
2. Set `OPENAI_API_KEY` in `.env.local` for best results (semantic + filters). Without it, search uses only filters and full-text on `search_text`.

After adding or editing items, the app will index them for search in the background.

### 4. Configure Supabase Auth

In your Supabase dashboard:
1. Go to Authentication → URL Configuration
2. Add `http://localhost:3000/auth/callback` to your Redirect URLs
3. Add your production URL when deploying

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You'll be redirected to the login page if you're not authenticated. You can:
- Sign up at `/auth/signup`
- Sign in at `/auth/login`
- Access the home page after authentication

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
