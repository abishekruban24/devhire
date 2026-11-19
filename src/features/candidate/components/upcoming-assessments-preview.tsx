import React from "react";
import { Clock, CheckCircle2, AlertCircle, PlayCircle, Trophy, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AssessmentPreview } from "@/types";

interface UpcomingAssessmentsPreviewProps {
  assessments: AssessmentPreview[];
}

export function UpcomingAssessmentsPreview({
  assessments,
}: UpcomingAssessmentsPreviewProps) {
  const getDifficultyBadge = (diff: AssessmentPreview["difficulty"]) => {
    switch (diff) {
      case "EASY":
        return <Badge variant="success">Easy</Badge>;
      case "MEDIUM":
        return <Badge variant="warning">Medium</Badge>;
      case "HARD":
        return <Badge variant="danger">Hard</Badge>;
    }
  };

  const getStatusBadge = (status: AssessmentPreview["status"], score?: number) => {
    switch (status) {
      case "EVALUATED":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Passed ({score}%)
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge variant="warning" className="gap-1 animate-pulse">
            <AlertCircle className="h-3 w-3" />
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="secondary">Ready to Start</Badge>;
    }
  };

  return (
    <div className="space-y-4" id="assessments">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Coding Benchmarks & Assessments</h2>
          <p className="text-xs text-slate-400">Proctored technical tests assigned by partner companies</p>
        </div>
        <Badge variant="mock">Mock Benchmarks</Badge>
      </div>

      <div className="space-y-3">
        {assessments.map((test) => (
          <Card
            key={test.id}
            className="p-5 border-slate-800/80 hover:border-slate-700 transition-all bg-[#0D1424]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {test.companyName}
                  </span>
                  {getDifficultyBadge(test.difficulty)}
                  {getStatusBadge(test.status, test.score)}
                </div>

                <h3 className="text-base font-semibold text-white">
                  {test.title}
                </h3>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    {test.durationMinutes} Minutes
                  </span>
                  <span>•</span>
                  <span>{test.questionsCount} Coding Challenges</span>
                  <span>•</span>
                  <span>Pass mark: {test.passingScore}%</span>
                  <span>•</span>
                  <span className="text-slate-500">Deadline: {test.dueDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {test.status === "EVALUATED" ? (
                  <Button variant="outline" size="sm" className="text-xs">
                    <Trophy className="h-3.5 w-3.5 text-amber-400 mr-1" />
                    View Score Report
                  </Button>
                ) : test.status === "IN_PROGRESS" ? (
                  <Button variant="default" size="sm" className="text-xs gap-1.5">
                    <PlayCircle className="h-3.5 w-3.5" />
                    Resume Challenge
                  </Button>
                ) : (
                  <Button variant="accent" size="sm" className="text-xs gap-1.5">
                    Start Assessment
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
