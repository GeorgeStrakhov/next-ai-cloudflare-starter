"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Agent } from "@/db/schema/agents";
import { AVAILABLE_TOOLS, type ToolInfo } from "@/lib/agents/tools";

// Available models (should match LLM_MODELS in types.ts)
const AVAILABLE_MODELS = [
  { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "OpenAI" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "Google" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", provider: "Anthropic" },
  { id: "mistralai/mistral-small-creative", name: "Mistral Small", provider: "Mistral" },
];

// Category labels and icons
const CATEGORY_INFO: Record<ToolInfo["category"], { label: string; color: string }> = {
  utilities: { label: "Utilities", color: "bg-blue-500/10 text-blue-600" },
  research: { label: "Research", color: "bg-purple-500/10 text-purple-600" },
  creative: { label: "Creative", color: "bg-pink-500/10 text-pink-600" },
};

interface AgentFormProps {
  agent?: Agent;
  mode: "create" | "edit";
}

export function AgentForm({ agent, mode }: AgentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse existing enabled tools from agent
  const parseEnabledTools = (): string[] => {
    if (!agent?.enabledTools) return [];
    try {
      return JSON.parse(agent.enabledTools);
    } catch {
      return [];
    }
  };

  // Form state
  const [name, setName] = useState(agent?.name || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [systemPrompt, setSystemPrompt] = useState(
    agent?.systemPrompt || "You are a helpful AI assistant. Be concise and friendly."
  );
  const [model, setModel] = useState(agent?.model || "google/gemini-2.5-flash");
  const [isDefault, setIsDefault] = useState(agent?.isDefault || false);
  const [visibility, setVisibility] = useState<"public" | "admin_only">(
    agent?.visibility || "admin_only"
  );
  const [enabledTools, setEnabledTools] = useState<string[]>(parseEnabledTools());

  const toggleTool = (slug: string) => {
    setEnabledTools((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!systemPrompt.trim()) {
      toast.error("System prompt is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = mode === "create" ? "/api/admin/agents" : `/api/admin/agents/${agent?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      // Build tool approvals (all false by default - no human-in-the-loop yet)
      const toolApprovals: Record<string, boolean> = {};
      for (const slug of enabledTools) {
        toolApprovals[slug] = false;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          systemPrompt: systemPrompt.trim(),
          model,
          isDefault,
          visibility,
          enabledTools,
          toolApprovals,
        }),
      });

      const data: { success?: boolean; agent?: Agent; error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save agent");
      }

      toast.success(mode === "create" ? "Agent created" : "Agent updated");
      router.push("/admin/agents");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group tools by category
  const toolsByCategory = AVAILABLE_TOOLS.reduce(
    (acc, tool) => {
      if (!acc[tool.category]) acc[tool.category] = [];
      acc[tool.category].push(tool);
      return acc;
    },
    {} as Record<ToolInfo["category"], ToolInfo[]>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Set the name and description for this agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Research Assistant"
              required
            />
            <p className="text-xs text-muted-foreground">
              A descriptive name for the agent shown to users
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Helps with research and finding information"
            />
            <p className="text-xs text-muted-foreground">
              Optional description shown in the agent selector
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is-default">Default Agent</Label>
              <p className="text-xs text-muted-foreground">
                Use this agent for new chats by default
              </p>
            </div>
            <Switch
              id="is-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="visibility">Public</Label>
              <p className="text-xs text-muted-foreground">
                {visibility === "public"
                  ? "Available to all users"
                  : "Only visible to admins (for testing)"}
              </p>
            </div>
            <Switch
              id="visibility"
              checked={visibility === "public"}
              onCheckedChange={(checked) => setVisibility(checked ? "public" : "admin_only")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
          <CardDescription>
            Configure the model and system prompt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <span>{m.name}</span>
                      <span className="text-xs text-muted-foreground">({m.provider})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The AI model to use for this agent
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful AI assistant..."
              rows={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              Instructions that define the agent&apos;s personality and behavior
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tools</CardTitle>
          <CardDescription>
            Enable tools that this agent can use during conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(toolsByCategory).map(([category, tools]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={CATEGORY_INFO[category as ToolInfo["category"]].color}>
                  {CATEGORY_INFO[category as ToolInfo["category"]].label}
                </Badge>
              </div>
              <div className="space-y-2">
                {tools.map((tool) => (
                  <div
                    key={tool.slug}
                    className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`tool-${tool.slug}`}
                      checked={enabledTools.includes(tool.slug)}
                      onCheckedChange={() => toggleTool(tool.slug)}
                    />
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor={`tool-${tool.slug}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {tool.name}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {AVAILABLE_TOOLS.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No tools available yet.
            </p>
          )}
          {enabledTools.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {enabledTools.length} tool{enabledTools.length !== 1 ? "s" : ""} enabled
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === "create" ? "Create Agent" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/agents")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
