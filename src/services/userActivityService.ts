import { supabase } from '../lib/supabaseClient.ts';
import { UserActivity, UserReflection } from '../types/user.ts';
import { llmService } from './llmService.ts';

export const userActivityService = {
  async trackActivity(activity: Omit<UserActivity, 'id' | 'timestamp'>) {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .insert([{
          ...activity,
          timestamp: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error tracking activity:', error);
      throw error;
    }
  },

  async getUserActivities(userId: string, limit = 100): Promise<UserActivity[]> {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user activities:', error);
      throw error;
    }
  },

  async generateReflection(userId: string): Promise<UserReflection> {
    try {
      // Get user's recent activities
      const activities = await this.getUserActivities(userId, 50);
      
      // Format activities for LLM analysis
      const activitySummary = activities.map((activity: UserActivity) => ({
        type: activity.type,
        subject: activity.metadata.subject,
        timestamp: activity.timestamp,
        success: activity.metadata.isCorrect,
        score: activity.metadata.score
      }));

      // Generate reflection using LLM
      const result = await llmService.generateReflection({
        activities: activitySummary,
        prompt: "Analyze the user's learning activities and generate a reflection"
      });

      if (result.error) throw new Error(result.error);

      const reflection: Omit<UserReflection, 'id'> = {
        userId,
        ...JSON.parse(result.content),
        timestamp: new Date()
      };

      // Save reflection to database
      const { data, error } = await supabase
        .from('user_reflections')
        .insert([reflection])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating reflection:', error);
      throw error;
    }
  },

  async getLatestReflection(userId: string): Promise<UserReflection | null> {
    try {
      const { data, error } = await supabase
        .from('user_reflections')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      return data || null;
    } catch (error) {
      console.error('Error fetching reflection:', error);
      throw error;
    }
  }
}; 