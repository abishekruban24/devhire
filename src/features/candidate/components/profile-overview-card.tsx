"use client";

import React, { useState, useTransition } from "react";
import {
  MapPin,
  Mail,
  CheckCircle2,
  ShieldCheck,
  Edit3,
  Loader2,
  X,
  Save,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CandidateProfile } from "@/types";
import { updateCandidateProfile } from "../actions/profile-actions";

interface ProfileOverviewCardProps {
  profile: CandidateProfile;
}

export function ProfileOverviewCard({ profile }: ProfileOverviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [name, setName] = useState(profile.name);
  const [headline, setHeadline] = useState(profile.headline);
  const [bio, setBio] = useState(profile.bio);
  const [skillsText, setSkillsText] = useState(profile.skills.join(", "));
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl || "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl || "");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const initials =
    profile.name
      .trim()
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "DEV";

  const handleOpenEdit = () => {
    setName(profile.name);
    setHeadline(profile.headline);
    setBio(profile.bio);
    setSkillsText(profile.skills.join(", "));
    setGithubUrl(profile.githubUrl || "");
    setLinkedinUrl(profile.linkedinUrl || "");
    setFormErrors({});
    setStatusMessage(null);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setStatusMessage(null);

    const skillsArray = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    startTransition(async () => {
      const result = await updateCandidateProfile({
        name,
        headline,
        bio,
        skills: skillsArray,
        githubUrl: githubUrl || undefined,
        linkedinUrl: linkedinUrl || undefined,
      });

      if (!result.success) {
        if (result.errors) {
          setFormErrors(result.errors);
        }
        setStatusMessage({ type: "error", text: result.message });
      } else {
        setStatusMessage({ type: "success", text: "Profile updated successfully! Changes saved." });
        setTimeout(() => {
          setIsEditing(false);
          setStatusMessage(null);
        }, 1200);
      }
    });
  };

  return (
    <Card className="relative overflow-hidden border-slate-800 bg-gradient-to-br from-[#0E1526] to-[#0A101D]">
      <div className="absolute top-0 right-0 h-32 w-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Main Profile Header */}
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center font-extrabold text-2xl text-white shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-500/30 shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl text-white font-bold">{profile.name}</CardTitle>
                {profile.completedAssessments > 0 ? (
                  <Badge variant="success" className="gap-1 text-[11px]">
                    <CheckCircle2 className="h-3 w-3" />
                    Evaluated Developer
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-cyan-500/40 text-cyan-300 text-[11px]">
                    <ShieldCheck className="h-3 w-3" />
                    Authenticated Candidate
                  </Badge>
                )}
              </div>

              <CardDescription className="text-slate-300 font-medium mt-0.5">
                {profile.headline || "Software Engineer"}
              </CardDescription>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  {profile.location || "Remote / Global"}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  {profile.email}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEdit}
              className="border-cyan-500/30 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-900/40 hover:text-white text-xs gap-1.5 h-8 font-medium"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </Button>

            {profile.githubUrl && (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
                title="GitHub Profile"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
            )}

            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
                title="LinkedIn Profile"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {/* Interactive Editing Form Drawer */}
        {isEditing && (
          <form
            onSubmit={handleSave}
            className="p-4 sm:p-5 rounded-xl border border-cyan-500/30 bg-[#0B1120] space-y-4 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5" />
                Edit Professional Profile
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
                disabled={isPending}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {statusMessage && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  statusMessage.type === "success"
                    ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-300"
                    : "bg-red-950/60 border border-red-500/30 text-red-300"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
                {formErrors.name && (
                  <span className="text-[10px] text-red-400 mt-0.5 block">{formErrors.name}</span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Full-Stack Engineer"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                {formErrors.headline && (
                  <span className="text-[10px] text-red-400 mt-0.5 block">{formErrors.headline}</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Engineering Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Highlight your engineering experience, architectural background, and project impact..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
              {formErrors.bio && (
                <span className="text-[10px] text-red-400 mt-0.5 block">{formErrors.bio}</span>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Technical Skills (comma-separated)
              </label>
              <input
                type="text"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="TypeScript, Next.js, PostgreSQL, Docker, Python"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Separate multiple technical proficiencies with commas.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  GitHub Profile URL
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                {formErrors.githubUrl && (
                  <span className="text-[10px] text-red-400 mt-0.5 block">{formErrors.githubUrl}</span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                {formErrors.linkedinUrl && (
                  <span className="text-[10px] text-red-400 mt-0.5 block">{formErrors.linkedinUrl}</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={isPending}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs gap-1.5 h-8 shadow-sm shadow-cyan-500/20"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Bio Text */}
        <p className="text-sm text-slate-300 leading-relaxed">
          {profile.bio || "No engineering bio added yet. Click 'Edit Profile' to highlight your architectural background and project accomplishments."}
        </p>

        {/* Skill tags */}
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Demonstrated Technical Competencies
          </div>
          {profile.skills.length === 0 ? (
            <div className="text-xs text-slate-500 italic">
              No technical competencies tagged yet. Click &apos;Edit Profile&apos; to record your languages and tools.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="bg-slate-800/90 text-slate-200 border-slate-700/70 hover:border-slate-600 px-2.5 py-1 text-xs"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Real Metrics Banner (100% computed from database records) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/60">
          <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">
              Evaluated Benchmarks
            </span>
            <span className="text-lg font-bold text-white mt-0.5 block">
              {profile.completedAssessments} Completed
            </span>
          </div>

          <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">
              Evaluation Average
            </span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
              {profile.completedAssessments > 0 ? `${profile.averageScore}%` : "Pending"}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-lg bg-slate-900/60 p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">
              Verified Stack Tags
            </span>
            <span className="text-lg font-bold text-cyan-400 mt-0.5 block">
              {profile.skills.length} Recorded
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
