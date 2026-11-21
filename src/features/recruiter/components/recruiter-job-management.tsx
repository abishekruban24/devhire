"use client";

import React, { useState, useTransition } from "react";
import {
  Plus,
  Users,
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Edit3,
  CheckCircle2,
  XCircle,
  Archive,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  FileText,
  Sparkles,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  type JobInputData,
} from "@/features/jobs/actions/job-actions";
import type { JobLocationType, JobType, JobStatus } from "@prisma/client";
import { MOCK_RECRUITER_JOBS } from "@/features/recruiter/data/mock-recruiter";

export interface DatabaseJobItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  requirements: string;
  location: string;
  locationType: JobLocationType;
  type: JobType;
  status: JobStatus;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  experienceLevel?: string | null;
  companyId: string;
  recruiterId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    applications: number;
  };
}

interface RecruiterJobManagementProps {
  initialJobs: DatabaseJobItem[];
  companyName: string;
}

export function RecruiterJobManagement({
  initialJobs,
  companyName,
}: RecruiterJobManagementProps) {
  const [jobs, setJobs] = useState<DatabaseJobItem[]>(initialJobs);
  const [activeTab, setActiveTab] = useState<"ALL" | JobStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Notification banners
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<DatabaseJobItem | null>(null);

  // Form state
  const [formData, setFormData] = useState<JobInputData>({
    title: "",
    description: "",
    requirements: "",
    location: "Remote / Flexible",
    locationType: "REMOTE",
    type: "FULL_TIME",
    status: "PUBLISHED",
    salaryMin: 120000,
    salaryMax: 160000,
    currency: "USD",
    experienceLevel: "Senior (5+ yrs)",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Show demo jobs toggle when zero real jobs exist
  const [showDemoPreview, setShowDemoPreview] = useState(false);

  // Open modal for new job
  const handleOpenCreateModal = () => {
    setEditingJob(null);
    setFormData({
      title: "",
      description: "",
      requirements: "",
      location: "San Francisco, CA or Remote",
      locationType: "REMOTE",
      type: "FULL_TIME",
      status: "PUBLISHED",
      salaryMin: 125000,
      salaryMax: 175000,
      currency: "USD",
      experienceLevel: "Senior (5+ yrs)",
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Open modal for editing job
  const handleOpenEditModal = (job: DatabaseJobItem) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      location: job.location,
      locationType: job.locationType,
      type: job.type,
      status: job.status,
      salaryMin: job.salaryMin ?? null,
      salaryMax: job.salaryMax ?? null,
      currency: job.currency || "USD",
      experienceLevel: job.experienceLevel || "Senior",
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Form submit handler
  const handleSaveJob = (targetStatus?: JobStatus) => {
    setFormErrors({});
    setFeedback(null);

    const payload: JobInputData = {
      ...formData,
      status: targetStatus || formData.status || "PUBLISHED",
    };

    startTransition(async () => {
      if (editingJob) {
        // Update existing job
        const res = await updateJob(editingJob.id, payload);
        if (!res.success) {
          if (res.errors) setFormErrors(res.errors);
          setFeedback({ type: "error", message: res.message || "Failed to update job." });
        } else if (res.job) {
          const updatedRecord = res.job as unknown as DatabaseJobItem;
          setJobs((prev) =>
            prev.map((j) => (j.id === editingJob.id ? { ...j, ...updatedRecord } : j))
          );
          setFeedback({ type: "success", message: res.message || "Job updated successfully!" });
          setModalOpen(false);
        }
      } else {
        // Create new job
        const res = await createJob(payload);
        if (!res.success) {
          if (res.errors) setFormErrors(res.errors);
          setFeedback({ type: "error", message: res.message || "Failed to create job." });
        } else if (res.job) {
          const newRecord = res.job as unknown as DatabaseJobItem;
          setJobs((prev) => [newRecord, ...prev]);
          setFeedback({ type: "success", message: res.message || "Job created successfully!" });
          setModalOpen(false);
        }
      }
    });
  };

  // Quick status change
  const handleStatusChange = (jobId: string, newStatus: JobStatus) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateJobStatus(jobId, newStatus);
      if (!res.success) {
        setFeedback({ type: "error", message: res.message || "Failed to change job status." });
      } else {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j))
        );
        setFeedback({ type: "success", message: res.message || "Status updated." });
      }
    });
  };

  // Delete job
  const handleDeleteJob = (jobId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the job opening "${title}"?`)) {
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteJob(jobId);
      if (!res.success) {
        setFeedback({ type: "error", message: res.message || "Failed to delete job." });
      } else {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        setFeedback({ type: "success", message: res.message || "Job deleted." });
      }
    });
  };

  // Counts
  const publishedCount = jobs.filter((j) => j.status === "PUBLISHED").length;
  const draftCount = jobs.filter((j) => j.status === "DRAFT").length;
  const closedCount = jobs.filter((j) => j.status === "CLOSED").length;
  const archivedCount = jobs.filter((j) => j.status === "ARCHIVED").length;

  // Filtered jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesTab = activeTab === "ALL" || job.status === activeTab;
    const matchesSearch =
      searchQuery.trim() === "" ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.experienceLevel && job.experienceLevel.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case "PUBLISHED":
        return <Badge variant="success">Published</Badge>;
      case "DRAFT":
        return <Badge variant="warning">Draft</Badge>;
      case "CLOSED":
        return <Badge variant="secondary">Closed</Badge>;
      case "ARCHIVED":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLocationTypeBadge = (type: JobLocationType) => {
    switch (type) {
      case "REMOTE":
        return <Badge variant="default">Remote</Badge>;
      case "HYBRID":
        return <Badge variant="violet">Hybrid</Badge>;
      case "ON_SITE":
        return <Badge variant="secondary">On-Site</Badge>;
    }
  };

  const formatSalary = (min?: number | null, max?: number | null, currency = "USD") => {
    if (!min && !max) return "Compensation Competitive";
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
    if (min) return `From ${formatter.format(min)}`;
    if (max) return `Up to ${formatter.format(max)}`;
    return "Competitive";
  };

  const formatDate = (date: Date | string) => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="space-y-4" id="jobs">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Job Postings & Openings
            </h2>
            {jobs.length > 0 ? (
              <Badge variant="success" className="font-mono text-[10px]">
                {publishedCount} Active Live
              </Badge>
            ) : (
              <Badge variant="mock">Database Ready</Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Create, publish, and manage hiring positions for {companyName}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {jobs.length === 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDemoPreview(!showDemoPreview)}
              className="text-xs gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>{showDemoPreview ? "Hide Sample Roles" : "Preview Sample Roles"}</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="accent"
            onClick={handleOpenCreateModal}
            className="text-xs gap-1.5 shadow-md shadow-violet-950/30"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Position</span>
          </Button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 animate-in fade-in ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0A0F1D]/80 p-2 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "ALL"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            All Roles ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab("PUBLISHED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "PUBLISHED"
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            Published ({publishedCount})
          </button>
          <button
            onClick={() => setActiveTab("DRAFT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "DRAFT"
                ? "bg-amber-600/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            Drafts ({draftCount})
          </button>
          <button
            onClick={() => setActiveTab("CLOSED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "CLOSED"
                ? "bg-slate-700/40 text-slate-200 border border-slate-600/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            Closed ({closedCount})
          </button>
          <button
            onClick={() => setActiveTab("ARCHIVED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "ARCHIVED"
                ? "bg-violet-900/30 text-violet-300 border border-violet-700/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            Archived ({archivedCount})
          </button>
        </div>

        <div className="relative min-w-[200px] sm:max-w-[240px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles or locations..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/70 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Main Jobs Listing */}
      {filteredJobs.length > 0 ? (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <Card
              key={job.id}
              className="p-5 border-slate-800 hover:border-slate-700/90 bg-[#0E1526] transition-all group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(job.status)}
                    {getLocationTypeBadge(job.locationType)}
                    <Badge variant="secondary">
                      {job.type.replace("_", " ")}
                    </Badge>
                    {job.experienceLevel && (
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
                        {job.experienceLevel}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                    {job.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      {job.location}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                      {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5 text-blue-300 font-medium">
                      <Users className="h-3.5 w-3.5 text-blue-400" />
                      {job._count?.applications ?? 0} Applicant(s)
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="h-3 w-3" />
                      {formatDate(job.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/60 w-full lg:w-auto">
                  {/* Edit button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditModal(job)}
                    disabled={isPending}
                    className="text-xs gap-1.5 hover:text-white"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>

                  {/* Status transitions */}
                  {job.status === "DRAFT" && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStatusChange(job.id, "PUBLISHED")}
                      disabled={isPending}
                      className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Publish</span>
                    </Button>
                  )}

                  {job.status === "PUBLISHED" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStatusChange(job.id, "CLOSED")}
                      disabled={isPending}
                      className="text-xs gap-1.5"
                    >
                      <XCircle className="h-3.5 w-3.5 text-amber-400" />
                      <span>Close</span>
                    </Button>
                  )}

                  {job.status === "CLOSED" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange(job.id, "PUBLISHED")}
                        disabled={isPending}
                        className="text-xs gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Re-open</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(job.id, "ARCHIVED")}
                        disabled={isPending}
                        className="text-xs gap-1.5"
                      >
                        <Archive className="h-3.5 w-3.5 text-slate-400" />
                        <span>Archive</span>
                      </Button>
                    </>
                  )}

                  {job.status === "ARCHIVED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(job.id, "DRAFT")}
                      disabled={isPending}
                      className="text-xs gap-1.5"
                    >
                      <Briefcase className="h-3.5 w-3.5 text-violet-400" />
                      <span>Restore Draft</span>
                    </Button>
                  )}

                  {/* Delete button (if 0 applications) */}
                  {(job._count?.applications ?? 0) === 0 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteJob(job.id, job.title)}
                      disabled={isPending}
                      title="Delete Job"
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800/80 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="p-8 border-dashed border-slate-800 bg-[#0A0F1D]/50 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/10 text-violet-400 border border-violet-500/20">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">
              {jobs.length === 0
                ? "No job openings created yet"
                : `No ${activeTab.toLowerCase()} jobs match your search`}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {jobs.length === 0
                ? `Publish your first technical vacancy for ${companyName} to begin receiving applications and evaluating candidates.`
                : "Try clearing your search query or selecting a different status filter tab above."}
            </p>
          </div>
          {jobs.length === 0 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="accent"
                size="sm"
                onClick={handleOpenCreateModal}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Opening</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDemoPreview(true)}
                className="gap-2 text-slate-300"
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>Show Sample Roles</span>
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Optional Sample Preview Drawer when zero real jobs exist */}
      {showDemoPreview && jobs.length === 0 && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">
                Sample Platform Roles Preview (Demo Reference)
              </span>
            </div>
            <button
              onClick={() => setShowDemoPreview(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Here is what active postings look like when published in your pipeline:
          </p>
          <div className="space-y-2">
            {MOCK_RECRUITER_JOBS.map((mock) => (
              <div
                key={mock.id}
                className="p-3 rounded-lg border border-slate-800 bg-[#0E1526]/80 flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-white">{mock.title}</div>
                  <div className="text-slate-400 flex items-center gap-2 text-[11px]">
                    <span>{mock.department}</span>
                    <span>•</span>
                    <span>{mock.locationType}</span>
                    <span>•</span>
                    <span className="text-blue-400">{mock.applicantsCount} Applicants</span>
                  </div>
                </div>
                <Badge variant="mock">Demo Role</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE / EDIT JOB MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="max-w-2xl w-full bg-[#0E1526] border border-slate-800 shadow-2xl rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0A0F1D]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingJob ? "Edit Technical Opening" : "Create Technical Job Opening"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingJob
                      ? `Updating position requirements for ${editingJob.title}`
                      : `Publish a new opening under ${companyName}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveJob();
              }}
              className="flex-1 overflow-y-auto p-5 space-y-4"
            >
              {/* Job Title */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                  Job Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Senior Full-Stack Engineer, Staff Distributed Systems Lead"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                {formErrors.title && (
                  <p className="text-[11px] text-rose-400">{formErrors.title}</p>
                )}
              </div>

              {/* Grid: Type & Location Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Employment Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as JobType })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Workplace Arrangement
                  </label>
                  <select
                    value={formData.locationType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        locationType: e.target.value as JobLocationType,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="REMOTE">Remote (Work from Anywhere)</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ON_SITE">On-Site (In Office)</option>
                  </select>
                </div>
              </div>

              {/* Grid: Location & Experience Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Location / Office Base <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. San Francisco, CA or Worldwide"
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  {formErrors.location && (
                    <p className="text-[11px] text-rose-400">{formErrors.location}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Target Experience Level
                  </label>
                  <input
                    type="text"
                    value={formData.experienceLevel || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, experienceLevel: e.target.value })
                    }
                    placeholder="e.g. Senior (5-8 yrs), Staff, Lead, Entry"
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Salary Range */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                  Annual Compensation Range (Optional)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={formData.salaryMin ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salaryMin: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Min (e.g. 130000)"
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={formData.salaryMax ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salaryMax: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Max (e.g. 180000)"
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
                {formErrors.salaryMax && (
                  <p className="text-[11px] text-rose-400">{formErrors.salaryMax}</p>
                )}
              </div>

              {/* Job Description */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                  Role Overview & Responsibilities <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Outline key mission, day-to-day responsibilities, and team structure..."
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed"
                />
                {formErrors.description && (
                  <p className="text-[11px] text-rose-400">{formErrors.description}</p>
                )}
              </div>

              {/* Requirements & Skills */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                  Technical Requirements & Qualifications <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.requirements}
                  onChange={(e) =>
                    setFormData({ ...formData, requirements: e.target.value })
                  }
                  placeholder="List essential languages, distributed systems experience, testing, and CS principles..."
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed"
                />
                {formErrors.requirements && (
                  <p className="text-[11px] text-rose-400">{formErrors.requirements}</p>
                )}
              </div>

              {/* If editing, allow status selection */}
              {editingJob && (
                <div className="space-y-1 pt-1 border-t border-slate-800">
                  <label className="block text-xs font-medium text-slate-300">
                    Position Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as JobStatus })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="PUBLISHED">Published (Open to Applicants)</option>
                    <option value="DRAFT">Draft (Internal Only)</option>
                    <option value="CLOSED">Closed (Reviewing Pipeline)</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#0A0F1D] flex items-center justify-between gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {editingJob ? (
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleSaveJob()}
                    className="gap-2"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleSaveJob("DRAFT")}
                      className="gap-1.5"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-amber-400" />
                      )}
                      <span>Save Draft</span>
                    </Button>

                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleSaveJob("PUBLISHED")}
                      className="gap-1.5 shadow-md shadow-violet-950/40"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>Publish Opening</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
