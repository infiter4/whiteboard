import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  user_color: string;
  preferences: {
    theme: 'light' | 'dark';
    defaultTool: string;
  };
  created_at: string;
  updated_at: string;
};

export type Whiteboard = {
  id: string;
  owner_id: string;
  name: string;
  canvas_data: any;
  thumbnail_url: string | null;
  access_level: 'public' | 'private' | 'shared';
  folder_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  user_id: string;
  title: string;
  canvas_data: any;
  thumbnail_url: string | null;
  summary_text: string | null;
  is_archived: boolean;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Folder = {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Tag = {
  id: string;
  name: string;
  usage_count: number;
  created_at: string;
};
