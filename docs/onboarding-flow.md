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
