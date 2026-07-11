# Solvearn Onboarding Flow

## 1. Landing Page (`/`)

- **Header**: `#141414` bg, 64px height
  - Logo 40×40 + "SOLVEARN" in Akira Expanded (20px, 0.15em letter-spacing, white)
  - "Log In" link
- **Hero**: "Find your Team Members and Grow your Startup Idea"
- **Social proof**: "165,339 action takers have joined Solvearn"
- **CTA**: "Sign Up" button
- **Feature sections** (3):
  1. "Find your dream team" — AI matching system
  2. "Work on cool projects" — real impact projects
  3. "Bring your ideas to life" — find people to help
- **Next steps**: Two CTA cards
  - "I am building a project"
  - "I want to join a project"
- **FAQ**: Accordion with questions
- **Footer**: Company info, Terms & Conditions, Privacy Policy

## 2. Sign Up (`/signup`) — 2 Steps + Email Verification

### Step 1/2: Username
- "Pick an Username"
- Input: max 20 chars, placeholder "johndoe"
- "Continue →" button (disabled until filled)
- Terms & Privacy links
- "Already have an account? Log In"

### Step 2/2: Email + Password
- "Your E-Mail" — input, placeholder "example@gmail.com", max 256 chars
- "Password" — input with visibility toggle, placeholder "8+ characters", max 256 chars
- "Continue →" button
- "Continue with Google" button
- Terms & Privacy links

### Email Verification
- "Verify your email"
- "We've sent a 6-digit code to {email}"
- 6 individual digit inputs (max 1 char each, inputmode numeric)
- "Resend Code" button
- "Change Email Address" button

## 3. Post-Auth Onboarding: AI Cofounder™

### Layout
- **Left sidebar**: Logo 36×36, profile avatar, divider, nav items
- **Main area**: Chat interface with AI Cofounder™ messages
- **Right panel**: Live-updating profile card
- **Footer**: Privacy Policy, Terms & Conditions, Discord, Instagram

### Chat Interface
- Title: "Profile Setup"
- Subtitle: "This is your chat with AI Cofounder™. He will ask you questions regarding your profile."
- AI messages appear as chat bubbles
- User messages: typed into textarea ("Your message…"), sent via SendIcon button
- Optional image upload for profile picture

### The 9 Questions

| # | Question | Answer Type | Profile Field |
|---|---|---|---|
| 1 | "What is your full name?" | Text input | name |
| 2 | "Are you based in United States?" | "Yes I am!" / "No, give country" | location |
| 3 | "Do you have any prior business experience?" | "Yes I do!" / "Not yet." | experience |
| 4 | "What type of partnerships are you looking for?" | Equity-based / Paid work / Hybrid / Internship-volunteering / Open to anything | partnerships |
| 5 | (Freeform text) | Text input + follow-ups | about, skills |
| 6a | "What is your main motivation for joining/starting a startup?" | Multi-choice options | motivation |
| 6b | "How much time are you willing to invest in a startup?" | Few hrs/week / Occasionally / Daily / Full-time | commitment |
| 7 | "What is your best skill?" + follow-ups (tools, experience, hobbies) | Text input with AI follow-ups | skills, references |
| 8 | "Do you want to upload a profile picture?" | Click to upload / "No, I don't" | avatar |
| 9 | "Make profile public" + region visibility | Toggle + region checkboxes (Africa/Asia/Australia/Europe/N.America/S.America) + "OK" | visibility, regions |

**Question flow behavior:**
- Q1-4, Q6a-b, Q8-9: Predefined options (buttons/chips/toggles)
- Q5, Q7: Freeform text input, AI asks follow-up questions to extract structured data
- Profile card on the right updates in real-time as AI extracts information
- Question counter: "Question N/9"
- "(Click any element to edit it)" — inline editing of profile card fields

### Right Panel Profile Card
- **Name** + **Location** badges
- **tldr**: AI-generated one-line summary
- **Top Skill**: title + bullet points + "Add Reference >"
- **Skills & Hobbies**: editable list + "Add skill" button
- **About me**: text area
- **What am I looking for?**: text area
- **+ Add Business Experience** button

### Account Settings (Side Drawer)
- Profile Settings
- Email Settings
- Security & Privacy
- Support Center
- Remove Account
- Log out

## Design Tokens

| Token | Value |
|---|---|
| Page background | `#000000` |
| Header background | `#141414` |
| Header height | 64px |
| Primary button | `#5F57F0` |
| Button border-radius | 14px |
| Button font | Manrope 17px, regular weight |
| Button height | 53.75px |
| Button padding | 12px 16px |
| Input background | transparent |
| Input text color | `#ffffff` |
| Input font | Manrope 15px |
| Input padding | 12px 14px |
| Brand font | Akira Expanded |
| Brand font size | 20px |
| Brand letter-spacing | 0.15em |
| Body font | Manrope, sans-serif |
| Logo size (header) | 40×40px |
| Logo size (sidebar) | 36×36px |

## Key Interactions

- **Chat-based onboarding**: AI asks questions, user types or selects options
- **Live profile preview**: Right panel updates as information is gathered
- **Inline editing**: Profile card fields can be clicked to edit directly
- **Multi-choice chips**: For enum-type questions (commitment, partnership type, etc.)
- **AI extracts structure**: From freeform text (skills, experience, references)
- **Photo upload**: Via file input, optional
- **Region visibility**: Checkbox grid for geographic visibility

