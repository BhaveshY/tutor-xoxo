import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextInput,
  PasswordInput,
  Button,
  Container,
  Title,
  Text,
  Stack,
  Paper,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import useStore from '../../tutorgpt/src/store/useStore.ts';

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, emailConfirmationSent } = useStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await signUp(email, password, name);
        notifications.show({
          title: 'Success',
          message: 'Please check your email to confirm your account',
          color: 'green',
        });
      } else {
        await signIn(email, password);
        navigate('/');
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Authentication failed',
        color: 'red',
      });
    }
  };

  if (emailConfirmationSent) {
    return (
      <Container size="xs" mt="xl">
        <Paper p="md" withBorder>
          <Title order={2} mb="md">Check Your Email</Title>
          <Text>
            We've sent you a confirmation email. Please check your inbox and follow the link to confirm your account.
          </Text>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="xs" mt="xl">
      <Paper p="md" withBorder>
        <Title order={2} mb="md">{isSignUp ? 'Create Account' : 'Welcome Back'}</Title>
        <form onSubmit={handleSubmit}>
          <Stack>
            {isSignUp && (
              <TextInput
                label="Name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <TextInput
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" fullWidth>
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
            <Button variant="subtle" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default Login; 