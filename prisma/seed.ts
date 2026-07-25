import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const seedOrigin = process.env.BETTER_AUTH_URL ?? "http://localhost:3020"
const mockHeaders = new Headers({ "content-type": "application/json", origin: seedOrigin })

const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
})

async function createUser(email: string, name: string, password: string) {
  const result = await auth.api.signUpEmail({
    headers: mockHeaders,
    body: { email, password, name },
  })
  if (!result.user) throw new Error(`Failed to create user: ${email}`)
  return result.user
}

async function main() {
  console.log("Cleaning existing data...")

  await prisma.bookmark.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.application.deleteMany()
  await prisma.roleTag.deleteMany()
  await prisma.profileTag.deleteMany()
  await prisma.role.deleteMany()
  await prisma.portfolio.deleteMany()
  await prisma.product.deleteMany()
  await prisma.project.deleteMany()
  await prisma.profile.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.verification.deleteMany()
  await prisma.user.deleteMany()

  console.log("Creating users via Better-Auth...")

  const alex = await createUser("alex@example.com", "Alex Chen", "password123")
  const maya = await createUser("maya@example.com", "Maya Patel", "password123")
  const jordan = await createUser("jordan@example.com", "Jordan Kim", "password123")
  const priya = await createUser("priya@example.com", "Priya Sharma", "password123")
  const marcus = await createUser("marcus@example.com", "Marcus Johnson", "password123")
  const elena = await createUser("elena@example.com", "Elena Vasquez", "password123")
  const tom = await createUser("tom@example.com", "Tom Berg", "password123")
  const yuki = await createUser("yuki@example.com", "Yuki Tanaka", "password123")
  const sara = await createUser("sara@example.com", "Sara Lee", "password123")
  const david = await createUser("david@example.com", "David Okafor", "password123")
  const anna = await createUser("anna@example.com", "Anna Kowalski", "password123")

  const users = [alex, maya, jordan, priya, marcus, elena, tom, yuki, sara, david, anna]

  console.log("Creating tags...")

  const tags = await Promise.all([
    prisma.tag.create({ data: { name: "Next.js", category: "Framework" } }),
    prisma.tag.create({ data: { name: "Prisma", category: "ORM" } }),
    prisma.tag.create({ data: { name: "Tailwind CSS", category: "Framework" } }),
    prisma.tag.create({ data: { name: "TypeScript", category: "Language" } }),
    prisma.tag.create({ data: { name: "PostgreSQL", category: "Database" } }),
    prisma.tag.create({ data: { name: "React", category: "Library" } }),
    prisma.tag.create({ data: { name: "Node.js", category: "Runtime" } }),
    prisma.tag.create({ data: { name: "Figma", category: "Tool" } }),
    prisma.tag.create({ data: { name: "UI Design", category: "Skill" } }),
    prisma.tag.create({ data: { name: "Rust", category: "Language" } }),
    prisma.tag.create({ data: { name: "Python", category: "Language" } }),
    prisma.tag.create({ data: { name: "Docker", category: "Tool" } }),
    prisma.tag.create({ data: { name: "Kubernetes", category: "Tool" } }),
    prisma.tag.create({ data: { name: "GraphQL", category: "API" } }),
    prisma.tag.create({ data: { name: "AWS", category: "Cloud" } }),
    prisma.tag.create({ data: { name: "TensorFlow", category: "ML" } }),
    prisma.tag.create({ data: { name: "Flutter", category: "Framework" } }),
    prisma.tag.create({ data: { name: "Swift", category: "Language" } }),
    prisma.tag.create({ data: { name: "Go", category: "Language" } }),
    prisma.tag.create({ data: { name: "Redis", category: "Database" } }),
    prisma.tag.create({ data: { name: "Product Management", category: "Skill" } }),
    prisma.tag.create({ data: { name: "Data Science", category: "Skill" } }),
    prisma.tag.create({ data: { name: "DevOps", category: "Skill" } }),
    prisma.tag.create({ data: { name: "Mobile Development", category: "Skill" } }),
    prisma.tag.create({ data: { name: "Frontend", category: "Specialty" } }),
    prisma.tag.create({ data: { name: "Backend", category: "Specialty" } }),
    prisma.tag.create({ data: { name: "Full Stack", category: "Specialty" } }),
  ])

  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t]))

  console.log("Creating profiles...")

  const profiles = [
    { user: alex, bio: "Full-stack founder building next-gen dev tools. Passionate about open source.", location: "New York, NY", tldr: "Founder building next-gen dev tools", experience: "8+ years", topSkill: "Product Engineering", partnerships: "Looking for a co-founder", commitment: "Full-time", motivation: "Building the future of developer tooling", lookingFor: "co-founder", isPublic: true, timezone: "America/New_York", githubUrl: "https://github.com/alexchen", linkedinUrl: "https://linkedin.com/in/alexchen", websiteUrl: "https://alexchen.dev", tags: ["TypeScript", "Next.js", "React", "PostgreSQL"] },
    { user: maya, bio: "Senior frontend engineer specialized in React ecosystems. Love building beautiful UIs.", location: "London, UK", tldr: "Senior frontend engineer passionate about developer UX", experience: "6+ years", topSkill: "React", partnerships: "Open to side projects", commitment: "Part-time", motivation: "Love building beautiful and performant user interfaces", lookingFor: "team", isPublic: true, timezone: "Europe/London", githubUrl: "https://github.com/mayapatel", tags: ["Next.js", "Prisma", "Tailwind CSS", "TypeScript"] },
    { user: jordan, bio: "Product designer with 6+ years turning complex problems into simple, elegant interfaces.", location: "San Francisco, CA", tldr: "Product designer crafting elegant user experiences", experience: "6+ years", topSkill: "UI Design", partnerships: "Looking for a design role at a startup", commitment: "Full-time", motivation: "Turning complex problems into simple, elegant interfaces", lookingFor: "co-founder", isPublic: true, timezone: "America/Los_Angeles", githubUrl: "https://github.com/jordankim", linkedinUrl: "https://linkedin.com/in/jordankim", websiteUrl: "https://jordankim.design", tags: ["Figma", "UI Design", "Frontend"] },
    { user: priya, bio: "ML engineer working on NLP and recommendation systems. Previously at Google Research.", location: "Bangalore, India", tldr: "ML engineer specializing in NLP systems", experience: "5+ years", topSkill: "Machine Learning", partnerships: "Looking for a co-founder", commitment: "Full-time", motivation: "Making AI accessible and practical for everyday applications", lookingFor: "co-founder", isPublic: true, timezone: "Asia/Kolkata", githubUrl: "https://github.com/priyasharma", linkedinUrl: "https://linkedin.com/in/priyasharma", tags: ["Python", "TensorFlow", "Data Science"] },
    { user: marcus, bio: "Backend infra engineer. I build systems that don't fall over. Kubernetes enthusiast.", location: "Berlin, Germany", tldr: "Backend infra engineer — Kubernetes & Go", experience: "7+ years", topSkill: "DevOps", partnerships: "Open to consulting", commitment: "Part-time", motivation: "Building reliable distributed systems that scale", lookingFor: "team", isPublic: true, timezone: "Europe/Berlin", githubUrl: "https://github.com/marcusj", tags: ["Go", "Kubernetes", "Docker", "AWS"] },
    { user: elena, bio: "Full-stack developer with a focus on fintech and payments. Building the future of money.", location: "São Paulo, Brazil", tldr: "Full-stack dev in fintech", experience: "4+ years", topSkill: "Full Stack Development", partnerships: "Looking for a co-founder", commitment: "Full-time", motivation: "Financial inclusion through better technology", lookingFor: "co-founder", isPublic: true, timezone: "America/Sao_Paulo", githubUrl: "https://github.com/elenav", tags: ["React", "Node.js", "TypeScript", "PostgreSQL"] },
    { user: tom, bio: "iOS & Flutter developer. I've shipped 5 apps to the App Store with >100K combined downloads.", location: "Stockholm, Sweden", tldr: "Mobile developer with shipped apps", experience: "5+ years", topSkill: "Mobile Development", partnerships: "Open to side projects", commitment: "Part-time", motivation: "Building delightful mobile experiences people use every day", lookingFor: "team", isPublic: true, timezone: "Europe/Stockholm", githubUrl: "https://github.com/tomberg", linkedinUrl: "https://linkedin.com/in/tomberg", tags: ["Flutter", "Swift", "Mobile Development"] },
    { user: yuki, bio: "Data scientist turned product manager. I bridge the gap between data and decisions.", location: "Tokyo, Japan", tldr: "Data-driven PM bridging data and product", experience: "6+ years", topSkill: "Product Management", partnerships: "Looking for a co-founder", commitment: "Full-time", motivation: "Building products people love through data-informed decisions", lookingFor: "co-founder", isPublic: true, timezone: "Asia/Tokyo", githubUrl: "https://github.com/yukit", tags: ["Python", "Data Science", "Product Management"] },
    { user: sara, bio: "DevOps engineer keeping the lights on so devs can ship. Terraform and CI/CD pipelines are my jam.", location: "Toronto, Canada", tldr: "DevOps engineer automating everything", experience: "5+ years", topSkill: "DevOps", partnerships: "Open to consulting", commitment: "Contract", motivation: "Automating away toil so teams can focus on building", lookingFor: "team", isPublic: true, timezone: "America/Toronto", githubUrl: "https://github.com/saralee", tags: ["Docker", "Kubernetes", "AWS", "DevOps"] },
    { user: david, bio: "Frontend engineer with an eye for design. I build accessible, performant web apps.", location: "Lagos, Nigeria", tldr: "Frontend engineer building accessible web apps", experience: "4+ years", topSkill: "Frontend Development", partnerships: "Open to side projects", commitment: "Part-time", motivation: "Making the web more accessible and beautiful for everyone", lookingFor: "team", isPublic: true, timezone: "Africa/Lagos", githubUrl: "https://github.com/davido", linkedinUrl: "https://linkedin.com/in/davidev", tags: ["React", "Next.js", "TypeScript", "Tailwind CSS"] },
    { user: anna, bio: "Product designer specialized in B2B SaaS. I've helped 3 startups find PMF through design.", location: "Warsaw, Poland", tldr: "B2B SaaS product designer", experience: "7+ years", topSkill: "UI Design", partnerships: "Looking for a co-founder", commitment: "Full-time", motivation: "Designing products that solve real business problems", lookingFor: "co-founder", isPublic: true, timezone: "Europe/Warsaw", githubUrl: "https://github.com/annak", linkedinUrl: "https://linkedin.com/in/annakowalski", websiteUrl: "https://annakowalski.design", tags: ["Figma", "UI Design", "Frontend"] },
  ]

  for (const p of profiles) {
    await prisma.profile.create({
      data: {
        userId: p.user.id,
        bio: p.bio,
        timezone: p.timezone,
        githubUrl: p.githubUrl,
        linkedinUrl: p.linkedinUrl,
        websiteUrl: p.websiteUrl,
        location: p.location,
        tldr: p.tldr,
        experience: p.experience,
        topSkill: p.topSkill,
        partnerships: p.partnerships,
        commitment: p.commitment,
        motivation: p.motivation,
        lookingFor: p.lookingFor,
        isPublic: p.isPublic,
        onboardingCompleted: true,
        tags: {
          create: p.tags.map((t) => ({ tagId: tagMap[t].id })),
        },
      },
    })
  }

  console.log("Creating portfolios...")

  await prisma.portfolio.create({ data: { userId: maya.id, title: "E-commerce Dashboard", description: "A real-time analytics dashboard for an e-commerce platform built with Next.js and Prisma.", url: "https://dashboard-demo.vercel.app", githubUrl: "https://github.com/mayapatel/dashboard" } })
  await prisma.portfolio.create({ data: { userId: jordan.id, title: "Fintech Mobile App", description: "End-to-end product design for a personal finance management app.", url: "https://dribbble.com/jordankim/fintech-app" } })
  await prisma.portfolio.create({ data: { userId: jordan.id, title: "SaaS Dashboard Redesign", description: "Complete redesign of a B2B analytics dashboard improving UX metrics by 40%.", url: "https://dribbble.com/jordankim/saas-redesign" } })
  await prisma.portfolio.create({ data: { userId: priya.id, title: "Sentiment Analysis Pipeline", description: "Real-time sentiment analysis for social media streams using transformer models.", githubUrl: "https://github.com/priyasharma/sentiment-pipeline" } })
  await prisma.portfolio.create({ data: { userId: marcus.id, title: "Cluster Autoscaler Configurator", description: "Open-source tool for managing Kubernetes cluster autoscaler configurations.", githubUrl: "https://github.com/marcusj/kube-autoscale" } })
  await prisma.portfolio.create({ data: { userId: tom.id, title: "Habit Tracker App", description: "A minimalist habit tracking iOS app with social accountability features.", url: "https://apps.apple.com/app/habitflow" } })
  await prisma.portfolio.create({ data: { userId: anna.id, title: "Enterprise Dashboard Design System", description: "Comprehensive design system for a B2B analytics platform serving 500+ companies.", url: "https://figma.com/community/file/enterprise-ds" } })

  console.log("Creating projects...")

  const projects = [
    { owner: alex, title: "OpenFeedback", tagline: "Open-source feedback widget for modern web apps.", description: "We're building a lightweight, privacy-first feedback collection tool that developers can self-host. The idea is to give product teams full control over their feedback data without paying SaaS premiums. We have the MVP roughed out — now we need a designer to make it beautiful.", phase: "Ideation" as const, isPublic: true },
    { owner: alex, title: "Harbor CLI", tagline: "A CLI tool that automates Docker container orchestration for local dev environments.", description: "Harbor lets developers define their entire local dev stack in a single YAML file and spin it up in seconds. We have a working prototype but need help building out the backend service coordination layer.", phase: "Building" as const, isPublic: true, discordLink: "https://discord.gg/harborcli", repoLink: "https://github.com/harbor-cli/harbor" },
    { owner: jordan, title: "PixelGrid", tagline: "Collaborative mood board platform for design teams.", description: "PixelGrid lets design teams create, share, and collaborate on mood boards in real-time. Launched 3 months ago and growing steadily with 2K+ active teams.", phase: "Launched" as const, isPublic: true, discordLink: "https://discord.gg/pixelgrid", repoLink: "https://github.com/pixelgrid/pixelgrid" },
    { owner: priya, title: "DocLens", tagline: "AI-powered document analysis for legal teams.", description: "DocLens uses NLP to automatically extract clauses, flag risks, and summarize legal documents. Beta-tested with 3 law firms. Building the self-serve platform now.", phase: "Building" as const, isPublic: true },
    { owner: elena, title: "PixPay", tagline: "Instant cross-border payments for Latin America.", description: "PixPay enables real-time money transfers between Brazil, Mexico, Colombia, and the US. We've built the core PIX integration and are expanding to new corridors.", phase: "Building" as const, isPublic: true, discordLink: "https://discord.gg/pixpay" },
    { owner: yuki, title: "TasteMatch", tagline: "AI restaurant discovery based on your actual taste preferences.", description: "TasteMatch learns your palate through a quick onboarding quiz and recommends dishes you'll love. Currently live in Tokyo with 500+ users.", phase: "Launched" as const, isPublic: true },
    { owner: anna, title: "BrandKit", tagline: "One-click brand asset generation for startups.", description: "BrandKit takes your logo and generates a full brand kit — colors, typography, social media templates, business cards, and more. Design system as a service.", phase: "Ideation" as const, isPublic: true },
  ]

  const createdProjects: any[] = []
  for (const p of projects) {
    const created = await prisma.project.create({
      data: {
        ownerId: p.owner.id,
        title: p.title,
        tagline: p.tagline,
        description: p.description,
        phase: p.phase,
        isPublic: p.isPublic,
        discordLink: "discordLink" in p ? (p as any).discordLink : undefined,
        repoLink: "repoLink" in p ? (p as any).repoLink : undefined,
      },
    })
    createdProjects.push(created)
  }

  console.log("Creating roles...")

  const roleSpecs = [
    { projectIdx: 0, title: "UI/UX Designer", description: "Design the widget embed flow, the admin dashboard, and ensure polished look and feel.", isFilled: false, tags: ["Figma", "UI Design"] },
    { projectIdx: 1, title: "Backend Engineer", description: "Build the core orchestration engine — container lifecycle, networking, plugin system.", isFilled: false, tags: ["Node.js", "Docker", "TypeScript"] },
    { projectIdx: 1, title: "Frontend Contributor", description: "Build the web dashboard for managing Harbor stacks.", isFilled: false, tags: ["React", "Next.js", "TypeScript"] },
    { projectIdx: 1, title: "Documentation Writer", description: "Write CLI quickstart guides, API references, and tutorials.", isFilled: false, tags: ["TypeScript"] },
    { projectIdx: 2, title: "Backend Developer", description: "Maintain and scale the real-time collaboration backend.", isFilled: true, tags: ["Rust", "PostgreSQL"] },
    { projectIdx: 3, title: "ML Engineer", description: "Improve NER accuracy, add support for more document types, and optimize inference.", isFilled: false, tags: ["Python", "TensorFlow", "Data Science"] },
    { projectIdx: 3, title: "Frontend Engineer", description: "Build the document review UI with advanced annotation capabilities.", isFilled: false, tags: ["React", "TypeScript"] },
    { projectIdx: 4, title: "Mobile Engineer", description: "Build the iOS and Android apps for PixPay using Flutter.", isFilled: false, tags: ["Flutter", "Mobile Development"] },
    { projectIdx: 4, title: "Compliance Officer", description: "Navigate regulatory requirements across LATAM markets.", isFilled: false, tags: ["Product Management"] },
    { projectIdx: 5, title: "Data Scientist", description: "Improve the recommendation algorithm and build user taste profiles.", isFilled: false, tags: ["Python", "Data Science"] },
    { projectIdx: 5, title: "iOS Developer", description: "Build the TasteMatch iOS app from the ground up.", isFilled: false, tags: ["Swift", "Mobile Development"] },
    { projectIdx: 6, title: "Full-Stack Developer", description: "Build the asset generation engine and user dashboard.", isFilled: false, tags: ["Next.js", "TypeScript", "AWS"] },
  ]

  const createdRoles: any[] = []
  for (const r of roleSpecs) {
    const role = await prisma.role.create({
      data: {
        projectId: createdProjects[r.projectIdx].id,
        title: r.title,
        description: r.description,
        isFilled: r.isFilled,
      },
    })
    for (const tagName of r.tags) {
      await prisma.roleTag.create({ data: { roleId: role.id, tagId: tagMap[tagName].id } })
    }
    createdRoles.push(role)
  }

  console.log("Creating team members...")
  // PixelGrid — full team
  await prisma.teamMember.create({ data: { projectId: createdProjects[2].id, userId: jordan.id, role: "Founder & Designer" } })
  await prisma.teamMember.create({ data: { projectId: createdProjects[2].id, userId: alex.id, role: "Lead Developer" } })
  // DocLens — partial team
  await prisma.teamMember.create({ data: { projectId: createdProjects[3].id, userId: priya.id, role: "Founder & ML Engineer" } })
  // PixPay — partial team
  await prisma.teamMember.create({ data: { projectId: createdProjects[4].id, userId: elena.id, role: "Founder & Full-Stack" } })
  // TasteMatch — partial team
  await prisma.teamMember.create({ data: { projectId: createdProjects[5].id, userId: yuki.id, role: "Founder & PM" } })
  // BrandKit — solo founder
  await prisma.teamMember.create({ data: { projectId: createdProjects[6].id, userId: anna.id, role: "Founder & Designer" } })

  console.log("Creating applications...")

  const applications = [
    { userId: maya.id, roleIdx: 1, message: "I've been working with Node.js and Docker for 4 years. Built a similar orchestration tool at my previous company. Would love to contribute to Harbor.", status: "Pending" as const },
    { userId: david.id, roleIdx: 2, message: "Frontend engineer with 4 years of React/Next.js experience. I've been looking for an open-source CLI project to contribute to.", status: "Pending" as const },
    { userId: marcus.id, roleIdx: 1, message: "Backend infra engineer with deep Docker/K8s experience. Harbor sounds like exactly the kind of tool I wish existed.", status: "Accepted" as const },
    { userId: sara.id, roleIdx: 1, message: "DevOps engineer who's built internal developer platforms at two startups. Harbor could save teams so much time.", status: "Pending" as const },
    { userId: tom.id, roleIdx: 7, message: "Flutter developer with 3 shipped apps. PixPay's mission of financial inclusion resonates with me.", status: "Pending" as const },
    { userId: anna.id, roleIdx: 0, message: "B2B SaaS designer who's designed feedback and analytics tools. OpenFeedback's approach is refreshing.", status: "Pending" as const },
  ]

  for (const app of applications) {
    await prisma.application.create({
      data: { userId: app.userId, roleId: createdRoles[app.roleIdx].id, message: app.message, status: app.status },
    })
  }

  console.log("Creating messages (workspace history)...")

  const chatMessages = [
    { userId: alex.id, body: "Hey everyone! Just pushed a new update to the feedback widget. Thoughts so far?" },
    { userId: jordan.id, body: "Nice! The animation on the toast is smooth. One thing — the close button feels a bit small on mobile." },
    { userId: alex.id, body: "Good catch. I'll bump it to 44x44 touch target. Also, has anyone tried PixelGrid's new real-time sync?" },
    { userId: jordan.id, body: "It's working great! We had a brief hiccup with the WebSocket reconnection yesterday but fixed it." },
    { userId: maya.id, body: "I'm working on the Harbor dashboard. Got the stack status view rendering. Going to need some design input soon @jordan" },
    { userId: jordan.id, body: "Happy to help! I can mock up some options this weekend." },
    { userId: priya.id, body: "DocLens just hit 90% accuracy on clause extraction. The fine-tuning on legal text is paying off." },
    { userId: yuki.id, body: "TasteMatch crossed 1K users in Tokyo! The referral program is driving 40% of new signups." },
    { userId: elena.id, body: "PixPay got approved by a second Brazilian bank for PIX integration. We're scaling fast!" },
    { userId: marcus.id, body: "Anyone else dealing with K8s cost spikes? Our cluster bill doubled last month." },
    { userId: sara.id, body: "Check your node group sizing and consider spot instances. Saved us 60%." },
    { userId: marcus.id, body: "Good tip. Will try spot instances for the batch jobs." },
    { userId: anna.id, body: "BrandKit early prototype is done! Generates a full brand kit from a single logo upload. Would love beta testers." },
    { userId: david.id, body: "Happy to test! Frontend perspective — make sure the download step is instant. Users hate waiting for asset generation." },
    { userId: anna.id, body: "Great point. I'll prioritize server-side generation with streaming." },
    { userId: tom.id, body: "Shipped v2 of the habit tracker with social features. Notifications are the hardest part to get right on iOS." },
    { userId: alex.id, body: "Anyone joining the hackathon next month? Thinking of building a developer tools category entry." },
    { userId: jordan.id, body: "I'm in if we team up! Could use a designer-developer duo." },
    { userId: alex.id, body: "Perfect. Let's grab a virtual coffee this week to brainstorm." },
  ]

  for (const m of chatMessages) {
    await prisma.message.create({ data: { userId: m.userId, body: m.body, createdAt: new Date(Date.now() - chatMessages.indexOf(m) * 3600000) } })
  }

  console.log("Creating notifications...")

  const notifications = [
    { userId: alex.id, type: "application", title: "New application received", body: "Maya Patel applied to Harbor CLI → Backend Engineer", link: "/projects/" + createdProjects[1].id },
    { userId: alex.id, type: "application", title: "New application received", body: "David Okafor applied to Harbor CLI → Frontend Contributor", link: "/projects/" + createdProjects[1].id },
    { userId: alex.id, type: "application", title: "New application received", body: "Marcus Johnson applied to Harbor CLI → Backend Engineer", link: "/projects/" + createdProjects[1].id },
    { userId: alex.id, type: "application", title: "New application received", body: "Sara Lee applied to Harbor CLI → Backend Engineer", link: "/projects/" + createdProjects[1].id },
    { userId: elena.id, type: "application", title: "New application received", body: "Tom Berg applied to PixPay → Mobile Engineer", link: "/projects/" + createdProjects[4].id },
    { userId: jordan.id, type: "application", title: "New application received", body: "Anna Kowalski applied to OpenFeedback → UI/UX Designer", link: "/projects/" + createdProjects[0].id },
    { userId: maya.id, type: "application", title: "Application update", body: "Your application to Harbor CLI → Backend Engineer is pending review.", link: "/projects/" + createdProjects[1].id, read: true },
    { userId: marcus.id, type: "application", title: "Application accepted!", body: "Your application to Harbor CLI → Backend Engineer has been accepted! Welcome to the team.", link: "/projects/" + createdProjects[1].id },
    { userId: yuki.id, type: "milestone", title: "TasteMatch hit 1K users!", body: "Congratulations! Your project crossed 1,000 active users.", link: "/projects/" + createdProjects[5].id },
    { userId: priya.id, type: "milestone", title: "DocLens hits 90% accuracy", body: "Your clause extraction model reached 90% accuracy. Great work!", link: "/projects/" + createdProjects[3].id },
    { userId: alex.id, type: "system", title: "Profile completion", body: "Your profile is 100% complete and visible in searches.", read: true },
    { userId: jordan.id, type: "team", title: "PixelGrid team update", body: "Alex Chen joined as Lead Developer.", link: "/projects/" + createdProjects[2].id },
    { userId: anna.id, type: "system", title: "BrandKit prototype ready", body: "Your project prototype is ready for beta testing. Share it with the community!", link: "/projects/" + createdProjects[6].id },
    { userId: david.id, type: "system", title: "Welcome to SilkLabs!", body: "Complete your profile to get discovered by co-founders and teams.", link: "/profile" },
  ]

  for (const n of notifications) {
    await prisma.notification.create({
      data: {
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        read: n.read ?? false,
      },
    })
  }

  console.log("Creating bookmarks...")
  await prisma.bookmark.create({ data: { userId: maya.id, projectId: createdProjects[0].id } })
  await prisma.bookmark.create({ data: { userId: maya.id, projectId: createdProjects[4].id } })
  await prisma.bookmark.create({ data: { userId: david.id, projectId: createdProjects[1].id } })
  await prisma.bookmark.create({ data: { userId: tom.id, projectId: createdProjects[4].id } })
  await prisma.bookmark.create({ data: { userId: anna.id, projectId: createdProjects[0].id } })

  // ── Summary ──
  console.log("")
  console.log("Seed complete!")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`Users (${users.length}):`)
  const userList = [
    ["Alex Chen", "alex@example.com", "Founder"],
    ["Maya Patel", "maya@example.com", "Frontend Engineer"],
    ["Jordan Kim", "jordan@example.com", "Designer"],
    ["Priya Sharma", "priya@example.com", "ML Engineer"],
    ["Marcus Johnson", "marcus@example.com", "Backend Infra"],
    ["Elena Vasquez", "elena@example.com", "Full-Stack Fintech"],
    ["Tom Berg", "tom@example.com", "Mobile Developer"],
    ["Yuki Tanaka", "yuki@example.com", "PM / Data"],
    ["Sara Lee", "sara@example.com", "DevOps"],
    ["David Okafor", "david@example.com", "Frontend Engineer"],
    ["Anna Kowalski", "anna@example.com", "Product Designer"],
  ]
  for (const [name, email, role] of userList) {
    console.log(`  ${name.padEnd(20)} ${email.padEnd(30)} ${role}`)
  }
  console.log("")
  console.log(`Projects (${createdProjects.length}):`)
  const projList = [
    ["OpenFeedback", "Ideation", "Needs designer"],
    ["Harbor CLI", "Building", "4 open roles"],
    ["PixelGrid", "Launched", "Team full"],
    ["DocLens", "Building", "2 open roles"],
    ["PixPay", "Building", "2 open roles"],
    ["TasteMatch", "Launched", "2 open roles"],
    ["BrandKit", "Ideation", "1 open role"],
  ]
  for (const [title, phase, status] of projList) {
    console.log(`  ${title.padEnd(18)} ${phase.padEnd(12)} ${status}`)
  }
  console.log(`Applications: ${applications.length}`)
  console.log(`Messages: ${chatMessages.length}`)
  console.log(`Notifications: ${notifications.length}`)
  console.log("")
  console.log("All passwords: password123")
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
