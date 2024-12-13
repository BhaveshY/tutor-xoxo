import React from 'react';
import { AppShell, Burger, Group, Text, Button, Stack } from '@mantine/core';
import { IconBook, IconRoad, IconBrain, IconLogout } from '@tabler/icons-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import useStore from '../store/useStore.ts';

const Layout = () => {
  const { currentMode, setCurrentMode, user, signOut } = useStore();
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);

  const modes = [
    { value: 'tutor', label: 'Tutor', icon: IconBook },
    { value: 'roadmap', label: 'Roadmap', icon: IconRoad },
    { value: 'practice', label: 'Practice', icon: IconBrain },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      notifications.show({
        title: 'Success',
        message: 'Successfully signed out',
        color: 'green',
      });
      navigate('/login');
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to sign out',
        color: 'red',
      });
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              hiddenFrom="sm"
              size="sm"
            />
            <Text size="lg" fw={700}>TutorGPT</Text>
          </Group>
          <Text>Welcome, {user?.name}</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="sm">
          {modes.map((mode) => (
            <Button
              key={mode.value}
              fullWidth
              variant={currentMode === mode.value ? 'filled' : 'light'}
              onClick={() => setCurrentMode(mode.value as 'tutor' | 'roadmap' | 'practice')}
              leftSection={<mode.icon size={20} />}
            >
              {mode.label}
            </Button>
          ))}
          <Button
            fullWidth
            variant="light"
            onClick={() => navigate('/profile')}
          >
            Profile Settings
          </Button>
          <Button
            fullWidth
            variant="light"
            color="red"
            onClick={handleSignOut}
            leftSection={<IconLogout size={20} />}
          >
            Sign Out
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};

export default Layout; 