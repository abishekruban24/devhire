"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Mail,
  ExternalLink,
  Briefcase,
  Clock,
  AlertCircle,
  Loader2,
  X,
  RotateCcw,
  Sparkles,
  Send,
  Ban,
  ShieldCheck,
  Code2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RecruiterApplicantItem } from "@/features/applications/actions/application-actions";
import { updateApplicationStatus } from "@/features/applications/actions/application-actions";
import type { RecruiterAssessmentItem } from "@/features/assessments/actions/assessment-actions";
import type { RecruiterInvitationItem } from "@/features/assessments/actions/invitation-actions";
import {
  createAssessmentInvitation,
  revokeAssessmentInvitation,
} from "@/features/assessments/actions/invitation-actions";
import type { ApplicationStatus } from "@prisma/client";
import { formatDate } from "@/lib/utils";

interface RecruiterApplicantManagementProps {
  initialApplications: RecruiterApplicantItem[];
  companyJobs: { id: string; title: string }[];
  companyAssessments?: RecruiterAssessmentItem[];
  initialInvitations?: RecruiterInvitationItem[];
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
  companyAssessments = [],
  initialInvitations = [],
}: RecruiterApplicantManagementProps) {
  const [applications, setApplications] = useState<RecruiterApplicantItem[]>(initialApplications);
  const [invitations, setInvitations] = useState<RecruiterInvitationItem[]>(initialInvitations);
  const [activeTab, setActiveTab] = useState<"APPLICANTS" | "INVITATIONS">("APPLICANTS");
  const [selectedJobId, setSelectedJobId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | ApplicationStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Review Modal State
  const [selectedApplicant, setSelectedApplicant] = useState<RecruiterApplicantItem | null>(null);
  const [modalStatus, setModalStatus] = useState<ApplicationStatus>("SUBMITTED");
  const [modalNotes, setModalNotes] = useState("");

  // Invitation Modal State
  const [inviteApplicant, setInviteApplicant] = useState<RecruiterApplicantItem | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Global Feedback Banner
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

  // Open Invitation Modal
  const handleOpenInviteModal = (app: RecruiterApplicantItem) => {
    setInviteApplicant(app);
    setInviteError(null);
    setFeedback(null);

    // Filter active assessments compatible with this applicant's job
    const active = companyAssessments.filter((a) => a.status === "ACTIVE");
    const eligible = active.filter((a) => {
      if (a.jobs && a.jobs.length > 0) {
        return a.jobs.some((j) => j.id === app.jobId);
      }
      return true;
    });

    if (eligible.length > 0) {
      setSelectedAssessmentId(eligible[0].id);
    } else if (active.length > 0) {
      setSelectedAssessmentId(active[0].id);
    } else {
      setSelectedAssessmentId("");
    }
  };

  const handleCloseInviteModal = () => {
    setInviteApplicant(null);
    setInviteError(null);
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

  // Submit Assessment Invitation
  const handleSendInvitationSubmit = () => {
    if (!inviteApplicant || !selectedAssessmentId) return;

    startTransition(async () => {
      const res = await createAssessmentInvitation({
        applicationId: inviteApplicant.id,
        assessmentId: selectedAssessmentId,
        expiresInDays,
      });

      if (res.success) {
        // Update application status to ASSESSMENT_INVITED
        setApplications((prev) =>
          prev.map((app) =>
            app.id === inviteApplicant.id ? { ...app, status: "ASSESSMENT_INVITED" } : app
          )
        );

        // Optimistically add to invitations list
        const chosenAssessment = companyAssessments.find((a) => a.id === selectedAssessmentId);
        if (chosenAssessment && res.invitationId) {
          const newInv: RecruiterInvitationItem = {
            id: res.invitationId,
            assessmentId: chosenAssessment.id,
            assessmentTitle: chosenAssessment.title,
            candidateId: inviteApplicant.candidateId,
            candidateName: inviteApplicant.candidate.name,
            candidateEmail: inviteApplicant.candidate.email,
            candidateHeadline: inviteApplicant.candidate.headline,
            candidateAvatarUrl: inviteApplicant.candidate.avatarUrl,
            applicationId: inviteApplicant.id,
            jobId: inviteApplicant.jobId,
            jobTitle: inviteApplicant.job.title,
            status: "PENDING",
            expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
          };
          setInvitations((prev) => [newInv, ...prev]);
        }

        setFeedback({
          type: "success",
          message: res.message,
        });
        handleCloseInviteModal();
      } else {
        setInviteError(res.message);
      }
    });
  };

  // Revoke Invitation
  const handleRevokeInvitationSubmit = (invitationId: string) => {
    startTransition(async () => {
      const res = await revokeAssessmentInvitation(invitationId);
      if (res.success) {
        setInvitations((prev) =>
          prev.map((inv) =>
            inv.id === invitationId
              ? { ...inv, status: "REVOKED", revokedAt: new Date().toISOString() }
              : inv
          )
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

  // Filter Applications
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
        const query = searchQuery.toLowerCase();
        const nameMatch = app.candidate.name.toLowerCase().includes(query);
        const emailMatch = app.candidate.email.toLowerCase().includes(query);
        const jobMatch = app.job.title.toLowerCase().includes(query);
        const headlineMatch = app.candidate.headline?.toLowerCase().includes(query) ?? false;
        const skillsMatch =
          app.candidate.skills?.some((s) => s.toLowerCase().includes(query)) ?? false;

        return nameMatch || emailMatch || jobMatch || headlineMatch || skillsMatch;
      }
      return true;
    });
  }, [applications, selectedJobId, selectedStatus, searchQuery]);

  // Filter Invitations
  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      if (selectedJobId !== "ALL" && inv.jobId !== selectedJobId) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          inv.candidateName.toLowerCase().includes(query) ||
          inv.candidateEmail.toLowerCase().includes(query) ||
          inv.assessmentTitle.toLowerCase().includes(query) ||
          inv.jobTitle.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [invitations, selectedJobId, searchQuery]);

  const handleResetFilters = () => {
    setSelectedJobId("ALL");
    setSelectedStatus("ALL");
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedJobId !== "ALL" || selectedStatus !== "ALL" || searchQuery.trim().length > 0;

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "SUBMITTED":
        return <Badge variant="secondary">Submitted</Badge>;
      case "IN_REVIEW":
        return (
          <Badge variant="outline" className="text-blue-400 border-blue-500/40 bg-blue-950/30">
            Under Review
          </Badge>
        );
      case "ASSESSMENT_INVITED":
        return (
          <Badge variant="outline" className="text-purple-400 border-purple-500/40 bg-purple-950/30">
            Assessment Invited
          </Badge>
        );
      case "ASSESSMENT_COMPLETED":
        return (
          <Badge variant="outline" className="text-indigo-400 border-indigo-500/40 bg-indigo-950/30">
            Assessment Completed
          </Badge>
        );
      case "SHORTLISTED":
        return (
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 bg-emerald-950/30">
            Shortlisted
          </Badge>
        );
      case "OFFERED":
        return (
          <Badge variant="outline" className="text-amber-400 border-amber-500/40 bg-amber-950/30">
            Offer Extended
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="text-rose-400 border-rose-500/40 bg-rose-950/30">
            Not Selected
          </Badge>
        );
    }
  };

  const getInvitationBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-950/60 text-blue-300 border border-blue-800/40">
            <Clock className="h-3 w-3 text-blue-400" />
            Pending
          </span>
        );
      case "STARTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/60 text-amber-300 border border-amber-800/40 animate-pulse">
            <Clock className="h-3 w-3 text-amber-400" />
            In Progress
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            Completed
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-900 text-slate-400 border border-slate-800">
            <Clock className="h-3 w-3 text-slate-500" />
            Expired
          </span>
        );
      case "REVOKED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-950/60 text-rose-300 border border-rose-800/40">
            <Ban className="h-3 w-3 text-rose-400" />
            Revoked
          </span>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Find active invitation for an application
  const getActiveInvitationForApp = (appId: string) => {
    return invitations.find(
      (inv) => inv.applicationId === appId && (inv.status === "PENDING" || inv.status === "STARTED")
    );
  };

  // Active company assessments count
  const activeAssessmentsCount = companyAssessments.filter((a) => a.status === "ACTIVE").length;

  return (
    <div className="space-y-6" id="candidates">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/40 border-rose-500/40 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Candidate Pipeline & Assessment Invitations
            </h2>
            <Badge variant="default" className="bg-blue-600/20 text-blue-400 border-blue-500/30">
              Live Database
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review applicant profiles, invite qualified candidates to technical assessments, and monitor evaluation progress
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 bg-[#0E1526] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("APPLICANTS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "APPLICANTS"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Applicants ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab("INVITATIONS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "INVITATIONS"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Invitations ({invitations.length})
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder={
              activeTab === "APPLICANTS"
                ? "Search applicants by name, email, target role, skills..."
                : "Search invitations by candidate, assessment, or job..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-800 bg-[#0E1526]/80 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
            <Filter className="h-3.5 w-3.5" />
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

          {/* Status Filter (Applicants View) */}
          {activeTab === "APPLICANTS" && (
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
          )}

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
            {activeTab === "APPLICANTS" ? (
              <>
                Showing <strong className="text-slate-200">{filteredApplications.length}</strong> of{" "}
                <strong className="text-slate-200">{applications.length}</strong> applicants
              </>
            ) : (
              <>
                Showing <strong className="text-slate-200">{filteredInvitations.length}</strong> of{" "}
                <strong className="text-slate-200">{invitations.length}</strong> invitations
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: APPLICANTS PIPELINE                                                */}
      {/* ========================================================================= */}
      {activeTab === "APPLICANTS" && (
        <>
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
            <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-[#0A0F1D]">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800/80 bg-[#0E1526]/80 text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Candidate</th>
                    <th className="px-5 py-3.5">Target Opening</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Assessment Invitation</th>
                    <th className="px-5 py-3.5">Applied Date</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredApplications.map((app) => {
                    const activeInv = getActiveInvitationForApp(app.id);

                    return (
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

                        {/* Assessment Invitation Column */}
                        <td className="px-5 py-4 text-xs">
                          {activeInv ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-purple-300 truncate max-w-[180px]">
                                  {activeInv.assessmentTitle}
                                </span>
                                {getInvitationBadge(activeInv.status)}
                              </div>
                              {activeInv.expiresAt && (
                                <div className="text-[10px] text-slate-500">
                                  Expires: {formatDate(activeInv.expiresAt)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs italic">None sent</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                          {formatDate(app.createdAt)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Invite to Assessment Button */}
                            {!activeInv && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenInviteModal(app)}
                                className="h-8 px-2.5 text-xs text-purple-300 border-purple-800/60 bg-purple-950/30 hover:bg-purple-900/40 hover:text-purple-200 font-medium"
                                title="Invite to Coding Assessment"
                              >
                                <Send className="h-3 w-3 mr-1 text-purple-400" />
                                Invite
                              </Button>
                            )}

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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SENT ASSESSMENT INVITATIONS                                        */}
      {/* ========================================================================= */}
      {activeTab === "INVITATIONS" && (
        <>
          {invitations.length === 0 ? (
            <Card className="border-slate-800/80 bg-[#0E1526]/50 p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-3">
                <Code2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">No Assessment Invitations Sent Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 leading-relaxed">
                Select an applicant from your pipeline above to send them a technical coding assessment invitation. Sent invitations will be tracked here.
              </p>
              <Button
                variant="accent"
                size="sm"
                onClick={() => setActiveTab("APPLICANTS")}
                className="text-xs"
              >
                Go to Applicants Pipeline
              </Button>
            </Card>
          ) : filteredInvitations.length === 0 ? (
            <Card className="border-slate-800/80 bg-[#0E1526]/40 p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
                <Filter className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">No Matching Invitations Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                No invitations match your current search query.
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
            <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-[#0A0F1D]">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800/80 bg-[#0E1526]/80 text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Candidate</th>
                    <th className="px-5 py-3.5">Assessment Challenge</th>
                    <th className="px-5 py-3.5">Related Job</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Expiration Deadline</th>
                    <th className="px-5 py-3.5">Sent Date</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInvitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white truncate max-w-[180px]">
                          {inv.candidateName}
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-[180px]">
                          {inv.candidateEmail}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-200 truncate max-w-[200px]">
                          {inv.assessmentTitle}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-300">
                        {inv.jobTitle}
                      </td>

                      <td className="px-5 py-4">
                        {getInvitationBadge(inv.status)}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                        {inv.expiresAt ? (
                          <span className={new Date(inv.expiresAt) < new Date() ? "text-rose-400" : "text-slate-300"}>
                            {formatDate(inv.expiresAt)}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">No expiration</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(inv.createdAt)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {inv.status === "PENDING" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleRevokeInvitationSubmit(inv.id)}
                            className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                            title="Revoke unstarted invitation"
                          >
                            <Ban className="h-3 w-3 mr-1" />
                            Revoke
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* INVITE TO ASSESSMENT MODAL                                                */}
      {/* ========================================================================= */}
      {inviteApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0B101D] text-slate-100 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800/80 bg-[#0E1526]/90 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Invite to Technical Assessment
                  </h2>
                  <p className="text-xs text-slate-400">
                    Send an authorized assessment benchmark to {inviteApplicant.candidate.name}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseInviteModal}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {inviteError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-200 flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              {/* Candidate & Target Job Details */}
              <div className="rounded-xl border border-slate-800/80 bg-[#0E1526]/60 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Candidate:</span>
                  <strong className="text-white font-medium">{inviteApplicant.candidate.name}</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Target Role:</span>
                  <span className="text-blue-300 font-medium">{inviteApplicant.job.title}</span>
                </div>
              </div>

              {/* Assessment Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Select Assessment Challenge <span className="text-rose-400">*</span>
                </label>
                {activeAssessmentsCount === 0 ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200 flex items-center gap-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>
                      No ACTIVE assessments available. Create and activate an assessment in the Assessment Library section below.
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedAssessmentId}
                    onChange={(e) => setSelectedAssessmentId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-700/80 bg-[#080C14] text-xs font-medium text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                  >
                    {companyAssessments
                      .filter((a) => a.status === "ACTIVE")
                      .map((a) => {
                        const totalQuestions = a.questions?.length || a._count.questions;
                        const isJobLinked = a.jobs && a.jobs.length > 0;
                        const matchesJob = isJobLinked && a.jobs.some((j) => j.id === inviteApplicant.jobId);

                        return (
                          <option key={a.id} value={a.id}>
                            {a.title} ({totalQuestions} challenges • {a.durationMinutes}m • Pass: {a.passingScore}%)
                            {isJobLinked ? (matchesJob ? " [Job Matched]" : " [Assigned to other opening]") : " [General]"}
                          </option>
                        );
                      })}
                  </select>
                )}
              </div>

              {/* Expiration Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Invitation Expiration Window
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExpiresInDays(days)}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                        expiresInDays === days
                          ? "border-purple-500 bg-purple-950/50 text-purple-200"
                          : "border-slate-800 bg-[#080C14] text-slate-400 hover:text-white"
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Candidate will have {expiresInDays} {expiresInDays === 1 ? "day" : "days"} from issuance to initiate their attempt before the invitation expires.
                </p>
              </div>

              {/* Informational Guard Note */}
              <div className="rounded-xl border border-slate-800 bg-[#080C14]/80 p-3.5 text-[11px] text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Anti-Cheating Guard: Complete problem statements and hidden test cases will remain locked until the candidate officially begins their proctored attempt session.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-[#0E1526]/90 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseInviteModal}
                className="border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isPending || !selectedAssessmentId || activeAssessmentsCount === 0}
                onClick={handleSendInvitationSubmit}
                className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send Assessment Invitation
                  </>
                )}
              </Button>
            </div>
          </div>
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