---

# Post-Onboarding: Main App (after Continue)

The user presses "Continue >" on the completed profile page and enters `/app/`.

## 4. App Shell / Navigation

### Sidebar (left)
- **Solvearn** (logo) — home/discover
- **Projects** — project feed
- **People** — browse users
- **Messages** — `chat/workspace` (community chat + DMs)
- **Notifications**
- **Profile** — goes to `/app/settings` (account settings, NOT profile page)
- **Avatar** (bottom) — quick actions

### Top Banner
- **Projects for you** (active tab, algorithmically matched)
- **All projects** (all projects)
- **Create project** — opens modal
- **Find team member**
- **AI Search** — textbox with voice input (min 3 chars)
- **Settings** gear icon

## 5. Discover Feed (`/app/`)

- Title: "Projects for you"
- Projects found by algorithm: N (e.g. 42)
- **Project cards** (infinite scroll):
  - Cover image from CDN
  - Project name (h2)
  - Tagline/description (h6, 1-2 sentences)
  - "Recommended for you" badge
  - "Apply for {Role} role" — the role matched to user
  - "Updated / Created" + Founder name + Date (DD/MM/YY)
  - "Category" + value (AI, E-Commerce, Cyber Security, Finance, etc.)
  - "Phase" + value (Idea, Building MVP, PMF, etc.)
  - Website link (if any)
  - Bookmark button (add bookmark)
  - **show more** — opens project detail modal

## 6. Project Detail Modal (or `/app/company/{id}-{slug}/home`)

### Tabs
- **Home** — project overview
- **Jobs** — open positions + team

### Home Tab
- **Cover image** (large hero)
- **Project category** + **Current stage** badges
- **Problem** section (text)
- **Solution** section (text)
- **Product Origins & Approach** (rich text with optional images)
- **Founder Fit & Product Direction** (detailed narrative, optional images)
- **Current Phase & Progress** (text + phase label)
- **Follow Our Journey** section (images, social media links, "Follow" button)

### Jobs Tab
- **Available Positions** list:
  - Role title (e.g. "Full-Stack Developer")
  - Compensation type (e.g. "Equity-Based")
  - Commitment level (e.g. "Daily")
  - "Recommended for you" badge
  - "Learn More →" button
- **Our Team** section:
  - Team member cards with avatar, name, location, role, bio
  - "Open Profile" button for each member

### Project Detail Header Actions
- **Open in new tab** — navigates to dedicated page
- **Add bookmark**
- **Home** / **Jobs** tab toggle
- **Close**

## 7. People Page (`/app/` → People tab)

- **Title**: "People" (with online count, e.g. "11 online")
- **Person cards** in a list:
  - Name, location (continent, country), @username
  - tl;dr bio
  - "Open Profile" button — opens profile panel on the right side
- Profile panel (right side) shows:
  - Avatar, name, @username, country flag
  - "Joined N months ago · Last seen X hours ago"
  - Website link ("View My Professional Site")
  - **tldr**: AI-generated summary
  - **Top Skill**: title + bullet points
  - **About me**: prior business experience
  - **What am I looking for?**: partnerships text
  - **connect** button

## 8. Messages / Workspace (`/app/workspace`)

- **YOUR PROJECTS** section (empty state: "No projects yet. Create one to get started." + "New project" button)
- **Teams** tab
- **People** tab
- **Channels**: "Public chat for Solvearn community" (Discord/Slack-style chat)
  - Messages from all users with username, timestamp, text
  - Real-time chat for networking/job posts

## 9. Settings / Profile (`/app/settings`)

- **Your Account** section:
  - **Profile Settings** — same profile card as onboarding (inline editable)
    - Public/private toggle
    - Region visibility (Africa, Asia, Australia, Europe, North America, South America)
    - Name, location, tldr, top skill, skills & hobbies, about me, what am I looking for, business experience
    - Profile URL
  - **Email Settings**
  - **Security & Privacy**
  - **Support Center**
  - **Remove Account**
  - **Log out**
- **Save & Exit** button
- Right panel shows the same profile preview as onboarding

## 10. Create Project Flow

Triggered by "Create project" button → opens modal

### Step 1: Project Name
- "Let's Setup your Project Page"
- "What's your project name?" → text input → "Continue →"

### Step 2: Landing Page or AI
- "Do you have a landing page?"
- Option A: Enter URL + checkbox (confirm rights) + "Continue with Link →"
- Option B: "Build with an AI Assistant" → "Continue with AI Assistant →"

### Step 3: AI Chat Mode (if AI Assistant chosen)
- "Tell us about your project"
- AI: "Hi! I'm here to help you describe your project. Let's start with the basics - what is your project idea?"
- User types response, AI asks follow-up questions (e.g. "Answer 3 more questions to continue")
- "AI Chat Mode" toggle (ON by default)
- Attachment button 📎
- Continue button with remaining question count

## 11. Route Map

| Route | Page |
|---|---|
| `/` | Landing page |
| `/signup` | Sign up (2-step + email OTP) |
| `/app/` | Discover feed (Projects for you / All projects) |
| `/app/company/{id}-{slug}/home` | Project detail (Home tab) |
| `/app/company/{id}-{slug}/jobs` | Project detail (Jobs tab) |
| `/app/workspace` | Messages / Chat workspace |
| `/app/settings` | Account settings & profile editing |
