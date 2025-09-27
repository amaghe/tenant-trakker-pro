import { z } from 'zod';

// Phone number validation schema
export const phoneNumberSchema = z.string()
  .trim()
  .min(1, "Phone number is required")
  .regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number with country code");

// Email validation schema
export const emailSchema = z.string()
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(255, "Email must be less than 255 characters");

// Name validation schema
export const nameSchema = z.string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters")
  .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes");

// Address validation schema
export const addressSchema = z.string()
  .trim()
  .min(1, "Address is required")
  .max(255, "Address must be less than 255 characters");

// Amount validation schema
export const amountSchema = z.number()
  .positive("Amount must be positive")
  .max(1000000000, "Amount is too large")
  .multipleOf(0.01, "Amount can have at most 2 decimal places");

// Tenant form validation schema
export const tenantFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneNumberSchema,
  rent: amountSchema,
  lease_start: z.string().min(1, "Lease start date is required"),
  lease_end: z.string().min(1, "Lease end date is required"),
  property_id: z.string().uuid("Please select a valid property"),
  status: z.enum(['active', 'inactive']),
});

// Property form validation schema
export const propertyFormSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Property name is required")
    .max(100, "Property name must be less than 100 characters"),
  address: addressSchema,
  type: z.enum(['apartment', 'house', 'condo', 'townhouse', 'studio']),
  bedrooms: z.number()
    .int("Bedrooms must be a whole number")
    .min(0, "Bedrooms cannot be negative")
    .max(20, "Too many bedrooms"),
  bathrooms: z.number()
    .int("Bathrooms must be a whole number")
    .min(0, "Bathrooms cannot be negative")
    .max(20, "Too many bathrooms"),
  size: z.number()
    .int("Size must be a whole number")
    .min(1, "Size must be at least 1 square foot")
    .max(100000, "Size is too large"),
  rent: amountSchema,
  status: z.enum(['available', 'occupied', 'maintenance', 'inactive']),
});

// Payment form validation schema
export const paymentFormSchema = z.object({
  tenant_id: z.string().uuid("Please select a valid tenant"),
  property_id: z.string().uuid("Please select a valid property"),
  amount: amountSchema,
  due_date: z.string().min(1, "Due date is required"),
  payment_method: z.enum(['mtn_momo', 'bank_transfer', 'cash', 'check']),
  status: z.enum(['pending', 'paid', 'failed', 'cancelled']),
});

// Quick payment request validation schema
export const quickPaymentSchema = z.object({
  phoneNumber: phoneNumberSchema,
  amount: amountSchema,
  tenantName: nameSchema.optional(),
  paymentId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
});

// Types derived from schemas
export type TenantFormData = z.infer<typeof tenantFormSchema>;
export type PropertyFormData = z.infer<typeof propertyFormSchema>;
export type PaymentFormData = z.infer<typeof paymentFormSchema>;
export type QuickPaymentData = z.infer<typeof quickPaymentSchema>;