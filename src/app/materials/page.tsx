"use client";

import React, { Suspense } from "react";
import { MaterialsBrowser } from "@/components/MaterialsBrowser";

export default function MaterialsPage() {
  return (
    <Suspense>
      <MaterialsBrowser />
    </Suspense>
  );
}

