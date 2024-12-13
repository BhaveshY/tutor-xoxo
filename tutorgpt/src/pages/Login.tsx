import {
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  LoadingOverlay,
  Anchor,
} from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import useStore from '../store/useStore.ts';
import React from 'react';

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, isLoading } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signIn(formData.email, formData.password);
        notifications.show({
          title: 'Success',
          message: 'Successfully logged in',
          color: 'green',
        });
      } else {
        await signUp(formData.email, formData.password, formData.name);
        notifications.show({
          title: 'Success',
          message: 'Account created successfully',
          color: 'green',
        });
      }
      navigate('/');
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Authentication failed',
        color: 'red',
      });
    }
  };

  return (
    <Container size="xs" mt="xl">
      <Paper radius="md" p="xl" withBorder pos="relative">
        <LoadingOverlay visible={isLoading} />
        <Title order={2} ta="center" mb="md">
          {isLogin ? 'Welcome back!' : 'Create account'}
        </Title>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            {!isLogin && (
              <TextInput
                required
                label="Name"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            )}

            <TextInput
              required
              label="Email"
              type="email"
              placeholder="hello@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <PasswordInput
              required
              label="Password"
              placeholder="Your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            <Button type="submit" fullWidth mt="xl" loading={isLoading}>
              {isLogin ? 'Sign in' : 'Create account'}
            </Button>

            <Text ta="center" size="sm">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Anchor
                component="button"
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                size="sm"
              >
                {isLogin ? 'Create one' : 'Login'}
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default Login; 