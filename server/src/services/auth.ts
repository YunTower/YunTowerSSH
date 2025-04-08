import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { DatabaseService } from './database'
import { handleError } from '../utils/errorHandler'

interface User {
  id: number
  username: string
  password: string
}

export interface TokenPayload {
  id: number
  username: string
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
  private readonly SALT_ROUNDS = 10

  constructor(private db: DatabaseService) {}

  async login(username: string, password: string): Promise<{ token: string; user: TokenPayload }> {
    try {
      const users = await this.db.query<User[]>('SELECT * FROM users WHERE username = ?', [username])
      const user = users[0] as unknown as User

      if (!user) {
        throw new Error('用户不存在')
      }

      const isValid = await bcrypt.compare(password, user.password)
      if (!isValid) {
        throw new Error('密码错误')
      }

      const token = this.generateToken({ id: user.id, username: user.username })
      return { token, user: { id: user.id, username: user.username } }
    } catch (error) {
      handleError(error, '登录失败')
      throw error
    }
  }

  async register(username: string, password: string): Promise<void> {
    try {
      const existingUsers = await this.db.query<User[]>('SELECT * FROM users WHERE username = ?', [username])
      if (existingUsers.length > 0) {
        throw new Error('用户名已存在')
      }

      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS)
      await this.db.execute(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword]
      )
    } catch (error) {
      handleError(error, '注册失败')
      throw error
    }
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload
      return decoded
    } catch (error) {
      handleError(error, 'Token验证失败')
      throw new Error('无效的Token')
    }
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    try {
      const users = await this.db.query<User[]>('SELECT * FROM users WHERE id = ?', [userId])
      const user = users[0] as unknown as User

      if (!user) {
        throw new Error('用户不存在')
      }

      const isValid = await bcrypt.compare(oldPassword, user.password)
      if (!isValid) {
        throw new Error('旧密码错误')
      }

      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS)
      await this.db.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, userId]
      )
    } catch (error) {
      handleError(error, '修改密码失败')
      throw error
    }
  }

  async resetPassword(userId: number, newPassword: string): Promise<void> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS)
      await this.db.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, userId]
      )
    } catch (error) {
      handleError(error, '重置密码失败')
      throw error
    }
  }

  private generateToken(user: TokenPayload): string {
    return jwt.sign(
      { id: user.id, username: user.username },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    )
  }
} 