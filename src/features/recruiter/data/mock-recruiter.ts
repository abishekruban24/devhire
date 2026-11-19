import {
  RecruiterCompanyOverview,
  RecruiterJobItem,
  RecruiterCandidateApplication,
} from "@/types";

export const MOCK_RECRUITER_COMPANY: RecruiterCompanyOverview = {
  name: "DevScale Technologies",
  slug: "devscale",
  logo: "https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=256&q=80",
  industry: "Enterprise Developer Tools & Cloud Infrastructure",
  location: "San Francisco, CA & Remote",
  openRolesCount: 5,
  totalApplicants: 48,
  assessmentsConducted: 34,
  shortlistRate: 29.4,
};

export const MOCK_RECRUITER_JOBS: RecruiterJobItem[] = [
  {
    id: "rec-job-1",
    title: "Senior Full-Stack Engineer",
    department: "Core Product Engineering",
    locationType: "REMOTE",
    type: "FULL_TIME",
    applicantsCount: 22,
    status: "PUBLISHED",
    publishedDate: "2026-11-12",
    activeAssessments: 14,
  },
  {
    id: "rec-job-2",
    title: "Backend Infrastructure Lead",
    department: "Platform Infrastructure",
    locationType: "HYBRID",
    type: "FULL_TIME",
    applicantsCount: 16,
    status: "PUBLISHED",
    publishedDate: "2026-11-15",
    activeAssessments: 11,
  },
  {
    id: "rec-job-3",
    title: "Staff Developer Advocate",
    department: "Developer Relations",
    locationType: "REMOTE",
    type: "FULL_TIME",
    applicantsCount: 10,
    status: "PUBLISHED",
    publishedDate: "2026-11-18",
    activeAssessments: 5,
  },
];

export const MOCK_RECRUITER_APPLICATIONS: RecruiterCandidateApplication[] = [
  {
    id: "cand-app-1",
    candidateName: "Alex Chen",
    candidateAvatar: "AC",
    roleApplied: "Senior Full-Stack Engineer",
    appliedDate: "2026-11-15",
    status: "ASSESSMENT_COMPLETED",
    matchScore: 94,
    assessmentScore: 92.5,
    skills: ["TypeScript", "Next.js", "PostgreSQL", "Docker"],
  },
  {
    id: "cand-app-2",
    candidateName: "Elena Rostova",
    candidateAvatar: "ER",
    roleApplied: "Backend Infrastructure Lead",
    appliedDate: "2026-11-16",
    status: "SHORTLISTED",
    matchScore: 97,
    assessmentScore: 96.0,
    skills: ["Go", "Kubernetes", "gRPC", "PostgreSQL"],
  },
  {
    id: "cand-app-3",
    candidateName: "Marcus Vance",
    candidateAvatar: "MV",
    roleApplied: "Senior Full-Stack Engineer",
    appliedDate: "2026-11-17",
    status: "IN_REVIEW",
    matchScore: 88,
    assessmentScore: 84.0,
    skills: ["React", "Node.js", "Redis", "TypeScript"],
  },
  {
    id: "cand-app-4",
    candidateName: "Devon Miller",
    candidateAvatar: "DM",
    roleApplied: "Staff Developer Advocate",
    appliedDate: "2026-11-18",
    status: "SUBMITTED",
    matchScore: 82,
    skills: ["Technical Writing", "Go", "Python", "Community"],
  },
];

export const MOCK_ASSESSMENT_METRICS = {
  totalAssessmentsCreated: 8,
  activeCandidatesEvaluating: 19,
  averagePassingScore: 78.4,
  completionRate: 85.2,
  topicsTested: [
    { name: "TypeScript / Node Concurrency", count: 18, passRate: "72%" },
    { name: "PostgreSQL Indexing & Optimization", count: 14, passRate: "64%" },
    { name: "Distributed Systems & Rate Limiting", count: 11, passRate: "58%" },
    { name: "React 19 Hooks & State Virtualization", count: 9, passRate: "89%" },
  ],
};
