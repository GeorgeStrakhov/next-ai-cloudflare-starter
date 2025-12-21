"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface PageHeaderContextValue {
  breadcrumb: ReactNode;
  setBreadcrumb: (content: ReactNode) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [breadcrumb, setBreadcrumbState] = useState<ReactNode>(null);

  const setBreadcrumb = useCallback((content: ReactNode) => {
    setBreadcrumbState(content);
  }, []);

  return (
    <PageHeaderContext.Provider value={{ breadcrumb, setBreadcrumb }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext);
  if (!context) {
    throw new Error("usePageHeader must be used within PageHeaderProvider");
  }
  return context;
}

export function useBreadcrumb() {
  const context = useContext(PageHeaderContext);
  return context?.breadcrumb ?? null;
}
