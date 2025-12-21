"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface PageHeaderContextValue {
  breadcrumb: ReactNode;
  setBreadcrumb: (content: ReactNode) => void;
  actions: ReactNode;
  setActions: (content: ReactNode) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [breadcrumb, setBreadcrumbState] = useState<ReactNode>(null);
  const [actions, setActionsState] = useState<ReactNode>(null);

  const setBreadcrumb = useCallback((content: ReactNode) => {
    setBreadcrumbState(content);
  }, []);

  const setActions = useCallback((content: ReactNode) => {
    setActionsState(content);
  }, []);

  return (
    <PageHeaderContext.Provider value={{ breadcrumb, setBreadcrumb, actions, setActions }}>
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

export function useActions() {
  const context = useContext(PageHeaderContext);
  return context?.actions ?? null;
}
