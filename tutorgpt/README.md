# TutorGPT

A multimodal React web application that acts as an AI-powered tutor, helping users learn and track their progress through various modes of interaction.

## Features

- **Tutor Mode**: Get instant help and explanations for your questions
- **Roadmap Mode**: Generate personalized learning roadmaps with an integrated text editor
- **Practice Mode**: Test your knowledge with AI-generated questions
- **User Profiles**: Track your learning progress and interests
- **Modern UI**: Built with Mantine UI components for a great user experience

## Tech Stack

- React + TypeScript
- Vite
- Mantine UI
- Monaco Editor
- Zustand for state management
- React Router for navigation
- Axios for API calls

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your configuration:
   ```
   VITE_API_URL=your_api_url
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
  ├── components/      # Reusable components
  ├── pages/          # Page components
  ├── store/          # State management
  ├── services/       # API services
  ├── types/          # TypeScript types
  └── utils/          # Utility functions
```

## Development

- Run development server: `npm run dev`
- Build for production: `npm run build`
- Preview production build: `npm run preview`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
