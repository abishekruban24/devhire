"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export interface RegisterResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }
  return null;
}

function generateCompanySlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base || "company"}-${suffix}`;
}

/**
 * Server action for registering a Candidate.
 */
export async function registerCandidate(formData: FormData): Promise<RegisterResult> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  // Rate limiting per email target
  const limit = await rateLimit(`register:${email}`, 5, 15 * 60 * 1000);
  if (!limit.success) {
    return {
      success: false,
      message: "Too many registration attempts. Please wait 15 minutes before trying again.",
    };
  }

  const errors: Record<string, string> = {};

  if (!name || name.length < 2) {
    errors.name = "Full name must be at least 2 characters.";
  }
  if (!email || !isValidEmail(email)) {
    errors.email = "Please enter a valid email address.";
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    // Check duplicate email
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        message: "An account with this email address already exists. Please log in.",
        errors: { email: "Email is already registered" },
      };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "CANDIDATE", // Strictly hardcoded, never allow user to elevate to ADMIN
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return {
      success: true,
      message: "Account created successfully! Redirecting to login...",
      user,
    };
  } catch (error) {
    console.error("[Candidate Registration Error]:", error);
    return {
      success: false,
      message: "An unexpected error occurred while creating your account. Please try again.",
    };
  }
}

/**
 * Server action for registering a Recruiter and their Company transactionally.
 */
export async function registerRecruiter(formData: FormData): Promise<RegisterResult> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const companyName = String(formData.get("companyName") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  // Rate limiting
  const limit = await rateLimit(`register:${email}`, 5, 15 * 60 * 1000);
  if (!limit.success) {
    return {
      success: false,
      message: "Too many registration attempts. Please wait 15 minutes before trying again.",
    };
  }

  const errors: Record<string, string> = {};

  if (!name || name.length < 2) {
    errors.name = "Full name must be at least 2 characters.";
  }
  if (!email || !isValidEmail(email)) {
    errors.email = "Please enter a valid work email address.";
  }
  if (!companyName || companyName.length < 2) {
    errors.companyName = "Company name must be at least 2 characters.";
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    // Check duplicate email
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        message: "An account with this email address already exists. Please log in.",
        errors: { email: "Work email is already registered" },
      };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const slug = generateCompanySlug(companyName);

    // Transactionally create Company and Recruiter User
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "RECRUITER", // Strictly hardcoded, never allow user to elevate to ADMIN
          companyId: company.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      return { user, company };
    });

    return {
      success: true,
      message: "Recruiter console registered successfully! Redirecting to login...",
      user: result.user,
    };
  } catch (error) {
    console.error("[Recruiter Registration Error]:", error);
    return {
      success: false,
      message: "An unexpected error occurred while creating your recruiter account. Please try again.",
    };
  }
}
