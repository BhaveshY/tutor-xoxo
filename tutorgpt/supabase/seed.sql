-- Insert initial project suggestions
INSERT INTO public.project_suggestions (title, description, difficulty, estimated_hours, tech_stack, learning_outcomes)
VALUES
  (
    'Personal Portfolio Website',
    'Create a modern portfolio website to showcase your projects and skills. Include an about section, project gallery, and contact form.',
    'beginner',
    10,
    ARRAY['HTML', 'CSS', 'JavaScript', 'React'],
    ARRAY['Frontend Development', 'Responsive Design', 'Component Architecture', 'Form Handling']
  ),
  (
    'Task Management API',
    'Build a RESTful API for managing tasks and to-do lists. Implement user authentication, task CRUD operations, and data persistence.',
    'intermediate',
    20,
    ARRAY['Node.js', 'Express', 'PostgreSQL', 'JWT'],
    ARRAY['Backend Development', 'API Design', 'Database Management', 'Authentication']
  ),
  (
    'Real-time Chat Application',
    'Develop a real-time chat application with features like private messaging, group chats, and message history.',
    'advanced',
    40,
    ARRAY['React', 'Node.js', 'Socket.io', 'MongoDB'],
    ARRAY['Full Stack Development', 'Real-time Communication', 'State Management', 'NoSQL Databases']
  ),
  (
    'Weather Dashboard',
    'Create a weather dashboard that displays current weather and forecasts for multiple cities using a weather API.',
    'beginner',
    15,
    ARRAY['HTML', 'CSS', 'JavaScript', 'API Integration'],
    ARRAY['API Integration', 'Data Visualization', 'Async Programming', 'UI Design']
  ),
  (
    'E-commerce Product Catalog',
    'Build a product catalog with features like filtering, sorting, and shopping cart functionality.',
    'intermediate',
    25,
    ARRAY['React', 'Redux', 'Node.js', 'MongoDB'],
    ARRAY['State Management', 'Data Modeling', 'Search/Filter Implementation', 'Cart Logic']
  ); 