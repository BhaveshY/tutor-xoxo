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
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useStore } from '../store/useStore.ts';

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, isLoading, emailConfirmationSent } = useStore();
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
        notifications.show({
          title: 'Success',
          message: 'Successfully signed in',
          color: 'green',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'An error occurred',
        color: 'red',
      });
    }
  };

  if (emailConfirmationSent) {
    return (
      <Container size="xs" py="xl">
        <Paper p="md" radius="md" withBorder>
          <Stack>
            <Title order={2} ta="center">Check Your Email</Title>
            <Text c="dimmed" ta="center">
              We've sent you a confirmation email. Please check your inbox and follow the instructions to complete your registration.
            </Text>
            <Button variant="light" onClick={() => window.location.reload()}>
              Back to Login
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="xs" py="xl">
      <Paper p="md" radius="md" withBorder>
        <form onSubmit={handleSubmit}>
          <Stack>
            <Title order={2} ta="center">{isSignUp ? 'Create Account' : 'Welcome Back'}</Title>
            <Text c="dimmed" size="sm" ta="center">
              {isSignUp
                ? 'Create an account to start learning'
                : 'Sign in to continue your learning journey'}
            </Text>

            {isSignUp && (
              <TextInput
                label="Name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                required
              />
            )}

            <TextInput
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
            />

            <Button type="submit" loading={isLoading}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>

            <Divider label="or" labelPosition="center" />

            <Button variant="light" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default Login; 