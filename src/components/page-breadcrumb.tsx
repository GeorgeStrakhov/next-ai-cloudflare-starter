"use client";

import { useEffect } from "react";
import { usePageHeader } from "@/components/dashboard/page-header-context";

interface PageBreadcrumbProps {
  title: string;
}

/**
 * Simple breadcrumb that just sets a title in the header.
 * Use this for pages that don't need interactive elements in the breadcrumb.
 */
export function PageBreadcrumb({ title }: PageBreadcrumbProps) {
  const { setBreadcrumb } = usePageHeader();

  useEffect(() => {
    setBreadcrumb(<span className="font-medium">{title}</span>);
    return () => setBreadcrumb(null);
  }, [title, setBreadcrumb]);

  return null;
}
