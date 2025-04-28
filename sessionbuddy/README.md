# Session Buddy - Cookie Manager Chrome Extension

A Chrome extension for managing browser sessions and cookies with a modern, user-friendly interface.

## Features

- Create and manage multiple cookie stores
- View and edit cookie details
- Secure cookie handling
- Modern Vue 3 + TypeScript implementation
- Comprehensive test coverage

## Development

### Prerequisites

- Node.js 16+
- npm or yarn
- Chrome browser

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/session-buddy.git
cd session-buddy
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

### Testing

Run unit tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Linting

Run ESLint:
```bash
npm run lint
```

## Project Structure

```
src/
  ├── components/     # Vue components
  ├── stores/        # Pinia stores
  ├── types/         # TypeScript type definitions
  ├── utils/         # Utility functions
  └── main.ts        # Application entry point

tests/
  ├── components/    # Component tests
  ├── stores/        # Store tests
  └── utils/         # Utility tests
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

- All cookie operations are performed securely using Chrome's cookie API
- Sensitive data is stored locally in Chrome's storage
- No data is sent to external servers

## Acknowledgments

- Built with Vue 3 and TypeScript
- Uses Pinia for state management
- Styled with Tailwind CSS 