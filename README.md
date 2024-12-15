# TutorXOXO - AI-Powered Learning Platform

TutorXOXO is an interactive learning platform that combines AI-powered tutoring, personalized practice questions, and dynamic learning roadmaps to create an engaging educational experience.

## 🌟 Features

- **AI Tutor**: Get instant help and explanations on any topic
- **Practice Questions**: Generate custom multiple-choice questions with varying difficulty levels
- **Learning Roadmaps**: Create personalized learning paths for any subject
- **Progress Tracking**: Monitor your learning progress with detailed statistics
- **Subject Specialization**: Support for multiple subjects including Mathematics, Physics, Computer Science, and more

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/BhaveshY/tutor-xoxo.git
cd tutor-xoxo
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp supabase/.env.example supabase/.env
```

4. Update the `.env` file with your API keys and configuration:
```env
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

5. Start the development server:
```bash
npm run dev
# or
yarn dev
```

## 🏗️ Project Structure

```
tutorxoxo/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components and routing
│   ├── services/      # API and service integrations
│   ├── store/         # State management
│   └── styles/        # Global styles and themes
├── supabase/
│   └── functions/     # Edge Functions for AI integration
└── public/           # Static assets
```

## 🛠️ Technologies Used

- **Frontend**: React, TypeScript, Mantine UI
- **Backend**: Supabase, Edge Functions
- **AI**: OpenAI GPT-4
- **State Management**: Custom store implementation
- **Styling**: Mantine UI components and custom CSS


## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
