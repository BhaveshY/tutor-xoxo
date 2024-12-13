import { Container, TextInput, MultiSelect, Button, Stack, Title } from '@mantine/core';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import useStore from '../store/useStore.ts';
import React from 'react';

const Profile = () => {
  const { user, setUser } = useStore();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    interests: user?.interests || [],
    education: user?.education || '',
  });

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

  return (
    <Container size="sm">
      <Stack gap="lg">
        <Title order={2}>Profile Settings</Title>
        
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
    </Container>
  );
};

export default Profile; 