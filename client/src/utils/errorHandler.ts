import { useMessage } from 'naive-ui'

export function handleError(error: unknown, context = 'Operation') {
  const message = useMessage()
  
  if (error instanceof Error) {
    console.error(`${context} failed:`, error)
    
    if (error.message.includes('Network Error')) {
      message.error('Network error - please check your connection')
    } else if (error.message.includes('401')) {
      message.error('Session expired - please login again')
    } else {
      message.error(`${context} failed: ${error.message}`)
    }
  } else {
    console.error('Unknown error:', error)
    message.error(`${context} failed unexpectedly`)
  }
}

export class AppError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'AppError'
  }
} 