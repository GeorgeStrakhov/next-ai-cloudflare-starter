"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconRobot, IconEyeOff } from "@tabler/icons-react";

interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  model: string;
  isDefault: boolean;
  visibility: "public" | "admin_only";
}

interface AgentSelectorProps {
  value: string;
  onChange: (agentId: string) => void;
  disabled?: boolean;
}

export function AgentSelector({ value, onChange, disabled }: AgentSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data: { agents: Agent[] } = await res.json();
          setAgents(data.agents);

          // If no value selected, select the default agent
          if (!value && data.agents.length > 0) {
            const defaultAgent = data.agents.find((a) => a.isDefault);
            if (defaultAgent) {
              onChange(defaultAgent.id);
            } else {
              onChange(data.agents[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground">
        <IconRobot className="h-4 w-4 animate-pulse" />
        <span>Loading agents...</span>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground">
        <IconRobot className="h-4 w-4" />
        <span>No agents available</span>
      </div>
    );
  }

  // If only one agent, don't show selector at all
  if (agents.length <= 1) {
    return null;
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 px-3 gap-2 bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-accent transition-colors max-w-[200px]">
        <IconRobot className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate">
          <SelectValue placeholder="Select agent" />
        </span>
      </SelectTrigger>
      <SelectContent align="end">
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            <div className="flex items-center gap-2">
              <span>{agent.name}</span>
              {agent.visibility === "admin_only" && (
                <IconEyeOff className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
