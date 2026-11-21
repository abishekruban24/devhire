"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Mail,
  ExternalLink,
  Briefcase,
  Clock,
  AlertCircle,
  Loader2,
  X,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RecruiterApplicantItem } from "@/features/applications/actions/application-actions";
import { updateApplicationStatus } from "@/features/applications/actions/application-actions";
import type { ApplicationStatus } from "@prisma/client";
import { formatDate } from "@/lib/utils";

interface RecruiterApplicantManagementProps {
  initialApplications: RecruiterApplicantItem[];
  companyJobs: { id: string; title: string }[];
}

const STATUS_OPTIONS: { label: string; value: "ALL" | ApplicationStatus }[] = [
  { label: "All Statuses", value: "ALL" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Under Review", value: "IN_REVIEW" },
  { label: "Assessment Invited", value: "ASSESSMENT_INVITED" },
  { label: "Assessment Completed", value: "ASSESSMENT_COMPLETED" },
  { label: "Shortlisted", value: "SHORTLISTED" },
  { label: "Offer Extended", value: "OFFERED" },
  { label: "Not Selected", value: "REJECTED" },
];

export function RecruiterApplicantManagement({
  initialApplications,
  companyJobs,
}: RecruiterApplicantManagementProps) {
  const [applications, setApplications] = useState<RecruiterApplicantItem[]>(initialApplications);
  const [selectedJobId, setSelectedJobId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | ApplicationStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [selectedApplicant, setSelectedApplicant] = useState<RecruiterApplicantItem | null>(null);
  const [modalStatus, setModalStatus] = useState<ApplicationStatus>("SUBMITTED");
  const [modalNotes, setModalNotes] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleOpenModal = (app: RecruiterApplicantItem) => {
    setSelectedApplicant(app);
    setModalStatus(app.status);
    setModalNotes(app.notes || "");
    setFeedback(null);
  };

  const handleCloseModal = () => {
    setSelectedApplicant(null);
    setFeedback(null);
  };

  // Quick Status Transition (e.g. from table Shortlist/Reject button)
  const handleQuickStatusChange = (appId: string, newStatus: ApplicationStatus) => {
    startTransition(async () => {
      const res = await updateApplicationStatus(appId, newStatus);
      if (res.success) {
        setApplications((prev) =>
          prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
        );
        setFeedback({
          type: "success",
          message: res.message,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.message,
        });
      }
    });
  };

  // Modal Status Update (with optional notes)
  const handleModalStatusSubmit = () => {
    if (!selectedApplicant) return;
    startTransition(async () => {
      const res = await updateApplicationStatus(
        selectedApplicant.id,
        modalStatus,
        modalNotes.trim() || undefined
      );

      if (res.success) {
        setApplications((prev) =>
          prev.map((app) =>
            app.id === selectedApplicant.id
              ? { ...app, status: modalStatus, notes: modalNotes.trim() || null }
              : app
          )
        );
        setSelectedApplicant((prev) =>
          prev ? { ...prev, status: modalStatus, notes: modalNotes.trim() || null } : null
        );
        setFeedback({
          type: "success",
          message: res.message,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.message,
        });
      }
    });
  };

  // Filtered Applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // 1. Job Filter
      if (selectedJobId !== "ALL" && app.jobId !== selectedJobId) {
        return false;
      }

      // 2. Status Filter
      if (selectedStatus !== "ALL" && app.status !== selectedStatus) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = app.candidate.name.toLowerCase().includes(query);
        const matchEmail = app.candidate.email.toLowerCase().includes(query);
        const matchTitle = app.job.title.toLowerCase().includes(query);
        const matchSkills = app.candidate.skills?.some((s) => s.toLowerCase().includes(query));
        if (!matchName && !matchEmail && !matchTitle && !matchSkills) {
          return false;
        }
      }

      return true;
    });
  }, [applications, selectedJobId, selectedStatus, searchQuery]);

  const hasActiveFilters =
    selectedJobId !== "ALL" || selectedStatus !== "ALL" || searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setSelectedJobId("ALL");
    setSelectedStatus("ALL");
    setSearchQuery("");
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "SHORTLISTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Shortlisted
          </span>
        );
      case "ASSESSMENT_INVITED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
            Assessment Invited
          </span>
        );
      case "ASSESSMENT_COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-700/60">
            Assessment Completed
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60">
            Under Review
          </span>
        );
      case "OFFERED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-950/80 text-teal-300 border border-teal-700/60">
            Offer Extended
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-700/60">
            Not Selected
          </span>
        );
      case "SUBMITTED":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-700/60">
            Submitted
          </span>
        );
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4" id="candidates">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Candidate Pipeline & Shortlisting</h2>
            <Badge variant="default" className="bg-blue-600/20 text-blue-400 border-blue-500/30">
              Live Database
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real candidate submissions across your active job openings with shortlisting and review controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-slate-900 text-slate-300 border border-slate-800">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            {applications.length} {applications.length === 1 ? "Applicant" : "Applicants"}
          </span>
        </div>
      </div>

      {/* Global Feedback Alert */}
      {feedback && (
        <div
          className={`rounded-xl border p-3.5 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/40 border-rose-500/40 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search and Filter Toolbar */}
      <div className="space-y-3 rounded-xl border border-slate-800/80 bg-[#0E1526]/80 p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates by name, email, skills, or job title..."
            className="w-full h-10 pl-10 pr-9 rounded-lg border border-slate-700/60 bg-[#080C14] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Filter by:</span>
          </div>

          {/* Job Filter */}
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="h-8 px-3 rounded-md border border-slate-700/60 bg-[#080C14] text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer max-w-[220px] truncate"
          >
            <option value="ALL">All Company Jobs ({companyJobs.length})</option>
            {companyJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as "ALL" | ApplicationStatus)}
            className="h-8 px-3 rounded-md border border-slate-700/60 bg-[#080C14] text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 px-2.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 flex items-center gap-1.5"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filters
            </Button>
          )}

          <div className="ml-auto text-xs text-slate-400">
            Showing <strong className="text-slate-200">{filteredApplications.length}</strong> of{" "}
            <strong className="text-slate-200">{applications.length}</strong> applicants
          </div>
        </div>
      </div>

      {/* Empty State: Zero Applications Overall */}
      {applications.length === 0 ? (
        <Card className="border-slate-800/80 bg-[#0E1526]/50 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">No Candidate Applications Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 leading-relaxed">
            Candidates have not submitted applications to your published openings yet. Once roles are published, candidate applications will appear in this pipeline in real time.
          </p>
          <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-4 py-2 rounded-lg border border-slate-800">
            <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />
            <span>Make sure your job openings are in PUBLISHED status to accept submissions.</span>
          </div>
        </Card>
      ) : filteredApplications.length === 0 ? (
        /* Empty State: Zero Filter Results */
        <Card className="border-slate-800/80 bg-[#0E1526]/40 p-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
            <Filter className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">No Matching Candidates Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            No applicants match your current search query and filters.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs border-slate-700 bg-slate-800/80 text-slate-200"
          >
            Clear Filters
          </Button>
        </Card>
      ) : (
        /* Table of Applications */
        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-[#0A0F1D]">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800/80 bg-[#0E1526]/80 text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Target Opening</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Cover Letter</th>
                <th className="px-5 py-3.5">Applied Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredApplications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm">
                        {getInitials(app.candidate.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate max-w-[180px]">
                          {app.candidate.name}
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-[180px]">
                          {app.candidate.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-200 truncate max-w-[200px]">
                      {app.job.title}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {app.job.location} • {app.job.locationType}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {getStatusBadge(app.status)}
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-400">
                    {app.coverLetter ? (
                      <span className="inline-flex items-center gap-1 text-blue-400 font-medium">
                        <FileText className="h-3.5 w-3.5" />
                        Attached ({app.coverLetter.length} chars)
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">None</span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(app.createdAt)}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Shortlist Quick Action */}
                      {app.status !== "SHORTLISTED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleQuickStatusChange(app.id, "SHORTLISTED")}
                          className="h-8 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 font-medium"
                          title="Shortlist Candidate"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Shortlist
                        </Button>
                      )}

                      {/* Reject Quick Action */}
                      {app.status !== "REJECTED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleQuickStatusChange(app.id, "REJECTED")}
                          className="h-8 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                          title="Decline Candidate"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Decline
                        </Button>
                      )}

                      {/* Full Review Action */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenModal(app)}
                        className="h-8 px-3 text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200"
                      >
                        Review
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* APPLICANT REVIEW & STATUS UPDATE MODAL                                    */}
      {/* ========================================================================= */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-[#0B101D] text-slate-100 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800/80 bg-[#0E1526]/90 flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center font-bold text-base text-white shrink-0 shadow-md">
                  {getInitials(selectedApplicant.candidate.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-tight truncate">
                      {selectedApplicant.candidate.name}
                    </h2>
                    {getStatusBadge(selectedApplicant.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-500" />
                      {selectedApplicant.candidate.email}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                      Applied for: <strong className="text-slate-200">{selectedApplicant.job.title}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
              {/* Feedback inside modal */}
              {feedback && (
                <div
                  className={`rounded-xl border p-3.5 text-xs flex items-center gap-2 ${
                    feedback.type === "success"
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-200"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Candidate Headline / Bio */}
              {(selectedApplicant.candidate.headline || selectedApplicant.candidate.bio) && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Candidate Headline & Bio
                  </span>
                  <div className="rounded-xl border border-slate-800/80 bg-[#0E1526]/50 p-3.5 text-xs text-slate-300 leading-relaxed">
                    {selectedApplicant.candidate.headline && (
                      <p className="font-semibold text-white mb-1">
                        {selectedApplicant.candidate.headline}
                      </p>
                    )}
                    {selectedApplicant.candidate.bio && (
                      <p className="text-slate-400">{selectedApplicant.candidate.bio}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Skills List */}
              {selectedApplicant.candidate.skills && selectedApplicant.candidate.skills.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Verified Competencies & Stack
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApplicant.candidate.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-200 border border-slate-700/60"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Candidate External Links */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                {selectedApplicant.candidate.githubUrl && (
                  <a
                    href={selectedApplicant.candidate.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60 transition-colors"
                  >
                    <span>GitHub Profile</span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>
                )}
                {selectedApplicant.candidate.linkedinUrl && (
                  <a
                    href={selectedApplicant.candidate.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60 transition-colors"
                  >
                    <span>LinkedIn Profile</span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>
                )}
              </div>

              {/* Full Cover Letter */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cover Letter & Pitch
                </span>
                <div className="rounded-xl border border-slate-800/80 bg-[#0E1526]/50 p-4 text-xs text-slate-300 leading-relaxed whitespace-pre-line min-h-[90px]">
                  {selectedApplicant.coverLetter || (
                    <span className="text-slate-500 italic">
                      Candidate did not include an optional cover letter with this application.
                    </span>
                  )}
                </div>
              </div>

              {/* Status Update & Recruiter Notes */}
              <div className="rounded-xl border border-slate-800/80 bg-[#0A0F1D] p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <label className="text-xs font-semibold text-white block mb-0.5">
                      Recruitment Stage / Pipeline Status
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Changing status updates candidate view in real-time
                    </span>
                  </div>

                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as ApplicationStatus)}
                    className="h-9 px-3 rounded-lg border border-slate-700/80 bg-[#080C14] text-xs font-medium text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="SUBMITTED">Submitted</option>
                    <option value="IN_REVIEW">Under Review</option>
                    <option value="ASSESSMENT_INVITED">Assessment Invited</option>
                    <option value="ASSESSMENT_COMPLETED">Assessment Completed</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                    <option value="OFFERED">Offer Extended</option>
                    <option value="REJECTED">Not Selected</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Internal Recruiter Notes (Confidential)
                  </label>
                  <textarea
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    maxLength={2000}
                    placeholder="Private notes on interview performance, candidate strengths, or evaluation benchmarks..."
                    className="w-full p-3 rounded-lg border border-slate-700/60 bg-[#080C14] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    rows={3}
                  />
                  <div className="text-[10px] text-slate-500 text-right mt-1">
                    {modalNotes.length} / 2000
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-[#0E1526]/90 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Applied {formatDate(selectedApplicant.createdAt)}
              </span>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  className="border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300"
                >
                  Close
                </Button>

                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={handleModalStatusSubmit}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Save Status & Notes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
