/**
 * Tiny color-coded dot that surfaces which backend served a reply.
 * Deliberately small + low-contrast so it's invisible from across a
 * demo room but obvious to the developer inspecting up close.
 *
 *   Naive Bayes        → blue
 *   Neural Network     → cyan
 *   Local LLM (Ollama) → purple
 *   Claude / Anthropic → orange
 *   Fallback / unknown → gray
 */

interface ModelDotProps {
  readonly model: string | null | undefined;
  /** When true (default) the tooltip is the literal model string; otherwise hidden. */
  readonly showTooltip?: boolean;
  readonly className?: string;
}

function classify(model: string | null | undefined): { color: string; label: string } {
  const m = (model || "").toLowerCase();
  if (!m) return { color: "bg-gray-400", label: "Unknown model" };
  if (m.includes("anthropic") || m.includes("claude")) {
    return { color: "bg-orange-400", label: model || "Anthropic" };
  }
  if (m.includes("ollama") || m.includes("llama") || m.includes("local")) {
    return { color: "bg-purple-400", label: model || "Local LLM" };
  }
  if (m.includes("neural") || m === "nn") {
    return { color: "bg-cyan-400", label: model || "Neural Network" };
  }
  if (m.includes("naive") || m.includes("nb") || m.includes("calibrated")) {
    return { color: "bg-blue-400", label: model || "Naive Bayes" };
  }
  if (m.includes("fallback")) {
    return { color: "bg-gray-400", label: model || "Fallback" };
  }
  return { color: "bg-emerald-400", label: model || "" };
}

export function ModelDot({ model, showTooltip = true, className = "" }: ModelDotProps) {
  const { color, label } = classify(model);
  return (
    <span
      title={showTooltip ? label : undefined}
      aria-hidden="true"
      className={`inline-block h-1.5 w-1.5 rounded-full opacity-70 ${color} ${className}`}
    />
  );
}
