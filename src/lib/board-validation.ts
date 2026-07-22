import { descriptionToPlainText } from './description'

export type ValidationError = {
  field: string
  message: string
}

export function validateCardTitle(title: string): ValidationError | null {
  const trimmed = title.trim()
  if (!trimmed) {
    return { field: 'title', message: 'Title is required' }
  }
  if (trimmed.length > 180) {
    return { field: 'title', message: 'Title must be 180 characters or fewer' }
  }
  return null
}

export function validateDescription(description: string): ValidationError | null {
  if (descriptionToPlainText(description).length > 2000) {
    return { field: 'description', message: 'Description must be 2000 characters or fewer' }
  }
  return null
}

export function validateDueDate(date: string | null): ValidationError | null {
  if (!date) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) {
    return { field: 'dueDate', message: 'Invalid date format' }
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return { field: 'dueDate', message: 'Invalid date format' }
  }

  return null
}
