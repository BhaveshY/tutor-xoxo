# TutorGPT

An AI-powered tutoring platform that uses multiple language models to provide personalized learning experiences.

## Features

- Multiple AI model support through OpenRouter
- Interactive chat with AI tutors
- Learning roadmap generation
- Practice project suggestions
- Progress tracking

## Supported Models

- GPT-4 Turbo (OpenAI)
- Claude 3 Opus (Anthropic)
- Claude 3 Sonnet (Anthropic)
- Gemini Pro (Google)
- Llama 2 70B (Meta)
- Mistral Medium (Mistral)

## Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/tutorgpt.git
cd tutorgpt
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase Edge Functions:

Create a `.env` file in `supabase/functions`:
```
OPENROUTER_API_KEY=your_openrouter_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

5. Deploy Edge Functions:
```bash
supabase functions deploy
```

6. Apply Database Migrations:
```bash
supabase db push
```

7. Start the development server:
```bash
npm run dev
```

## Environment Setup

1. Sign up for an OpenRouter account at https://openrouter.ai/
2. Get your API key from the OpenRouter dashboard
3. Set up a Supabase project at https://supabase.com/
4. Get your Supabase URL and anon key from the project settings
5. Add all required environment variables as described above

## Database Schema

The application uses the following tables:

1. `chat_messages`
   - user_id (uuid)
   - message (text)
   - is_user (boolean)
   - provider (text, nullable)
   - created_at (timestamp)

2. `roadmaps`
   - id (uuid)
   - user_id (uuid)
   - title (text)
   - content (text)
   - provider (text, nullable)
   - created_at (timestamp)

3. `projects`
   - id (uuid)
   - roadmap_id (uuid)
   - title (text)
   - description (text)
   - requirements (text)
   - provider (text, nullable)
   - created_at (timestamp)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
