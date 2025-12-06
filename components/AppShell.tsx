"use client";

import React from "react";

type AppShellProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ title, subtitle, rightSlot, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-card">
        <header className="app-header">
          <div>
            <h1 className="app-title">{title}</h1>
            {subtitle && <p className="app-subtitle">{subtitle}</p>}
          </div>
          {rightSlot && <div>{rightSlot}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}
