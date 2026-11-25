"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface UpdateCompanyProfileInput {
  name?: string;
  website?: string;
  description?: string;
  industry?: string;
  location?: string;
}

export interface UpdateCompanyProfileResult {
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

export async function updateCompanyProfile(
  input: UpdateCompanyProfileInput
): Promise<UpdateCompanyProfileResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      message: "Authentication required to update company profile.",
    };
  }

  const userId = session.user.id;
  const errors: Record<string, string> = {};

  const name = input.name?.trim();
  if (name !== undefined) {
    if (name.length < 2) {
      errors.name = "Company name must be at least 2 characters.";
    } else if (name.length > 100) {
      errors.name = "Company name cannot exceed 100 characters.";
    }
  }

  const website = input.website?.trim();
  if (website && !isValidUrl(website)) {
    errors.website = "Please enter a valid URL (starting with https://).";
  }

  const description = input.description?.trim();
  if (description !== undefined && description.length > 1500) {
    errors.description = "Company description cannot exceed 1500 characters.";
  }

  const industry = input.industry?.trim();
  if (industry !== undefined && industry.length > 80) {
    errors.industry = "Industry cannot exceed 80 characters.";
  }

  const location = input.location?.trim();
  if (location !== undefined && location.length > 100) {
    errors.location = "Location cannot exceed 100 characters.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Please correct the errors in the company profile form.",
      errors,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, companyId: true },
    });

    if (!user) {
      return {
        success: false,
        message: "User account not found.",
      };
    }

    if (user.role !== "RECRUITER" || !user.companyId) {
      return {
        success: false,
        message: "Forbidden: Only authorized company recruiters can update company profiles.",
      };
    }

    await prisma.company.update({
      where: { id: user.companyId },
      data: {
        ...(name !== undefined && { name }),
        ...(website !== undefined && { website }),
        ...(description !== undefined && { description }),
        ...(industry !== undefined && { industry }),
        ...(location !== undefined && { location }),
      },
    });

    safeRevalidatePath("/recruiter/dashboard");

    return {
      success: true,
      message: "Company profile updated successfully!",
    };
  } catch (err) {
    console.error("[Update Company Profile Error]:", err);
    return {
      success: false,
      message: "Failed to update company profile. Please try again.",
    };
  }
}
