"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface UpdateCandidateProfileInput {
  name?: string;
  headline?: string;
  bio?: string;
  skills?: string[];
  githubUrl?: string;
  linkedinUrl?: string;
}

export interface UpdateCandidateProfileResult {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // In CLI test runner, revalidatePath throws; safe to ignore
  }
}

function isValidUrl(val: string): boolean {
  try {
    const url = new URL(val);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function updateCandidateProfile(
  input: UpdateCandidateProfileInput
): Promise<UpdateCandidateProfileResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      message: "Authentication required to update profile.",
    };
  }

  const userId = session.user.id;
  const errors: Record<string, string> = {};

  // 1. Validate name
  const name = input.name?.trim();
  if (name !== undefined) {
    if (name.length < 2) {
      errors.name = "Full name must be at least 2 characters.";
    } else if (name.length > 80) {
      errors.name = "Full name cannot exceed 80 characters.";
    }
  }

  // 2. Validate headline
  const headline = input.headline?.trim();
  if (headline !== undefined && headline.length > 120) {
    errors.headline = "Headline cannot exceed 120 characters.";
  }

  // 3. Validate bio
  const bio = input.bio?.trim();
  if (bio !== undefined && bio.length > 1000) {
    errors.bio = "Bio cannot exceed 1000 characters.";
  }

  // 4. Validate URLs
  const githubUrl = input.githubUrl?.trim();
  if (githubUrl && !isValidUrl(githubUrl)) {
    errors.githubUrl = "Please enter a valid URL (starting with https://).";
  }

  const linkedinUrl = input.linkedinUrl?.trim();
  if (linkedinUrl && !isValidUrl(linkedinUrl)) {
    errors.linkedinUrl = "Please enter a valid URL (starting with https://).";
  }

  // 5. Validate skills
  let cleanSkills: string[] | undefined = undefined;
  if (input.skills !== undefined) {
    cleanSkills = input.skills
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 30)
      .slice(0, 20); // Max 20 skills
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Please correct the errors in the profile form.",
      errors,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return {
        success: false,
        message: "User account not found.",
      };
    }

    if (user.role !== "CANDIDATE") {
      return {
        success: false,
        message: "Forbidden: Only candidates can update developer profiles.",
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(headline !== undefined && { headline }),
        ...(bio !== undefined && { bio }),
        ...(cleanSkills !== undefined && { skills: cleanSkills }),
        ...(githubUrl !== undefined && { githubUrl }),
        ...(linkedinUrl !== undefined && { linkedinUrl }),
      },
    });

    safeRevalidatePath("/candidate/dashboard");

    return {
      success: true,
      message: "Profile updated successfully!",
    };
  } catch (err) {
    console.error("[Update Candidate Profile Error]:", err);
    return {
      success: false,
      message: "Failed to update profile. Please try again.",
    };
  }
}
