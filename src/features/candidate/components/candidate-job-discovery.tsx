"use client";

import React, { useState, useMemo, useEffect, useTransition } from "react";
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Building2,
  ArrowRight,
  X,
  Filter,
  CheckCircle2,
  Globe,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  ShieldCheck,
  Send,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PublishedJobItem } from "@/features/jobs/actions/job-actions";
import { applyToJob } from "@/features/applications/actions/application-actions";
import type { JobLocationType, JobType } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CandidateJobDiscoveryProps {
  initialJobs: PublishedJobItem[];
  totalCount: number;
  initialAppliedJobIds?: string[];
}

const PAGE_SIZE = 6;

export function CandidateJobDiscovery({
  initialJobs,
  totalCount,
  initialAppliedJobIds = [],
}: CandidateJobDiscoveryProps) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"ALL" | JobType>("ALL");
  const [selectedLocationType, setSelectedLocationType] = useState<"ALL" | JobLocationType>("ALL");
  const [selectedExpLevel, setSelectedExpLevel] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Application State
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(
    () => new Set(initialAppliedJobIds)
  );
  const [coverLetter, setCoverLetter] = useState("");
  const [isApplyPending, startApplyTransition] = useTransition();
  const [applyFeedback, setApplyFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal State
  const [selectedJob, setSelectedJob] = useState<PublishedJobItem | null>(null);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedJob) {
        setSelectedJob(null);
        setCoverLetter("");
        setApplyFeedback(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedJob]);

  // Open modal for job
  const handleOpenJobModal = (job: PublishedJobItem) => {
    setSelectedJob(job);
    setCoverLetter("");
    setApplyFeedback(null);
  };

  const handleCloseModal = () => {
    setSelectedJob(null);
    setCoverLetter("");
    setApplyFeedback(null);
  };

  const handleApplySubmit = () => {
    if (!selectedJob) return;
    setApplyFeedback(null);

    startApplyTransition(async () => {
      const res = await applyToJob({
        jobId: selectedJob.id,
        coverLetter: coverLetter.trim() || null,
      });

      if (res.success) {
        setAppliedJobIds((prev) => new Set(prev).add(selectedJob.id));
        setApplyFeedback({
          type: "success",
          message: res.message,
        });
      } else {
        setApplyFeedback({
          type: "error",
          message: res.message,
        });
      }
    });
  };

  // Extract distinct experience levels from jobs
  const experienceLevels = useMemo(() => {
    const levels = new Set<string>();
    initialJobs.forEach((job) => {
      if (job.experienceLevel) {
        levels.add(job.experienceLevel.trim());
      }
    });
    return Array.from(levels);
  }, [initialJobs]);

  // Client-side filtering & searching
  const filteredJobs = useMemo(() => {
    return initialJobs.filter((job) => {
      // 1. Strict status check: MUST be PUBLISHED (Never DRAFT, CLOSED, ARCHIVED)
      if (job.status !== "PUBLISHED") {
        return false;
      }

      // 2. Search query (matches title, company name, location, requirements, description)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = job.title.toLowerCase().includes(query);
        const matchCompany = job.company?.name.toLowerCase().includes(query);
        const matchLocation = job.location.toLowerCase().includes(query);
        const matchDesc = job.description.toLowerCase().includes(query);
        const matchReq = job.requirements.toLowerCase().includes(query);
        if (!matchTitle && !matchCompany && !matchLocation && !matchDesc && !matchReq) {
          return false;
        }
      }

      // 3. Employment Type Filter
      if (selectedType !== "ALL" && job.type !== selectedType) {
        return false;
      }

      // 4. Workplace Type Filter
      if (selectedLocationType !== "ALL" && job.locationType !== selectedLocationType) {
        return false;
      }

      // 5. Experience Level Filter
      if (selectedExpLevel !== "ALL") {
        if (!job.experienceLevel || !job.experienceLevel.toLowerCase().includes(selectedExpLevel.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [initialJobs, searchQuery, selectedType, selectedLocationType, selectedExpLevel]);

  // Change handlers that reset pagination to page 1
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleLocationTypeChange = (val: "ALL" | JobLocationType) => {
    setSelectedLocationType(val);
    setCurrentPage(1);
  };

  const handleTypeChange = (val: "ALL" | JobType) => {
    setSelectedType(val);
    setCurrentPage(1);
  };

  const handleExpLevelChange = (val: string) => {
    setSelectedExpLevel(val);
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredJobs.slice(start, start + PAGE_SIZE);
  }, [filteredJobs, currentPage]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedType !== "ALL" ||
    selectedLocationType !== "ALL" ||
    selectedExpLevel !== "ALL";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedType("ALL");
    setSelectedLocationType("ALL");
    setSelectedExpLevel("ALL");
    setCurrentPage(1);
  };

  const formatJobType = (type: JobType): string => {
    switch (type) {
      case "FULL_TIME":
        return "Full-time";
      case "PART_TIME":
        return "Part-time";
      case "CONTRACT":
        return "Contract";
      case "INTERNSHIP":
        return "Internship";
      default:
        return type;
    }
  };

  const formatLocationTypeBadge = (locationType: JobLocationType) => {
    switch (locationType) {
      case "REMOTE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Globe className="h-3 w-3" />
            Remote
          </span>
        );
      case "HYBRID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Building2 className="h-3 w-3" />
            Hybrid
          </span>
        );
      case "ON_SITE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-300 border border-slate-500/20">
            <MapPin className="h-3 w-3" />
            On-site
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" id="jobs">
      {/* Header with Title and Live DB Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Available Technical Roles</h2>
            <Badge variant="default" className="bg-blue-600/20 text-blue-400 border-blue-500/30">
              Live Database
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real engineering positions posted directly by verified recruiters and hiring partners.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {totalCount} {totalCount === 1 ? "Role Published" : "Roles Published"}
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="space-y-3 rounded-xl border border-slate-800/80 bg-[#0E1526]/80 p-4 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search roles by title, key skills, location, or company name..."
            className="w-full h-10 pl-10 pr-9 rounded-lg border border-slate-700/60 bg-[#080C14] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              title="Clear search query"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns & Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Filter by:</span>
          </div>

          {/* Workplace Type */}
          <select
            value={selectedLocationType}
            onChange={(e) => handleLocationTypeChange(e.target.value as "ALL" | JobLocationType)}
            className="h-8 px-3 rounded-md border border-slate-700/60 bg-[#080C14] text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="ALL">All Workplace Types</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ON_SITE">On-site</option>
          </select>

          {/* Employment Type */}
          <select
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value as "ALL" | JobType)}
            className="h-8 px-3 rounded-md border border-slate-700/60 bg-[#080C14] text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="ALL">All Employment Types</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERNSHIP">Internship</option>
          </select>

          {/* Experience Level */}
          <select
            value={selectedExpLevel}
            onChange={(e) => handleExpLevelChange(e.target.value)}
            className="h-8 px-3 rounded-md border border-slate-700/60 bg-[#080C14] text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="ALL">All Experience Levels</option>
            <option value="Entry">Entry-level (0-2 yrs)</option>
            <option value="Mid">Mid-level (3-5 yrs)</option>
            <option value="Senior">Senior (5+ yrs)</option>
            <option value="Lead">Lead / Staff (8+ yrs)</option>
            {experienceLevels
              .filter(
                (lvl) =>
                  !["Entry", "Mid", "Senior", "Lead"].some((k) =>
                    lvl.toLowerCase().includes(k.toLowerCase())
                  )
              )
              .map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
          </select>

          {/* Reset Filters button */}
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

          {/* Live Matching Count */}
          <div className="ml-auto text-xs text-slate-400">
            Showing <strong className="text-slate-200">{filteredJobs.length}</strong> of{" "}
            <strong className="text-slate-200">{totalCount}</strong> published openings
          </div>
        </div>
      </div>

      {/* Empty State: Zero Published Jobs In Entire System */}
      {initialJobs.length === 0 && (
        <Card className="border-slate-800/80 bg-[#0E1526]/40 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
            <Briefcase className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Open Roles Currently Published</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Partner tech companies are currently finalizing coding challenges and benchmark criteria. Check back shortly as new engineering openings are published.
          </p>
          <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-4 py-2 rounded-lg border border-slate-800">
            <Info className="h-4 w-4 text-blue-400 shrink-0" />
            <span>Recruiters publish jobs in real-time from the Recruiter Management Suite.</span>
          </div>
        </Card>
      )}

      {/* Empty State: Filters Returned Zero Results */}
      {initialJobs.length > 0 && filteredJobs.length === 0 && (
        <Card className="border-slate-800/80 bg-[#0E1526]/40 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
            <Filter className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Matching Published Positions Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
            We couldn&apos;t find any published roles matching your current search criteria. Try modifying your search keywords or clearing active filters.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Clear All Filters
          </Button>
        </Card>
      )}

      {/* Job Cards Grid */}
      {paginatedJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedJobs.map((job) => {
            const hasSalary =
              job.salaryMin !== null &&
              job.salaryMin !== undefined &&
              job.salaryMax !== null &&
              job.salaryMax !== undefined;

            return (
              <Card
                key={job.id}
                className="flex flex-col justify-between hover:border-blue-500/50 bg-[#0A0F1D] border-slate-800/90 transition-all duration-200 group cursor-pointer"
                onClick={() => handleOpenJobModal(job)}
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 uppercase tracking-wide truncate">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                          {job.company?.name || "Hiring Company"}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                        {job.title}
                      </CardTitle>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {appliedJobIds.has(job.id) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          Applied
                        </span>
                      )}
                      {formatLocationTypeBadge(job.locationType)}
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
                        {formatJobType(job.type)}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-2.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[140px]">{job.location}</span>
                    </span>

                    {job.experienceLevel && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>{job.experienceLevel}</span>
                        </span>
                      </>
                    )}

                    {hasSalary && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <DollarSign className="h-3.5 w-3.5 shrink-0" />
                          {formatCurrency(job.salaryMin!, job.currency)} -{" "}
                          {formatCurrency(job.salaryMax!, job.currency)}
                        </span>
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-3">
                  {/* Brief description excerpt */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  {/* Requirements excerpt / pills */}
                  {job.requirements && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.requirements
                        .split("\n")
                        .map((r) => r.replace(/^[-*•\d.]+\s*/, "").trim())
                        .filter((r) => r.length > 2 && r.length < 35)
                        .slice(0, 3)
                        .map((req, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700/60 truncate max-w-[200px]"
                          >
                            {req}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Card Footer */}
                  <div className="pt-3 flex items-center justify-between border-t border-slate-800/60">
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Clock className="h-3 w-3" />
                      Posted on {formatDate(job.createdAt)}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      className={`text-xs transition-colors ${
                        appliedJobIds.has(job.id)
                          ? "border-emerald-700/60 text-emerald-300 bg-emerald-950/30 hover:bg-emerald-950/50"
                          : "group-hover:border-blue-500/50 group-hover:bg-blue-600/10 group-hover:text-blue-300"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenJobModal(job);
                      }}
                    >
                      {appliedJobIds.has(job.id) ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mr-1" />
                          View Application
                        </>
                      ) : (
                        <>
                          View Details & Apply
                          <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
          <div className="text-xs text-slate-400">
            Page <strong className="text-slate-200">{currentPage}</strong> of{" "}
            <strong className="text-slate-200">{totalPages}</strong>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 text-xs border-slate-800 bg-[#0E1526] text-slate-300 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setCurrentPage(pageNumber)}
                className={`h-8 w-8 rounded-md text-xs font-medium transition-colors ${
                  currentPage === pageNumber
                    ? "bg-blue-600 text-white"
                    : "border border-slate-800 bg-[#0E1526] text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {pageNumber}
              </button>
            ))}

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-3 text-xs border-slate-800 bg-[#0E1526] text-slate-300 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* JOB DETAILS MODAL                                                         */}
      {/* ========================================================================= */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-[#0B101D] text-slate-100 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800/80 bg-[#0E1526]/90 flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                    <Building2 className="h-4 w-4 text-blue-400 shrink-0" />
                    {selectedJob.company?.name || "Hiring Company"}
                  </span>
                  {appliedJobIds.has(selectedJob.id) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Already Applied
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Accepting Applications
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {selectedJob.title}
                </h2>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
                  {formatLocationTypeBadge(selectedJob.locationType)}
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                    {formatJobType(selectedJob.type)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    {selectedJob.location}
                  </span>
                  {selectedJob.experienceLevel && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                        {selectedJob.experienceLevel}
                      </span>
                    </>
                  )}
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    Published {formatDate(selectedJob.createdAt)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0"
                aria-label="Close job details modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
              {/* Compensation Banner */}
              {selectedJob.salaryMin && selectedJob.salaryMax ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      Target Compensation
                    </span>
                    <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                      {formatCurrency(selectedJob.salaryMin, selectedJob.currency)} –{" "}
                      {formatCurrency(selectedJob.salaryMax, selectedJob.currency)}{" "}
                      <span className="text-xs font-normal text-slate-400">{selectedJob.currency} / year</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 max-w-xs sm:text-right">
                    Verified compensation range provided by {selectedJob.company?.name || "the hiring team"}.
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 text-xs text-slate-400 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Compensation will be discussed during initial technical interview based on benchmark score.</span>
                </div>
              )}

              {/* Full Description Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Role Description & Scope
                </h3>
                <div className="rounded-xl border border-slate-800/80 bg-[#0E1526]/50 p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {selectedJob.description}
                </div>
              </div>

              {/* Key Requirements Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Candidate Requirements & Qualifications
                </h3>
                <div className="rounded-xl border border-slate-800/80 bg-[#0E1526]/50 p-4 space-y-2.5">
                  {selectedJob.requirements.split("\n").filter((line) => line.trim().length > 0).map((reqLine, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      <span>{reqLine.replace(/^[-*•\d.]+\s*/, "")}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Company Information Card */}
              <div className="rounded-xl border border-slate-800/80 bg-[#0A0F1D] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-semibold text-white">
                      About {selectedJob.company?.name || "Company"}
                    </span>
                  </div>
                  {selectedJob.company?.website && (
                    <a
                      href={selectedJob.company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-400 pt-1">
                  {selectedJob.company?.industry && (
                    <div>
                      <span className="text-slate-500 block">Industry</span>
                      <span className="text-slate-200 font-medium">{selectedJob.company.industry}</span>
                    </div>
                  )}
                  {selectedJob.company?.location && (
                    <div>
                      <span className="text-slate-500 block">Headquarters</span>
                      <span className="text-slate-200 font-medium">{selectedJob.company.location}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block">Listing Status</span>
                    <span className="text-emerald-400 font-medium">Published Opening</span>
                  </div>
                </div>

                {selectedJob.company?.description && (
                  <p className="text-xs text-slate-400 pt-1 border-t border-slate-800/60 leading-relaxed">
                    {selectedJob.company.description}
                  </p>
                )}
              </div>

              {/* Application Status or Submission Form */}
              {applyFeedback && (
                <div
                  className={`rounded-xl border p-4 text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                    applyFeedback.type === "success"
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-200"
                  }`}
                >
                  {applyFeedback.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <strong className="block font-semibold mb-0.5">
                      {applyFeedback.type === "success" ? "Application Submitted" : "Submission Failed"}
                    </strong>
                    {applyFeedback.message}
                  </div>
                </div>
              )}

              {appliedJobIds.has(selectedJob.id) ? (
                /* Already Applied Notice */
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="block text-emerald-100 font-semibold text-sm">
                      Application Active in Recruitment Pipeline
                    </strong>
                    <p className="text-slate-300 leading-relaxed">
                      You have submitted your profile for <strong>{selectedJob.title}</strong> at{" "}
                      {selectedJob.company?.name || "this company"}. Your application has been received and is available to the hiring team in their candidate management console.
                    </p>
                    <p className="text-[11px] text-emerald-400/90 pt-1">
                      Monitor your application status and next steps in the Active Applications Tracker above.
                    </p>
                  </div>
                </div>
              ) : (
                /* Cover Letter Submission Box */
                <div className="rounded-xl border border-blue-500/30 bg-[#0E1526]/80 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-blue-400" />
                      Cover Letter & Engineering Highlights (Optional)
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {coverLetter.length} / 3000
                    </span>
                  </div>

                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    maxLength={3000}
                    disabled={isApplyPending}
                    placeholder="Share key technical accomplishments, architecture experience, or reasons for your interest in this role... (optional, max 3,000 characters)"
                    className="w-full p-3 rounded-lg border border-slate-700/60 bg-[#080C14] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none disabled:opacity-50"
                    rows={4}
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      Your verified candidate profile and skills will be securely attached.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-[#0E1526]/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Live recruitment opening backed by Neon PostgreSQL
              </span>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  className="border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300"
                >
                  Close
                </Button>

                {appliedJobIds.has(selectedJob.id) ? (
                  <Button
                    size="sm"
                    disabled
                    className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-medium text-xs cursor-not-allowed flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Already Applied
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={isApplyPending}
                    onClick={handleApplySubmit}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-600/20 flex items-center gap-2"
                  >
                    {isApplyPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Submit Application
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
