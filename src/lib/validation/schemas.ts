/**
 * Strict Input Validation Schemas with Zod
 * 
 * Enforces type, length, boundary, and format safety before sending data over the network
 * or interacting with the database.
 */

import { z } from 'zod'
import { FIXED_COST_CATEGORIES } from '../spending'

// ─── Common Regex Patterns ───
const PHONE_REGEX = /^[+]?[0-9\s()-]{7,20}$/
const USERNAME_REGEX = /^[a-zA-Z0-9_\s.-]{2,40}$/

// ─── 1. Auth Schemas ───

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(72, 'Password cannot exceed 72 characters'),
})

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Please enter a valid email address')
      .max(255, 'Email cannot exceed 255 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(72, 'Password cannot exceed 72 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/\d/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the Terms of Service and Privacy Policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
})

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(72, 'Password cannot exceed 72 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/\d/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// ─── 2. Profile & Onboarding Schemas ───

export const onboardingSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(40, 'Username cannot exceed 40 characters')
    .regex(USERNAME_REGEX, 'Username contains invalid characters'),
  phone: z
    .string()
    .trim()
    .refine((val) => !val || PHONE_REGEX.test(val), {
      message: 'Please enter a valid phone number',
    })
    .optional()
    .nullable(),
})

export const profileUpdateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(40, 'Username cannot exceed 40 characters')
    .regex(USERNAME_REGEX, 'Username contains invalid characters'),
  contactNo: z
    .string()
    .trim()
    .refine((val) => !val || PHONE_REGEX.test(val), {
      message: 'Please enter a valid contact number',
    })
    .optional()
    .nullable(),
  emergencyContactNo: z
    .string()
    .trim()
    .refine((val) => !val || PHONE_REGEX.test(val), {
      message: 'Please enter a valid emergency contact number',
    })
    .optional()
    .nullable(),
  verificationDocType: z
    .enum(['none', 'nid', 'birth_certificate', 'other'])
    .optional()
    .nullable(),
  verificationDocNo: z
    .string()
    .trim()
    .max(50, 'Document number cannot exceed 50 characters')
    .optional()
    .nullable(),
})

// ─── 3. Mess Management Schemas ───

export const createMessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Mess name must be at least 3 characters')
    .max(60, 'Mess name cannot exceed 60 characters'),
  location: z
    .string()
    .trim()
    .max(120, 'Location cannot exceed 120 characters')
    .refine((val) => val.length === 0 || val.length >= 2, 'Location must be at least 2 characters')
    .optional()
    .nullable(),
})

export const updateMessDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Mess name must be at least 3 characters')
    .max(60, 'Mess name cannot exceed 60 characters'),
  location: z
    .string()
    .trim()
    .max(120, 'Location cannot exceed 120 characters')
    .optional()
    .nullable(),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional()
    .nullable(),
})

// ─── 4. Finance Schemas ───

export const expenseSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount exceeds maximum allowed limit (1,000,000)'),
  category: z.enum([
    'bazaar',
    'utilities',
    'utility',
    'maid',
    'wifi',
    'internet',
    'gas',
    'electricity',
    'water',
    'waste',
    'rent',
    'other',
  ]),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .nullable(),
})

export const fixedCostSchema = z.object({
  category: z.enum(FIXED_COST_CATEGORIES),
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount exceeds maximum allowed limit (1,000,000)'),
  label: z
    .string()
    .trim()
    .max(120, 'Label cannot exceed 120 characters')
    .optional()
    .nullable(),
})

export const depositSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount exceeds maximum allowed limit (1,000,000)'),
  depositType: z.enum(['cash', 'bkash', 'nagad', 'bank', 'other']).optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .nullable(),
})

// ─── 5. Feedback Schema ───

export const feedbackSchema = z.object({
  name: z.string().trim().max(100, 'Name cannot exceed 100 characters').optional().nullable(),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email')
    .max(255)
    .optional()
    .or(z.literal('')),
  message: z
    .string()
    .trim()
    .min(5, 'Message must be at least 5 characters')
    .max(2000, 'Message cannot exceed 2000 characters'),
})

// ─── Validation Helper ───

export type ValidationResult<T> =
  | { success: true; data: T; error?: never; errors?: never }
  | { success: false; data?: never; error: string; errors: Record<string, string> }

/**
 * Validates any object against a Zod schema and returns clean field-level errors
 */
export function validateForm<T>(schema: z.ZodSchema<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input)
  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors: Record<string, string> = {}
  let firstErrorMessage = 'Please check your form input.'

  for (const issue of result.error.issues) {
    const field = issue.path[0]?.toString() || 'general'
    if (!errors[field]) {
      errors[field] = issue.message
    }
    if (firstErrorMessage === 'Please check your form input.') {
      firstErrorMessage = issue.message
    }
  }

  return {
    success: false,
    error: firstErrorMessage,
    errors,
  }
}
