import { Database } from 'sqlite3'
import bcrypt from 'bcryptjs'

export interface User {
  id: number
  username: string
  password: string
  createdAt: Date
  updatedAt: Date
}

export class UserModel {
  constructor(private db: Database) {
    this.initTable()
  }

  private initTable() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  async create(username: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10)
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword],
        function(err) {
          if (err) return reject(err)
          resolve({
            id: this.lastID,
            username,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      )
    })
  }

  async findByUsername(username: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, row) => {
          if (err) return reject(err)
          resolve(row ? row as User : null)
        }
      )
    })
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password)
  }
} 