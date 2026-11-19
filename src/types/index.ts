export type UserRole = "CANDIDATE" | "RECRUITER" | "ADMIN";

export type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";
export type JobLocationType = "REMOTE" | "HYBRID" | "ON_SITE";
export type JobStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

export type ApplicationStatus =
  | "SUBMITTED"
  | "IN_REVIEW"
  | "ASSESSMENT_INVITED"
  | "ASSESSMENT_COMPLETED"
  | "SHORTLISTED"
  | "REJECTED"
  | "OFFERED";

export type QuestionDifficulty = "EASY" | "MEDIUM" | "HARD";
export type AssessmentStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type AttemptStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EVALUATED" | "EXPIRED";

export interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  headline: string;
  avatarUrl: string;
  location: string;
  skills: string[];
  bio: string;
  completedAssessments: number;
  averageScore: number;
  githubUrl?: string;
  linkedinUrl?: string;
}

export interface JobListing {
  id: string;
  title: string;
  companyName: string;
  companyLogo?: string;
  location: string;
  locationType: JobLocationType;
  type: JobType;
  status: JobStatus;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  experienceLevel: string;
  skills: string[];
  postedAt: string;
  assessmentTitle?: string;
}

export interface AssessmentPreview {
  id: string;
  title: string;
  companyName: string;
  durationMinutes: number;
  questionsCount: number;
  difficulty: QuestionDifficulty;
  status: AttemptStatus;
  dueDate: string;
  passingScore: number;
  score?: number;
}

export interface ApplicationPreview {
  id: string;
  jobTitle: string;
  companyName: string;
  location: string;
  appliedDate: string;
  status: ApplicationStatus;
  nextStep?: string;
  score?: number;
}

export interface RecruiterCompanyOverview {
  name: string;
  slug: string;
  logo: string;
  industry: string;
  location: string;
  openRolesCount: number;
  totalApplicants: number;
  assessmentsConducted: number;
  shortlistRate: number;
}

export interface RecruiterJobItem {
  id: string;
  title: string;
  department: string;
  locationType: JobLocationType;
  type: JobType;
  applicantsCount: number;
  status: JobStatus;
  publishedDate: string;
  activeAssessments: number;
}

export interface RecruiterCandidateApplication {
  id: string;
  candidateName: string;
  candidateAvatar: string;
  roleApplied: string;
  appliedDate: string;
  status: ApplicationStatus;
  matchScore: number;
  assessmentScore?: number;
  skills: string[];
}
