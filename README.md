# SSH Client

A modern SSH client built with Vue 3, TypeScript, and Tauri.

## Features

- Secure authentication with JWT
- Server management (add, edit, delete)
- Real-time terminal access
- Terminal search functionality
- Responsive design
- Cross-platform support

## Prerequisites

- Node.js 18+
- npm 8+
- SQLite3
- Rust (for Tauri)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ssh-client.git
cd ssh-client
```

2. Install dependencies:
```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Create environment files:
```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your configuration
```

## Development

1. Start the server:
```bash
cd server
npm run dev
```

2. Start the client:
```bash
cd client
npm run dev
```

## Project Structure

```
ssh-client/
├── client/                 # Vue 3 frontend
│   ├── src/
│   │   ├── assets/        # Static assets
│   │   ├── components/    # Vue components
│   │   ├── stores/        # Pinia stores
│   │   ├── views/         # Page components
│   │   └── utils/         # Utility functions
│   └── ...
├── server/                 # Express backend
│   ├── src/
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utility functions
│   └── ...
└── ...
```

## Security

- All passwords are encrypted using AES-256-GCM
- JWT tokens for authentication
- SQL injection prevention
- XSS protection
- CORS configuration

## Performance Optimizations

- Debounced search
- Throttled resize events
- Memoized computations
- Lazy-loaded components
- WebSocket connection pooling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 