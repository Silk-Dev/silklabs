import { z } from "zod"

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const profileSchema = z.object({
  bio: z.string().max(500).optional(),
  timezone: z.string().optional(),
  githubUrl: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
})

export const portfolioSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().max(500).optional(),
  url: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
})

export const projectSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  tagline: z.string().max(280).optional(),
  description: z.string().max(2000).optional(),
  phase: z.enum(["Ideation", "Building", "Launched"]).optional(),
  coverImage: z.string().optional(),
  discordLink: z.string().url().optional().or(z.literal("")),
  repoLink: z.string().url().optional().or(z.literal("")),
  isPublic: z.boolean().optional(),
})

export const roleSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1, "Role title is required").max(100),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
})

export const wizardRoleSchema = z.object({
  title: z.string().min(1, "Role title is required").max(100),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
})

export const createProjectWizardSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  tagline: z.string().max(280).optional(),
  description: z.string().max(2000).optional(),
  phase: z.enum(["Ideation", "Building", "Launched"]),
  coverImage: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  roles: z.array(wizardRoleSchema).optional(),
})

export const applicationSchema = z.object({
  roleId: z.string(),
  message: z.string().max(1000).optional(),
})

export const productSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  tagline: z.string().max(280).optional(),
  description: z.string().max(5000).optional(),
  price: z.number().positive().optional(),
  category: z.string().max(100).optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(["Draft", "Published", "Archived"]).optional(),
})

export const searchSchema = z.object({
  query: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  phase: z.enum(["Ideation", "Building", "Launched"]).optional(),
  roleAvailable: z.boolean().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(12),
})
