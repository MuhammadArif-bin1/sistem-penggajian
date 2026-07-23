"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="h-[75vh] w-full flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-blue-600" />
    </div>
  );
}
