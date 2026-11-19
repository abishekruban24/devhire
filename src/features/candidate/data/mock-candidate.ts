import { CandidateProfile, ApplicationPreview } from "@/types";

export const MOCK_CANDIDATE_PROFILE: CandidateProfile = {
  id: "cand-alex-chen",
  name: "Alex Chen",
  email: "alex.chen.dev@example.com",
  headline: "Full-Stack Software Engineer • Distributed Systems & React/Next.js",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
  location: "San Francisco, CA (Open to Remote)",
  skills: ["TypeScript", "Next.js", "React 19", "Node.js", "PostgreSQL", "Docker", "Go", "Tailwind CSS"],
  bio: "Full-stack engineer with 4+ years architecting web applications, database schemas, and microservice APIs. Focused on clean code, test-driven development, and high-performance user interfaces.",
  completedAssessments: 4,
  averageScore: 92.5,
  githubUrl: "https://github.com",
  linkedinUrl: "https://linkedin.com",
};

export const MOCK_CANDIDATE_APPLICATIONS: ApplicationPreview[] = [
  {
    id: "app-1",
    jobTitle: "Senior Full-Stack Engineer",
    companyName: "CloudScale Systems",
    location: "Remote (US)",
    appliedDate: "2026-11-15",
    status: "ASSESSMENT_INVITED",
    nextStep: "Complete 'TypeScript & Async Concurrency' within 5 days",
  },
  {
    id: "app-2",
    jobTitle: "Backend Infrastructure Architect",
    companyName: "FinFlow Technologies",
    location: "New York, NY (Hybrid)",
    appliedDate: "2026-11-10",
    status: "IN_REVIEW",
    nextStep: "Recruiter reviewing application materials",
  },
  {
    id: "app-3",
    jobTitle: "Frontend Platform Engineer",
    companyName: "Hyperion Digital",
    location: "Remote (US)",
    appliedDate: "2026-11-04",
    status: "SHORTLISTED",
    score: 96.0,
    nextStep: "Technical culture interview with Engineering Manager",
  },
];
