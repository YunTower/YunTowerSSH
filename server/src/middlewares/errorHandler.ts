import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(`[${new Date().toISOString()}] Error:`, err.stack)
  
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500
  const response = {
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  }
  
  res.status(statusCode).json(response)
} 