TutorGPT is an AI-powered learning platform we're building that makes education more interactive and personalized. Let me break down the key components for you:

1. **Project Architecture**:
   - We're using React with TypeScript for the frontend
   - Supabase for our backend and authentication
   - DeepSeek R1 through OpenRouter for AI capabilities

2. **Key Features**:
   - AI Tutoring system
   - Practice question generation
   - Learning roadmaps
   - Progress tracking
   - Powered by DeepSeek R1

3. **Project Structure**:
   - `/src`: Our main React application code
     - `/components`: Reusable UI components
     - `/pages`: Main page components
     - `/services`: API integrations
     - `/hooks`: Custom React hooks
   - `/supabase`: Backend functionality
     - `/functions`: Edge functions for AI integration
   
4. **Tech Stack**:
   - Frontend: React + TypeScript + Mantine UI (for beautiful, modern components)
   - Backend: Supabase (handles our database and authentication)
   - AI Integration: OpenRouter with DeepSeek R1

5. **Key Components You'll Work With**:
   - `LLMSelector.tsx`: Allows users to choose different AI models
   - `Practice.tsx`: Handles practice question functionality
   - `Chat.tsx`: Manages the tutoring interface
   - Various services in `/services` that handle API communications

The project is designed to be modular and scalable. We're using modern best practices like TypeScript for type safety and Mantine UI for consistent design.

Is there any specific part of the system you'd like me to explain in more detail? For instance, I can dive deeper into:
- How our AI model integration works
- The authentication flow
- The practice question generation system
- Or any other component you're curious about
