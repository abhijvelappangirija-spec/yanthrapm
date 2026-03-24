# BRD Generator

A Next.js application for generating Business Requirements Documents (BRD) with file upload, text input, rich text editing, and PDF export capabilities.

## Features

- 📁 Drag-and-drop file upload zone (supports TXT, MD, DOC, DOCX, CSV, XLSX, XLS)
- ✍️ Manual text input via textarea
- 📊 CSV and Excel file parsing and conversion
- 🔄 BRD generation via API
- ⏳ Loading spinner during generation
- 📝 Rich text viewer with edit capability
- 💾 Automatic storage in Supabase
- 📄 PDF download functionality
- 🎯 Sprint Planner with team capacity and velocity tracking
- 📋 Story grouping (epics) and sprint breakdown visualization
- 🔗 Jira integration - Create stories and epics directly in Jira Cloud

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PERPLEXITY_API_KEY=your_perplexity_api_key

# AI provider controls
# AI_DEFAULT_PROVIDER=perplexity
# AI_BRD_PROVIDER=ollama
# AI_SPRINT_PROVIDER=ollama
# AI_PRIVATE_PROVIDER=ollama
# AI_PRIVATE_TASKS=brd,brd-from-file,sprint-plan
# AI_EXTERNAL_DISABLED=true

# Ollama (private/local inference)
# OLLAMA_BASE_URL=http://127.0.0.1:11434
# OLLAMA_MODEL=llama3.1:8b
# OLLAMA_BRD_MODEL=llama3.1:8b
# OLLAMA_SPRINT_MODEL=llama3.1:8b

# Local/dev only when intentionally testing fallback mode
# APP_ALLOW_FALLBACK_ACTOR=true
# APP_DEFAULT_USER_ID=your_local_test_user_id

# Jira Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_API_TOKEN=your_jira_api_token

# Optional: Custom Jira Field IDs (if different from defaults)
# JIRA_STORY_POINTS_FIELD_ID=customfield_10016
# JIRA_EPIC_LINK_FIELD_ID=customfield_10014
```

**Getting Perplexity API Key:**
1. Sign up at [Perplexity AI](https://www.perplexity.ai/)
2. Navigate to API settings
3. Generate an API key
4. Add it to your `.env.local` file

### 3. Create Supabase Tables

Run this SQL in your Supabase SQL editor to create the required tables:

```sql
-- BRDs table
CREATE TABLE brds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  raw_input TEXT NOT NULL,
  brd_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sprints table
CREATE TABLE sprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  brd_id UUID REFERENCES brds(id),
  team_members INTEGER NOT NULL,
  capacity_per_member INTEGER NOT NULL,
  sprint_duration INTEGER NOT NULL,
  velocity INTEGER,
  story_groups JSONB NOT NULL,
  stories_count INTEGER NOT NULL,
  suggested_story_points INTEGER NOT NULL,
  sprint_breakdown JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table (for storing default planning inputs)
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  team_members INTEGER NOT NULL,
  capacity_per_member INTEGER NOT NULL,
  sprint_duration INTEGER NOT NULL,
  tech_stack TEXT,
  roles TEXT[],
  resources JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resources structure (stored as JSONB in projects.resources):
-- [
--   {
--     "id": "string",
--     "name": "string",
--     "tech_stack": "string",
--     "capacity": number (hours per week)
--   }
-- ]

