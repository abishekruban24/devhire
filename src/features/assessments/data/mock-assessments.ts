import { AssessmentPreview } from "@/types";

export const MOCK_ASSESSMENTS: AssessmentPreview[] = [
  {
    id: "assess-1",
    title: "TypeScript & Async Concurrency Suite",
    companyName: "CloudScale Systems",
    durationMinutes: 60,
    questionsCount: 3,
    difficulty: "MEDIUM",
    status: "IN_PROGRESS",
    dueDate: "2026-11-24",
    passingScore: 75.0,
  },
  {
    id: "assess-2",
    title: "Distributed Rate Limiter & Data Streams",
    companyName: "FinFlow Technologies",
    durationMinutes: 90,
    questionsCount: 4,
    difficulty: "HARD",
    status: "NOT_STARTED",
    dueDate: "2026-11-26",
    passingScore: 80.0,
  },
  {
    id: "assess-3",
    title: "SQL Query Optimization & Index Benchmarks",
    companyName: "Nexora Labs",
    durationMinutes: 45,
    questionsCount: 3,
    difficulty: "MEDIUM",
    status: "EVALUATED",
    dueDate: "2026-11-12",
    passingScore: 70.0,
    score: 94.0,
  },
];
