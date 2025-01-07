import React, { ReactNode } from 'react';
import { AppShell, Burger, Group, Text, Button, Stack, NavLink } from '@mantine/core';
import { IconBook, IconRoad, IconBrain, IconLogout, IconProgress, IconChartBar, IconBookmark } from '@tabler/icons-react';
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
        <Stack gap="sm">
          <NavLink
            label="Tutor"
            leftSection={<IconBook size={20} />}
            active={currentMode === 'tutor'}
            onClick={() => setCurrentMode('tutor')}
          />
          <NavLink
            label="Roadmap"
            leftSection={<IconRoad size={20} />}
            active={currentMode === 'roadmap'}
            onClick={() => setCurrentMode('roadmap')}
          />
          <NavLink
            label="Practice"
            leftSection={<IconBrain size={20} />}
            active={currentMode === 'practice'}
            onClick={() => setCurrentMode('practice')}
          />
          <NavLink
            label="Projects"
            leftSection={<IconBookmark size={20} />}
            active={currentMode === 'projects'}
            onClick={() => setCurrentMode('projects')}
          />
          <NavLink
            label="Progress"
            leftSection={<IconChartBar size={20} />}
            active={currentMode === 'progress'}
            onClick={() => setCurrentMode('progress')}
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
};

export default Layout; 