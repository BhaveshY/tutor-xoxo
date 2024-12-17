import React, { ReactNode } from 'react';
import { AppShell, Burger, Group, Text, Button, Stack } from '@mantine/core';
import { IconBook, IconRoad, IconBrain, IconLogout, IconProgress } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore.ts';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { currentMode, setCurrentMode, user, signOut } = useStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Text size="lg" fw={500}>TutorGPT</Text>
          <Group>
            <Text size="sm">{user?.name}</Text>
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconLogout size={20} />}
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack>
          <Button
            variant={currentMode === 'tutor' ? 'filled' : 'light'}
            leftSection={<IconBook size={20} />}
            onClick={() => setCurrentMode('tutor')}
          >
            AI Tutor
          </Button>
          <Button
            variant={currentMode === 'roadmap' ? 'filled' : 'light'}
            leftSection={<IconRoad size={20} />}
            onClick={() => setCurrentMode('roadmap')}
          >
            Learning Roadmap
          </Button>
          <Button
            variant={currentMode === 'practice' ? 'filled' : 'light'}
            leftSection={<IconBrain size={20} />}
            onClick={() => setCurrentMode('practice')}
          >
            Practice Questions
          </Button>
          <Button
            variant={currentMode === 'progress' ? 'filled' : 'light'}
            leftSection={<IconProgress size={20} />}
            onClick={() => setCurrentMode('progress')}
          >
            Learning Progress
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
};

export default Layout; 