"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileDetailHeaderProps {
  onBack: () => void;
  subject?: string;
}

export function MobileDetailHeader({ onBack, subject }: MobileDetailHeaderProps) {
  return (
    <div className="bg-card mb-4 flex h-12 items-center gap-2 rounded-xl px-2 shadow-sm">
      <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <span className="truncate text-sm font-medium">{subject || "Email"}</span>
    </div>
  );
}
