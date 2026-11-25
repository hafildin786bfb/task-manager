import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().trim().min(2, "Full name must be at least 2 characters"),
  role: z.enum(["admin", "manager", "employee"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
  full_name: z.string().trim().min(2, "Full name must be at least 2 characters"),
  role: z.enum(["admin", "manager", "employee"]),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const assignRelationshipSchema = z.object({
  manager_id: z.string().uuid("Please select a valid manager"),
  employee_id: z.string().uuid("Please select a valid employee"),
});

export type AssignRelationshipInput = z.infer<typeof assignRelationshipSchema>;
