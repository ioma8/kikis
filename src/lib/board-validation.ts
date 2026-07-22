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
  if (description.length > 2000) {
    return { field: 'description', message: 'Description must be 2000 characters or fewer' }
  }
  return null
}

export function validateDueDate(date: string | null): ValidationError | null {
  if (!date) return null
  const parsed = new Date(date)
  if (isNaN(parsed.getTime())) {
    return { field: 'dueDate', message: 'Invalid date format' }
  }
  return null
}