-- Technical Context table (optional - for storing technical context)
CREATE TABLE technical_context (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brd_id UUID REFERENCES brds(id) UNIQUE,
  user_id TEXT NOT NULL,
  technical_context TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Apply Row Level Security Migration

After the base tables are created, apply:

`supabase/migrations/202603240001_phase1_rls.sql`

This enables owner-based Row Level Security for `brds`, `projects`, `sprints`, and `technical_context`.

### 5. Apply AI Metadata Migration

To persist provider/model audit details for generated BRDs and sprint plans, also apply:

`supabase/migrations/202603240002_phase2_ai_metadata.sql`

The app is backward-compatible if this migration has not been applied yet. It will retry writes without metadata columns until the schema is updated.

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
yanthrapm/
├── app/
│   ├── api/
│   │   ├── generate-brd/
│   │   │   └── route.ts      # API endpoint for BRD generation
│   │   ├── generate-sprint-plan/
│   │   │   └── route.ts      # API endpoint for sprint plan generation
│   │   ├── create-jira-tickets/
│   │   │   └── route.ts      # API endpoint for creating Jira tickets
│   │   └── update-brd/
│   │       └── route.ts      # API endpoint for updating BRD
│   ├── globals.css           # Global styles with Tailwind
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page component
├── components/
│   ├── BRDViewer.tsx         # Rich text viewer/editor
│   ├── BRDPDF.tsx            # PDF generation component
│   ├── FileUploadZone.tsx    # Drag-and-drop file upload
│   ├── LoadingSpinner.tsx    # Loading spinner component
│   └── SprintPlanner.tsx     # Sprint planning component
├── lib/
│   ├── supabase.ts           # Supabase client configuration
│   ├── fileParsers.ts        # CSV and Excel file parsing utilities
│   ├── perplexity.ts          # Perplexity AI integration
│   └── jira.ts               # Jira Cloud API integration
└── package.json
```

## AI Integration

### Perplexity AI

The application uses **Perplexity AI** for both BRD generation and sprint planning:

- **BRD Generation**: Uses a two-pass evidence-first pipeline for Business Requirements Documents
- **Sprint Planning**: Uses Perplexity AI to analyze BRDs and generate user stories, epics, story points, and sprint breakdowns

The integration is handled across:

- `lib/perplexity.ts`
- `lib/ai/task-prompts.ts`
- `lib/ai/brd-evidence.ts`

BRD generation now works in two stages:

1. extract structured evidence from the input without inventing unsupported detail,
2. compose the final BRD HTML from that evidence.

The generated BRD is then checked for required sections and evidence coverage. If the model output is structurally weak, the app falls back to a deterministic BRD rendered directly from the extracted evidence.

This reduces hallucination and makes the final BRD more reviewable for technical managers and architects.

### Provider Routing

The app now routes generation through a provider abstraction layer:

1. `lib/ai/service.ts` selects the provider through policy.
2. `lib/ai/provider-policy.ts` enforces provider selection and external-provider restrictions.
3. Supported providers currently are:
   - `perplexity`
   - `ollama`
   - `dummy`

Recommended patterns:

1. Use `AI_BRD_PROVIDER=ollama` and `AI_SPRINT_PROVIDER=ollama` for private/local inference.
2. Set `AI_EXTERNAL_DISABLED=true` to block external provider usage by policy.
3. Keep `perplexity` available only where external calls are explicitly acceptable.
4. Set `AI_PRIVATE_PROVIDER=ollama` and `AI_PRIVATE_TASKS=...` to force private routing for selected tasks.

### Sensitive Flow Controls

The BRD and sprint generation APIs support `requirePrivateProcessing=true`.

When that flag is sent:

1. the routing layer will not allow an external provider for that request,
2. if the configured task provider is external, it is rerouted to `AI_PRIVATE_PROVIDER`,
3. if the private provider is not configured correctly, the request fails closed with `503` instead of falling back to an external provider.

The generation routes also perform basic server-side input classification. If the content looks restricted because it contains credential, secret, confidential, or likely PII patterns, the request is auto-routed through the private-processing policy even when the checkbox is not set.

### Customizing AI Prompts

To customize AI behavior:

- edit `lib/ai/task-prompts.ts` for BRD evidence extraction, BRD composition, and sprint-plan prompts
- edit `lib/perplexity.ts` and `lib/ai/providers/ollama-provider.ts` for provider-specific transport/model behavior

### Jira Integration

The application includes Jira Cloud integration to create stories and epics directly from sprint plans.

**Setup:**
1. Add Jira configuration to your `.env.local` file:
   ```env
   JIRA_BASE_URL=https://your-domain.atlassian.net
   JIRA_API_TOKEN=your_jira_api_token
   ```

2. Get your Jira API token from [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)

3. When creating Jira stories, you'll be prompted to enter:
   - Your email address (for authentication)
   - Project Key (e.g., `PROJ`)

**Custom Field IDs:**
Jira custom field IDs vary by instance. If story points or epic links don't work, you can configure custom field IDs via environment variables:
- `JIRA_STORY_POINTS_FIELD_ID` - Default: `customfield_10016`
- `JIRA_EPIC_LINK_FIELD_ID` - Default: `customfield_10014`

To find your field IDs, use the Jira REST API:
```bash
curl -u email:api_token https://your-domain.atlassian.net/rest/api/3/field
```

**Features:**
- Automatically creates epics if they don't exist
- Creates stories with proper epic linking
- Assigns story points to each story
- Returns success/error logs for each story created

### User Authentication

The app now resolves the acting user on the server and client API calls can forward a real Supabase access token automatically.

Current behavior:

1. Browser API calls use `lib/auth/fetch-with-auth.ts` to attach the current Supabase session access token when one exists.
2. Server routes resolve the actor from:
   - `Authorization: Bearer <token>`
   - supported Supabase auth cookie formats
   - configured local fallback only when no real session is available and fallback is explicitly allowed or the app is running outside production
3. Authenticated server routes use actor-scoped Supabase clients so Row Level Security can apply during normal signed-in requests.

Verification endpoint:

- `GET /api/auth/actor`

This returns whether the request is authenticated and which actor source was used.

Fallback policy:

1. Production should rely on real Supabase sessions only.
2. Fallback actors are disabled in production unless `APP_ALLOW_FALLBACK_ACTOR=true` is set explicitly.
3. `APP_DEFAULT_USER_ID`, `DEMO_USER_ID`, and `DEFAULT_USER_ID` should be treated as local/dev-only values.

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Database and backend
- **React Quill** - Rich text editor
- **@react-pdf/renderer** - PDF generation
- **xlsx** - Excel file parsing (CSV and XLSX/XLS support)
- **Perplexity AI** - AI-powered BRD generation and sprint planning

## License

MIT
