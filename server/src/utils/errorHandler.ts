export class AppError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'AppError'
  }
}

export const handleError = (error: unknown, context: string): void => {
  console.error(`[${context}]`, error)
  
  if (error instanceof AppError) {
    console.error(`Error code: ${error.code}`)
  }
  
  if (error instanceof Error) {
    console.error(`Error message: ${error.message}`)
    console.error(`Stack trace: ${error.stack}`)
  }
} 