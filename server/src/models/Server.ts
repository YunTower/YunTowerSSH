import { Database } from 'sqlite3'
import { encrypt } from '../utils/crypto'

export interface Server {
  id: number
  name: string
  host: string
  port: number
  username: string
  password: string
  userId: number
  createdAt: Date
  updatedAt: Date
}

export class ServerModel {
  constructor(private db: Database) {
    this.initTable()
  }

  private initTable() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        userId INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `)
  }

  async create(server: Omit<Server, 'id' | 'createdAt' | 'updatedAt'>, secret: string): Promise<Server> {
    const encryptedPassword = encrypt(server.password, secret)
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO servers (name, host, port, username, password, userId) VALUES (?, ?, ?, ?, ?, ?)',
        [server.name, server.host, server.port, server.username, encryptedPassword, server.userId],
        function(err) {
          if (err) return reject(err)
          resolve({
            id: this.lastID,
            ...server,
            password: encryptedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      )
    })
  }

  async findById(id: number): Promise<Server | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM servers WHERE id = ?',
        [id],
        (err, row) => {
          if (err) return reject(err)
          resolve(row ? row as Server : null)
        }
      )
    })
  }

  async findByUserId(userId: number): Promise<Server[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM servers WHERE userId = ?',
        [userId],
        (err, rows) => {
          if (err) return reject(err)
          resolve(rows as Server[])
        }
      )
    })
  }

  async update(id: number, server: Partial<Server>, secret: string): Promise<void> {
    const updates: string[] = []
    const values: any[] = []

    if (server.name) {
      updates.push('name = ?')
      values.push(server.name)
    }
    if (server.host) {
      updates.push('host = ?')
      values.push(server.host)
    }
    if (server.port) {
      updates.push('port = ?')
      values.push(server.port)
    }
    if (server.username) {
      updates.push('username = ?')
      values.push(server.username)
    }
    if (server.password) {
      updates.push('password = ?')
      values.push(encrypt(server.password, secret))
    }

    if (updates.length === 0) return

    updates.push('updatedAt = CURRENT_TIMESTAMP')
    values.push(id)

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE servers SET ${updates.join(', ')} WHERE id = ?`,
        values,
        (err) => {
          if (err) return reject(err)
          resolve()
        }
      )
    })
  }

  async delete(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM servers WHERE id = ?',
        [id],
        (err) => {
          if (err) return reject(err)
          resolve()
        }
      )
    })
  }
} 