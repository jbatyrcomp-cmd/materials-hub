import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function handleApiError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Account pending admin approval" },
        { status: 403 }
      );
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.flatten() },
      { status: 400 }
    );
  }
  console.error("API error:", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Internal server error" },
    { status: 500 }
  );
}

export const safeUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  preferredLang: true,
} as const;
