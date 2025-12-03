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

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
PERPLEXITY_API_KEY=your_perplexity_api_key
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
```

### 4. Run the Development Server

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
│   └── perplexity.ts         # Perplexity AI integration
└── package.json
```

## AI Integration

### Perplexity AI

The application uses **Perplexity AI** for both BRD generation and sprint planning:

- **BRD Generation**: Uses Perplexity's `llama-3.1-sonar-large-128k-online` model to generate comprehensive Business Requirements Documents from user input
- **Sprint Planning**: Uses Perplexity AI to analyze BRDs and generate user stories, epics, story points, and sprint breakdowns

The integration is handled in `/lib/perplexity.ts`. You can customize the prompts and model selection in this file.

### Customizing AI Prompts

To customize the AI behavior, edit the prompts in `/lib/perplexity.ts`:
- `generateBRDWithPerplexity()` - Modify the system and user prompts for BRD generation
- `generateSprintPlanWithPerplexity()` - Modify the prompts for sprint planning

### User Authentication

Currently, the app uses a hardcoded `user-123` as the user ID. Replace this with your actual authentication system to get the real user ID.

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

