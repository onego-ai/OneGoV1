import { z } from 'zod';

// User input validation schemas
export const userProfileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  company_name: z.string().max(100, 'Company name too long').trim().optional(),
  company_website: z.string().url('Invalid URL format').optional().or(z.literal('')),
  company_logo: z.string().url('Invalid logo URL').optional().or(z.literal('')),
});

// Course creation validation
export const courseCreationSchema = z.object({
  course_title: z.string().min(1, 'Course title is required').max(200, 'Title too long').trim(),
  track_type: z.enum(['Corporate', 'Educational']),
  course_plan: z.object({
    goal: z.string().min(1, 'Goal is required').max(500, 'Goal too long').trim(),
    modules: z.array(z.object({
      title: z.string().min(1, 'Module title required').max(200, 'Title too long').trim(),
      content: z.string().min(1, 'Module content required').max(5000, 'Content too long').trim(),
    })).min(1, 'At least one module required').max(20, 'Too many modules'),
  }),
  system_prompt: z.string().min(1, 'System prompt required').max(2000, 'Prompt too long').trim(),
});

// Feedback validation
export const feedbackSchema = z.object({
  monthly_response: z.string().max(2000, 'Response too long').trim().optional(),
  open_feedback: z.string().max(2000, 'Feedback too long').trim().optional(),
  usefulness_rating: z.number().min(1).max(5).optional(),
  challenge_rating: z.number().min(1).max(5).optional(),
  suggestions: z.string().max(1000, 'Suggestions too long').trim().optional(),
});

// Invitation validation
export const invitationSchema = z.object({
  invitee_email: z.string().email('Invalid email format').max(254, 'Email too long').trim(),
  role: z.enum(['Admin', 'Standard']),
});

// Team management validation
export const teamSchema = z.object({
  team_name: z.string()
    .min(1, 'Team name is required')
    .max(50, 'Team name too long')
    .trim()
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Team name contains invalid characters'),
});

// Session feedback validation
export const sessionFeedbackSchema = z.object({
  progress_percentage: z.number().min(0).max(100),
  session_duration_minutes: z.number().min(0).max(600), // Max 10 hours
  total_interactions: z.number().min(0).max(1000),
  usefulness_rating: z.number().min(1).max(5).optional(),
  challenge_rating: z.number().min(1).max(5).optional(),
  suggestions: z.string().max(1000, 'Suggestions too long').trim().optional(),
  ai_feedback: z.string().max(2000, 'Feedback too long').trim().optional(),
});

// Website data validation
export const websiteDataSchema = z.object({
  website_url: z.string().url('Invalid URL format').max(500, 'URL too long'),
  scraped_content: z.object({
    title: z.string().max(200, 'Title too long').optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    mainContent: z.string().max(10000, 'Content too long').optional(),
    businessKeywords: z.array(z.string().max(50)).max(20).optional(),
    companyTerms: z.array(z.string().max(50)).max(20).optional(),
    navigationItems: z.array(z.string().max(100)).max(50).optional(),
    wordCount: z.number().min(0).max(100000).optional(),
  }),
});

// Chat message validation for tutoring sessions
export const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long')
    .trim()
    // Prevent potential XSS and injection attacks
    .refine(val => !val.includes('<script'), 'Invalid content detected')
    .refine(val => !val.includes('javascript:'), 'Invalid content detected')
    .refine(val => !val.includes('data:text/html'), 'Invalid content detected'),
  course_id: z.string().uuid('Invalid course ID'),
  chat_history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(5000, 'Message content too long'),
  })).max(100, 'Chat history too long'),
});

// HonestBox validation
export const honestBoxSchema = z.object({
  monthly_question: z.string().max(500, 'Question too long').trim().optional(),
  monthly_response: z.string().max(2000, 'Response too long').trim().optional(),
  open_feedback: z.string().max(2000, 'Feedback too long').trim().optional(),
  month_year: z.string().regex(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/, 'Invalid month/year format'),
});

// Content sanitization function
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:text\/html/gi, '') // Remove data: HTML
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

// Rate limiting validation
export const rateLimitSchema = z.object({
  action: z.string().max(50, 'Action name too long'),
  timestamp: z.number().min(0),
  user_id: z.string().uuid('Invalid user ID'),
});

// File upload validation
export const fileUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Filename required')
    .max(255, 'Filename too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename characters'),
  size: z.number().min(1).max(10 * 1024 * 1024), // Max 10MB
  type: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
});

// Validation helper function
export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { success: false, error: firstError.message };
    }
    return { success: false, error: 'Validation failed' };
  }
};

// XSS Protection utility
export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// SQL Injection protection (additional layer)
export const containsSqlInjection = (input: string): boolean => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|\/\*|\*\/|;|'|")/,
    /(\bOR\b|\bAND\b).*?=.*?=|\bOR\b.*?1\s*=\s*1/i,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};