import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const seedOrigin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
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

  await prisma.teamMember.deleteMany()
  await prisma.application.deleteMany()
  await prisma.roleTag.deleteMany()
  await prisma.profileTag.deleteMany()
  await prisma.role.deleteMany()
  await prisma.project.deleteMany()
  await prisma.portfolio.deleteMany()
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

  console.log("  Alex Chen  (Founder)   —", alex.id)
  console.log("  Maya Patel (Developer) —", maya.id)
  console.log("  Jordan Kim (Designer)  —", jordan.id)

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
  ])

  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t]))

  console.log("Creating profiles...")

  await prisma.profile.create({
    data: {
      userId: alex.id,
      bio: "Full-stack founder building the next generation of dev tools. Passionate about open source.",
      timezone: "America/New_York",
      githubUrl: "https://github.com/alexchen",
      linkedinUrl: "https://linkedin.com/in/alexchen",
      websiteUrl: "https://alexchen.dev",
      location: "New York, NY",
      tldr: "Founder building next-gen dev tools",
      experience: "8+ years",
      topSkill: "Product Engineering",
      partnerships: "Looking for a co-founder",
      commitment: "Full-time",
      motivation: "Building the future of developer tooling",
      lookingFor: "co-founder",
      isPublic: true,
      onboardingCompleted: true,
      tags: {
        create: [
          { tagId: tagMap["TypeScript"].id },
          { tagId: tagMap["Next.js"].id },
          { tagId: tagMap["React"].id },
          { tagId: tagMap["PostgreSQL"].id },
        ],
      },
    },
  })

  await prisma.profile.create({
    data: {
      userId: maya.id,
      bio: "Senior frontend engineer specializing in React ecosystems. Love building beautiful UIs.",
      timezone: "Europe/London",
      githubUrl: "https://github.com/mayapatel",
      location: "London, UK",
      tldr: "Senior frontend engineer passionate about developer UX",
      experience: "6+ years",
      topSkill: "React",
      partnerships: "Open to side projects",
      commitment: "Part-time",
      motivation: "Love building beautiful and performant user interfaces",
      lookingFor: "team",
      isPublic: true,
      onboardingCompleted: true,
      tags: {
        create: [
          { tagId: tagMap["Next.js"].id },
          { tagId: tagMap["Prisma"].id },
          { tagId: tagMap["Tailwind CSS"].id },
          { tagId: tagMap["TypeScript"].id },
        ],
      },
    },
  })

  await prisma.profile.create({
    data: {
      userId: jordan.id,
      bio: "Product designer with 6 years of experience. I turn complex problems into simple, elegant interfaces.",
      timezone: "America/Los_Angeles",
      githubUrl: "https://github.com/jordankim",
      linkedinUrl: "https://linkedin.com/in/jordankim",
      websiteUrl: "https://jordankim.design",
      location: "San Francisco, CA",
      tldr: "Product designer crafting elegant user experiences",
      experience: "6+ years",
      topSkill: "UI Design",
      partnerships: "Looking for a design role at a startup",
      commitment: "Full-time",
      motivation: "Turning complex problems into simple, elegant interfaces",
      lookingFor: "co-founder",
      isPublic: true,
      onboardingCompleted: true,
      tags: {
        create: [
          { tagId: tagMap["Figma"].id },
          { tagId: tagMap["UI Design"].id },
        ],
      },
    },
  })

  console.log("Creating portfolios...")

  await prisma.portfolio.create({
    data: {
      userId: maya.id,
      title: "E-commerce Dashboard",
      description: "A real-time analytics dashboard for an e-commerce platform built with Next.js and Prisma.",
      url: "https://dashboard-demo.vercel.app",
      githubUrl: "https://github.com/mayapatel/dashboard",
    },
  })

  await prisma.portfolio.create({
    data: {
      userId: jordan.id,
      title: "Fintech Mobile App",
      description: "End-to-end product design for a personal finance management app.",
      url: "https://dribbble.com/jordankim/fintech-app",
    },
  })

  await prisma.portfolio.create({
    data: {
      userId: jordan.id,
      title: "SaaS Dashboard Redesign",
      description: "Complete redesign of a B2B analytics dashboard improving UX metrics by 40%.",
      url: "https://dribbble.com/jordankim/saas-redesign",
    },
  })

  console.log("Creating projects...")

  const project1 = await prisma.project.create({
    data: {
      ownerId: alex.id,
      title: "OpenFeedback",
      tagline: "Open-source feedback widget for modern web apps. Think Canny, but self-hosted.",
      description:
        "We're building a lightweight, privacy-first feedback collection tool that developers can self-host. The idea is to give product teams full control over their feedback data without paying SaaS premiums. We have the MVP roughed out — now we need a designer to make it beautiful.",
      phase: "Ideation",
      isPublic: true,
    },
  })

  const project2 = await prisma.project.create({
    data: {
      ownerId: alex.id,
      title: "Harbor CLI",
      tagline: "A CLI tool that automates Docker container orchestration for local dev environments.",
      description:
        "Harbor lets developers define their entire local dev stack in a single YAML file and spin it up in seconds. We have a working prototype but need help building out the backend service coordination layer.",
      phase: "Building",
      isPublic: true,
    },
  })

  const project3 = await prisma.project.create({
    data: {
      ownerId: jordan.id,
      title: "PixelGrid",
      tagline: "Collaborative mood board platform for design teams.",
      description:
        "PixelGrid lets design teams create, share, and collaborate on mood boards in real-time. Launched 3 months ago and growing steadily.",
      phase: "Launched",
      isPublic: true,
      discordLink: "https://discord.gg/pixelgrid",
      repoLink: "https://github.com/pixelgrid/pixelgrid",
    },
  })

  console.log("Creating roles...")

  const role1 = await prisma.role.create({
    data: {
      projectId: project1.id,
      title: "UI/UX Designer",
      description:
        "We need someone to design the widget embed flow, the admin dashboard, and ensure the overall look and feel is polished. Experience with design systems is a plus.",
      isFilled: false,
    },
  })

  await prisma.roleTag.create({
    data: { roleId: role1.id, tagId: tagMap["Figma"].id },
  })
  await prisma.roleTag.create({
    data: { roleId: role1.id, tagId: tagMap["UI Design"].id },
  })

  const role2 = await prisma.role.create({
    data: {
      projectId: project2.id,
      title: "Backend Engineer",
      description:
        "Build and maintain the core orchestration engine. You'll work on container lifecycle management, networking, and the plugin system. Experience with Node.js and Docker is essential.",
      isFilled: false,
    },
  })

  await prisma.roleTag.create({
    data: { roleId: role2.id, tagId: tagMap["Node.js"].id },
  })
  await prisma.roleTag.create({
    data: { roleId: role2.id, tagId: tagMap["Docker"].id },
  })
  await prisma.roleTag.create({
    data: { roleId: role2.id, tagId: tagMap["TypeScript"].id },
  })

  await prisma.role.create({
    data: {
      projectId: project2.id,
      title: "Frontend Contributor",
      description: "Help us build the web dashboard for managing Harbor stacks. React/Next.js experience required.",
      isFilled: false,
    },
  })

  await prisma.role.create({
    data: {
      projectId: project2.id,
      title: "Documentation Writer",
      description: "Write clear, comprehensive docs for the CLI tool including quickstart guides, API references, and tutorials.",
      isFilled: false,
    },
  })

  const role3 = await prisma.role.create({
    data: {
      projectId: project3.id,
      title: "Backend Developer",
      description: "Maintain and scale the real-time collaboration backend.",
      isFilled: true,
    },
  })

  await prisma.roleTag.create({
    data: { roleId: role3.id, tagId: tagMap["Rust"].id },
  })
  await prisma.roleTag.create({
    data: { roleId: role3.id, tagId: tagMap["PostgreSQL"].id },
  })

  console.log("Creating team for PixelGrid (Launched, team full)...")

  await prisma.teamMember.create({
    data: { projectId: project3.id, userId: jordan.id, role: "Founder & Designer" },
  })
  await prisma.teamMember.create({
    data: { projectId: project3.id, userId: alex.id, role: "Lead Developer" },
  })

  console.log("Creating application (Maya → Harbor CLI Backend Engineer)...")

  await prisma.application.create({
    data: {
      userId: maya.id,
      roleId: role2.id,
      message:
        "I've been working with Node.js and Docker for the past 4 years. I built a similar orchestration tool for my previous company and would love to contribute to Harbor. I have experience with container lifecycle management and have contributed to several open-source CLI tools.",
      status: "Pending",
    },
  })

  console.log("")
  console.log("Seed complete!")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("Users:")
  console.log(`  Alex Chen  (Founder)   — alex@example.com`)
  console.log(`  Maya Patel (Developer) — maya@example.com`)
  console.log(`  Jordan Kim (Designer)  — jordan@example.com`)
  console.log("")
  console.log("Projects:")
  console.log(`  OpenFeedback (Ideation) — needs a Designer`)
  console.log(`  Harbor CLI (Building)   — needs Backend Engineer, Frontend, Docs Writer`)
  console.log(`  PixelGrid (Launched)    — team is full`)
  console.log("")
  console.log("Applications:")
  console.log(`  Maya Patel → Harbor CLI (Backend Engineer) — Pending`)
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
