# Session Buddy Server

Backend server for Session Buddy cross-browser session sharing functionality.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start MongoDB:
Make sure MongoDB is running on your system. The default connection URL is `mongodb://localhost:27017/session_buddy`

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### POST /api/sessions
Store a new shared session.
- Request body: `{ token: string, package: SessionPackage }`
- Response: `{ success: true, token: string }`

### GET /api/sessions/:token
Retrieve a shared session.
- Response: `SessionPackage` or `404` if not found

### GET /api/validate/:token
Validate a session token.
- Response: `{ valid: true }` or `404` if invalid

### POST /api/revoke/:token
Revoke a shared session.
- Response: `{ success: true }`

## Security Features

- CORS protection (only allows chrome extension origins)
- Rate limiting (50 requests per minute per IP)
- Automatic session expiration
- Optional encryption of session data
- One-time use tokens

## Error Handling

The server includes comprehensive error handling:
- Invalid tokens
- Expired sessions
- Rate limiting
- Server errors

## Development

To modify the server configuration, edit the following values in `server.js`:
- `port`: Server port (default: 3000)
- `RATE_LIMIT`: Requests per minute (default: 50)
- `RATE_WINDOW`: Rate limit window in milliseconds (default: 60000)
