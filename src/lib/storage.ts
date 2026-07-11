import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

const UPLOAD_DIR = join(process.cwd(), "public", "uploads")
const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]

export type UploadResult = { url: string; key: string }

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "FileValidationError"
  }
}

function validateFile(file: File) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new FileValidationError(
      `Invalid file type "${file.type}". Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`
    )
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new FileValidationError(
      `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 2MB.`
    )
  }
}

export async function uploadFile(file: File, folder: string = "general"): Promise<UploadResult> {
  validateFile(file)

  const ext = file.name.split(".").pop() ?? "bin"
  const key = `${folder}/${crypto.randomUUID()}.${ext}`
  const filePath = join(UPLOAD_DIR, key)

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  await mkdir(join(UPLOAD_DIR, folder), { recursive: true })
  await writeFile(filePath, buffer)

  return { url: `/uploads/${key}`, key }
}

export async function uploadImage(file: File): Promise<UploadResult> {
  return uploadFile(file, "images")
}

export async function uploadAvatar(file: File): Promise<UploadResult> {
  validateFile(file)
  const ext = file.name.split(".").pop() ?? "bin"
  const key = `avatars/${crypto.randomUUID()}.${ext}`
  const filePath = join(UPLOAD_DIR, key)

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  await mkdir(join(UPLOAD_DIR, "avatars"), { recursive: true })
  await writeFile(filePath, buffer)

  return { url: `/uploads/${key}`, key }
}
