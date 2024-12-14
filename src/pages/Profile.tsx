import { 
  Container, 
  TextInput, 
  MultiSelect, 
  Button, 
  Stack, 
  Title, 
  Paper,
  Text,
  Group,
  List,
  ThemeIcon,
  Progress,
  ActionIcon,
  Tooltip,
  Loader,
  Badge,
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import useStore from '../store/useStore.ts';
import { userActivityService } from '../services/userActivityService.ts';
import { UserActivity, UserReflection } from '../types/user.ts';
import { IconBrain, IconRefresh, IconArrowUp, IconCheck, IconX } from '@tabler/icons-react';
import React from 'react';

const Profile = () => {
  const { user, setUser } = useStore();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    interests: user?.interests || [],
    education: user?.education || '',
  });
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [reflection, setReflection] = useState<UserReflection | null>(null);
  const [isLoadingReflection, setIsLoadingReflection] = useState(false);

  const interestOptions = [
    'Programming',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'History',
    'Literature',
    'Art',
    'Music',
    'Computer Science',
  ].map(item => ({ value: item, label: item }));

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const [activitiesData, reflectionData] = await Promise.all([
        userActivityService.getUserActivities(user!.id),
        userActivityService.getLatestReflection(user!.id)
      ]);
      setActivities(activitiesData);
      setReflection(reflectionData);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load user data',
        color: 'red',
      });
    }
  };

  const handleSubmit = () => {
    try {
      setUser({
        ...user!,
        ...formData,
      });
      notifications.show({
        title: 'Success',
        message: 'Profile updated successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update profile',
        color: 'red',
      });
    }
  };

  const generateNewReflection = async () => {
    setIsLoadingReflection(true);
    try {
      const newReflection = await userActivityService.generateReflection(user!.id);
      setReflection(newReflection);
      notifications.show({
        title: 'Success',
        message: 'Learning reflection generated successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to generate reflection',
        color: 'red',
      });
    } finally {
      setIsLoadingReflection(false);
    }
  };

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Title order={2}>Profile Settings</Title>
        
        <Group grow align="flex-start">
          <Stack style={{ flex: 1 }}>
            <Paper p="md" withBorder>
              <Stack gap="md">
                <TextInput
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                
                <TextInput
                  label="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  readOnly
                />
                
                <MultiSelect
                  label="Areas of Interest"
                  data={interestOptions}
                  value={formData.interests}
                  onChange={(value: string[]) => setFormData({ ...formData, interests: value })}
                  searchable
                  clearable
                  placeholder="Select your interests"
                />
                
                <TextInput
                  label="Educational Qualification"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  placeholder="Enter your highest education"
                />
                
                <Button onClick={handleSubmit}>Save Changes</Button>
              </Stack>
            </Paper>

            <Paper p="md" withBorder>
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={3}>Recent Activity</Title>
                  <Badge>{activities.length} activities</Badge>
                </Group>
                
                {activities.map((activity) => (
                  <Paper key={activity.id} p="xs" withBorder>
                    <Group justify="apart">
                      <div>
                        <Text size="sm" fw={500}>
                          {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                          {activity.metadata.subject && ` • ${activity.metadata.subject}`}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {new Date(activity.timestamp).toLocaleString()}
                        </Text>
                      </div>
                      {activity.metadata.isCorrect !== undefined && (
                        <ThemeIcon 
                          color={activity.metadata.isCorrect ? 'green' : 'red'} 
                          variant="light"
                        >
                          {activity.metadata.isCorrect ? <IconCheck size={16} /> : <IconX size={16} />}
                        </ThemeIcon>
                      )}
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </Stack>

          <Stack style={{ flex: 1 }}>
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={3}>Learning Reflection</Title>
                  <Tooltip label="Generate new reflection">
                    <ActionIcon 
                      variant="light" 
                      onClick={generateNewReflection}
                      loading={isLoadingReflection}
                    >
                      <IconRefresh size={20} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                {reflection ? (
                  <>
                    <Text fw={500}>Last Updated: {new Date(reflection.timestamp).toLocaleString()}</Text>
                    
                    <Text>{reflection.summary}</Text>

                    <Title order={4}>Strengths</Title>
                    <List
                      spacing="xs"
                      icon={
                        <ThemeIcon color="green" size={24} radius="xl">
                          <IconCheck size={16} />
                        </ThemeIcon>
                      }
                    >
                      {reflection.strengths.map((strength, index) => (
                        <List.Item key={index}>{strength}</List.Item>
                      ))}
                    </List>

                    <Title order={4}>Areas for Improvement</Title>
                    <List
                      spacing="xs"
                      icon={
                        <ThemeIcon color="blue" size={24} radius="xl">
                          <IconArrowUp size={16} />
                        </ThemeIcon>
                      }
                    >
                      {reflection.areasForImprovement.map((area, index) => (
                        <List.Item key={index}>{area}</List.Item>
                      ))}
                    </List>

                    <Title order={4}>Recommendations</Title>
                    <List
                      spacing="xs"
                      icon={
                        <ThemeIcon color="violet" size={24} radius="xl">
                          <IconBrain size={16} />
                        </ThemeIcon>
                      }
                    >
                      {reflection.recommendations.map((rec, index) => (
                        <List.Item key={index}>{rec}</List.Item>
                      ))}
                    </List>

                    <Title order={4}>Subject Progress</Title>
                    <Stack gap="xs">
                      {Object.entries(reflection.subjectProgress).map(([subject, progress]) => (
                        <div key={subject}>
                          <Group justify="apart" mb={5}>
                            <Text size="sm">{subject}</Text>
                            <Text size="sm" fw={500}>{Math.round(progress)}%</Text>
                          </Group>
                          <Progress 
                            value={progress} 
                            color={progress > 75 ? 'green' : progress > 50 ? 'blue' : 'orange'} 
                          />
                        </div>
                      ))}
                    </Stack>
                  </>
                ) : (
                  <Stack align="center" py="xl">
                    <IconBrain size={40} stroke={1.5} color="gray" />
                    <Text c="dimmed" ta="center">
                      No reflection generated yet
                    </Text>
                    <Button 
                      variant="light"
                      onClick={generateNewReflection}
                      loading={isLoadingReflection}
                    >
                      Generate Reflection
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Group>
      </Stack>
    </Container>
  );
};

export default Profile; 