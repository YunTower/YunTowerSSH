import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { handleError } from '../utils/errorHandler'
import bcrypt from 'bcryptjs'

interface QueryCache {
  [key: string]: {
    result: any
    timestamp: number
  }
}

export class DatabaseService {
  private db: any
  private queryCache: QueryCache = {}
  private readonly CACHE_TTL = 60000 // 1 minute
  private readonly MAX_CACHE_SIZE = 100

  constructor() {
    this.init()
  }

  private async init() {
    try {
      this.db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
      })

      await this.createTables()
      await this.ensureAdminUser()
    } catch (error) {
      handleError(error, '数据库初始化失败')
      throw error
    }
  }

  private async createTables() {
    try {
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS servers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          host TEXT NOT NULL,
          port INTEGER NOT NULL,
          username TEXT NOT NULL,
          password TEXT,
          private_key TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_connected DATETIME,
          connection_count INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `)
    } catch (error) {
      handleError(error, '创建数据表失败')
      throw error
    }
  }

  private async ensureAdminUser() {
    try {
      const adminUsers = await this.query('SELECT * FROM users WHERE username = ?', ['admin'])
      if (adminUsers.length === 0) {
        const hashedPassword = await bcrypt.hash('admin', 10)
        await this.execute(
          'INSERT INTO users (username, password) VALUES (?, ?)',
          ['admin', hashedPassword]
        )
        console.log('Admin user created successfully')
      }
    } catch (error) {
      handleError(error, '创建管理员用户失败')
      throw error
    }
  }

  private getCacheKey(query: string, params: any[]): string {
    return `${query}-${JSON.stringify(params)}`
  }

  private isCacheValid(cacheEntry: { timestamp: number }): boolean {
    return Date.now() - cacheEntry.timestamp < this.CACHE_TTL
  }

  private cleanupCache(): void {
    const entries = Object.entries(this.queryCache)
    if (entries.length > this.MAX_CACHE_SIZE) {
      const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      const entriesToRemove = sortedEntries.slice(0, entries.length - this.MAX_CACHE_SIZE)
      entriesToRemove.forEach(([key]) => {
        delete this.queryCache[key]
      })
    }
  }

  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const cacheKey = this.getCacheKey(sql, params)
      const cachedResult = this.queryCache[cacheKey]

      if (cachedResult && this.isCacheValid(cachedResult)) {
        return cachedResult.result
      }

      const result = await this.db.all(sql, params)
      this.queryCache[cacheKey] = {
        result,
        timestamp: Date.now()
      }
      this.cleanupCache()
      return result
    } catch (error) {
      handleError(error, '查询失败')
      throw error
    }
  }

  async execute(sql: string, params: any[] = []): Promise<{ lastID: number }> {
    try {
      const result = await this.db.run(sql, params)
      // 清除相关的缓存
      Object.keys(this.queryCache).forEach(key => {
        if (key.includes(sql.split(' ')[0].toLowerCase())) {
          delete this.queryCache[key]
        }
      })
      return result
    } catch (error) {
      handleError(error, '执行失败')
      throw error
    }
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.db.close()
      this.db = null
      this.queryCache = {}
    }
  }
} 