
import { createClient } from '@supabase/supabase-js';

/**
 * بيانات الاتصال بمشروعك في Supabase.
 * تم جلب هذه البيانات بناءً على القيم التي زودتنا بها.
 */
// Added explicit : string type to avoid TypeScript literal type comparison errors during configuration checks
const supabaseUrl: string = 'https://srvmrtnvlduiybtjcica.supabase.co';
const supabaseAnonKey: string = 'sb_publishable_PsqXhsQbWBiJOsrddUIx6Q_VHYtI5fs';

// التحقق من صحة البيانات لضمان عدم تعطل التطبيق
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return !url.includes('your-project-id') && parsed.hostname.endsWith('supabase.co');
  } catch {
    return false;
  }
};

export const isConfigured = isValidUrl(supabaseUrl) && 
                         supabaseAnonKey !== 'your-anon-key-here' && 
                         supabaseAnonKey.startsWith('sb_publishable_');

// إنشاء عميل Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
