"use client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

import { useMemo, useState } from "react";

type Scores = {
  score: number;
  soa_mentioned: boolean;

  benefits_status: "none" | "partial" | "full";
  benefits_mentioned: boolean;
  benefits_reviewed: boolean;
  benefit_terms_found: string[];
  benefit_terms_missing: string[];

  intro?: {
    status: "none" | "partial" | "full";
    components_found: {
      licensed_agent: boolean;
      recorded_line: boolean;
      medicare_check: boolean;
      other_coverage: boolean;
    };
    missing: string[];
  };
  healthcare_decisions_asked?: boolean;
  referral_asked?: boolean;
  review_requested?: boolean;

  word_count: number;
  questions: number;
  tie_downs: number;

  filler_total: number;
  top_fillers: Array<[string, number]>;

  objection_hits: number;
  rebuttal_hits: number;
  objections_handled?: number;
  objections_missed?: number;

  avg_sentence_words: number;
  exclaims: number;

  energy?: {
    overall: number;
    label: string;
    speech_pace: {
      score: number;
      words_per_sec: number;
      label: string;
    };
    enthusiasm: {
      score: number;
      words_found: string[];
      count: number;
    };
    confidence: {
      score: number;
      words_found: string[];
      count: number;
    };
    engagement: {
      score: number;
      phrases_found: string[];
      questions: number;
    };
    hedge_penalty: {
      score: number;
      words_found: string[];
      count: number;
    };
    variation: {
      score: number;
      std_dev: number;
    };
  };

  pauses?: {
    total_pauses: number;
    total_pause_time: number;
    long_pauses: number;
    avg_pause: number;
  };

  evidence: {
    soa: Array<{ timestamp: number; speaker: string; text: string }>;
    intro?: Array<{ timestamp: number; speaker: string; component: string; text: string }>;
    healthcare_decisions?: Array<{ timestamp: number; speaker: string; text: string }>;
    referral?: Array<{ timestamp: number; speaker: string; text: string }>;
    review?: Array<{ timestamp: number; speaker: string; text: string }>;
    fillers: Array<{ timestamp: number; speaker: string; filler: string; text: string }>;
    tie_downs: Array<{ timestamp: number; speaker: string; phrase: string; text: string }>;
    objections: Array<{ timestamp: number; speaker: string; phrase: string; text: string }>;
    rebuttals: Array<{ timestamp: number; speaker: string; phrase: string; text: string }>;
    objection_responses?: Array<{
      objection_timestamp: number;
      objection_phrase: string;
      objection_text: string;
      response_timestamp: number;
      response_phrase: string;
      response_text: string;
    }>;
    benefits: Array<{ timestamp: number; speaker: string; term: string; text: string }>;
    pauses?: Array<{
      timestamp: number;
      duration: number;
      before_speaker: string;
      after_speaker: string;
      before_text: string;
      after_text: string;
    }>;
  };
};

type TalkRatio = {
  total_seconds: number;
  speaker_seconds: { [key: string]: number };
  agent_speaker: string;
  agent_seconds: number;
  customer_seconds: number;
  agent_pct: number;
  customer_pct: number;
};

type UploadResult = {
  call_id: string;
  rep_name: string;
  call_type: string;
  status: string;
  transcript: string;
  scores: Scores;
  diarization_enabled: boolean;
  diarization_error: string | null;
  talk_ratio: TalkRatio | null;
  talk_coaching: string[];
  filename?: string;
  voice_tone?: { pitch_variation: number; label: string };
  warmth?: {                                                 
    score: number;
    mirroring: number;
    name_usage: number;
    empathy_phrases: number;
    interruptions: number;
    label: string;
};

type ScoreFactor = {
  label: string;
  impact: number;
  type: "positive" | "negative";
};

type BatchStatus = {
  total: number;
  completed: number;
  current: string;
  results: UploadResult[];
  errors: Array<{ filename: string; error: string }>;
};

function Badge({
  label,
  variant = "neutral",
}: {
  label: string;
  variant?: "good" | "bad" | "warn" | "neutral";
}) {
  const style: React.CSSProperties = useMemo(() => {
    const base: React.CSSProperties = {
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      border: "1px solid #ddd",
    };
    if (variant === "good") return { ...base, background: "#eaffea", borderColor: "#b7e3b7" };
    if (variant === "bad") return { ...base, background: "#ffecec", borderColor: "#f0b3b3" };
    if (variant === "warn") return { ...base, background: "#fff6e5", borderColor: "#f1d39a" };
    return { ...base, background: "#f5f5f5" };
  }, [variant]);

  return <span style={style}>{label}</span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: 14,
        padding: 16,
        background: "white",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>{title}</div>
      {children}
    </section>
  );
}

function EnergyBar({ label, score, detail }: { label: string; score: number; detail?: string }) {
  const getColor = (s: number) => {
    if (s >= 75) return "#22c55e";
    if (s >= 50) return "#eab308";
    return "#ef4444";
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{score}</span>
      </div>
      <div style={{ width: "100%", background: "#e5e5e5", borderRadius: 999, height: 8 }}>
        <div
          style={{
            width: `${Math.min(100, score)}%`,
            background: getColor(score),
            height: 8,
            borderRadius: 999,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      {detail && (
        <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{detail}</div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function calculateScoreFactors(scores: Scores): { top: ScoreFactor[]; bottom: ScoreFactor[] } {
  const factors: ScoreFactor[] = [];

  const questionBonus = Math.min(20, (scores.questions || 0) * 3);
  if (questionBonus > 0) {
    factors.push({ label: `Discovery Questions (${scores.questions})`, impact: questionBonus, type: "positive" });
  }

  const rebuttalBonus = Math.min(16, (scores.rebuttal_hits || 0) * 8);
  if (rebuttalBonus > 0) {
    factors.push({ label: `Rebuttals (${scores.rebuttal_hits})`, impact: rebuttalBonus, type: "positive" });
  }

  const tiedownBonus = Math.min(10, (scores.tie_downs || 0) * 2);
  if (tiedownBonus > 0) {
    factors.push({ label: `Tie-downs (${scores.tie_downs})`, impact: tiedownBonus, type: "positive" });
  }

  if (scores.soa_mentioned) {
    factors.push({ label: "SOA Mentioned", impact: 8, type: "positive" });
  } else {
    factors.push({ label: "SOA Missing", impact: -20, type: "negative" });
  }

  if (scores.benefits_status === "full") {
    factors.push({ label: "Full Benefits Review", impact: 8, type: "positive" });
  } else if (scores.benefits_status === "partial") {
    factors.push({ label: "Partial Benefits Review", impact: -10, type: "negative" });
  } else {
    factors.push({ label: "No Benefits Review", impact: -20, type: "negative" });
  }

  if (scores.intro) {
    if (scores.intro.status === "full") {
      factors.push({ label: "Complete Intro", impact: 5, type: "positive" });
    } else if (scores.intro.status === "partial") {
      factors.push({ label: "Incomplete Intro", impact: -5, type: "negative" });
    } else {
      factors.push({ label: "Missing Intro", impact: -10, type: "negative" });
    }
  }

  if (scores.healthcare_decisions_asked) {
    factors.push({ label: "Healthcare Decisions Asked", impact: 3, type: "positive" });
  }

  if (scores.referral_asked) {
    factors.push({ label: "Referral Ask", impact: 3, type: "positive" });
  }

  if (scores.review_requested) {
    factors.push({ label: "Review Request", impact: 2, type: "positive" });
  }

  const fillerPenalty = Math.min(20, (scores.filler_total || 0) * 2);
  if (fillerPenalty > 0) {
    factors.push({ label: `Filler Words (${scores.filler_total})`, impact: -fillerPenalty, type: "negative" });
  }

  if (scores.avg_sentence_words > 22) {
    factors.push({ label: "Rambling Sentences", impact: -5, type: "negative" });
  }

  if (scores.pauses && scores.pauses.long_pauses > 2) {
    factors.push({ label: `Long Pauses (${scores.pauses.long_pauses})`, impact: -5, type: "negative" });
  }

  if (scores.objections_missed && scores.objections_missed > 0) {
    const missedPenalty = Math.min(10, scores.objections_missed * 5);
    factors.push({ label: `Missed Objections (${scores.objections_missed})`, impact: -missedPenalty, type: "negative" });
  }

  const positiveFactors = factors.filter((f) => f.type === "positive").sort((a, b) => b.impact - a.impact);
  const negativeFactors = factors.filter((f) => f.type === "negative").sort((a, b) => a.impact - b.impact);

  return {
    top: positiveFactors.slice(0, 3),
    bottom: negativeFactors.slice(0, 3),
  };
}

function exportToCSV(results: UploadResult[]) {
  const headers = [
    "Filename", "Rep Name", "Call Type", "Score", "SOA", "Benefits", "Intro",
    "Healthcare Decisions", "Referral Ask", "Review Request", "Questions",
    "Tie-downs", "Fillers", "Objections", "Rebuttals", "Energy", "Talk Ratio Agent %"
  ];
  
  const rows = results.map(r => [
    r.filename || r.call_id,
    r.rep_name || "",
    r.call_type || "",
    r.scores.score,
    r.scores.soa_mentioned ? "Yes" : "No",
    r.scores.benefits_status,
    r.scores.intro?.status || "N/A",
    r.scores.healthcare_decisions_asked ? "Yes" : "No",
    r.scores.referral_asked ? "Yes" : "No",
    r.scores.review_requested ? "Yes" : "No",
    r.scores.questions,
    r.scores.tie_downs,
    r.scores.filler_total,
    r.scores.objection_hits,
    r.scores.rebuttal_hits,
    r.scores.energy?.overall || "N/A",
    r.talk_ratio?.agent_pct || "N/A"
  ]);

  const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `call_grades_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export default function Home() {
  const [mode, setMode] = useState<"single" | "batch">("single");
  
  // Single upload state
  const [file, setFile] = useState<File | null>(null);
  const [repName, setRepName] = useState("");
  const [callType, setCallType] = useState("");
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  // Batch upload state
// Batch upload state
  const [batchFiles, setBatchFiles] = useState<Array<{ file: File; repName: string; callType: string }>>([]);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedResult, setSelectedResult] = useState<UploadResult | null>(null);

  async function handleUpload() {
    setStatus("");
    setResult(null);
    setRawError(null);

    if (!file) {
      setStatus("Pick an audio file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("rep_name", repName);
    formData.append("call_type", callType);

    setStatus("Uploading / transcribing… (big files take a bit)");

    try {
      const res = await fetch(`${API_BASE}/calls`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        setStatus(`Upload failed: ${res.status} ${res.statusText}`);
        setRawError(text);
        return;
      }

      const data = (await res.json()) as UploadResult;
      setResult(data);
      setStatus("Done.");
    } catch (err: any) {
      setStatus("Upload failed (network error). Is the backend running?");
      setRawError(String(err));
    }
  }

async function handleBatchUpload() {
    if (batchFiles.length === 0) return;

    setIsProcessing(true);
    setSelectedResult(null);
    
    const status: BatchStatus = {
      total: batchFiles.length,
      completed: 0,
      current: "",
      results: [],
      errors: [],
    };
    setBatchStatus(status);

    for (const item of batchFiles) {
      status.current = item.file.name;
      setBatchStatus({ ...status });

      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("rep_name", item.repName);
      formData.append("call_type", item.callType);

      try {
        const res = await fetch(`${API_BASE}/calls`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          status.errors.push({ filename: item.file.name, error: `${res.status} ${res.statusText}` });
        } else {
          const data = (await res.json()) as UploadResult;
          data.filename = item.file.name;
          status.results.push(data);
        }
      } catch (err: any) {
        status.errors.push({ filename: item.file.name, error: String(err) });
      }

      status.completed += 1;
      setBatchStatus({ ...status });
    }

    status.current = "";
    setBatchStatus({ ...status });
    setIsProcessing(false);
  }

  const scoreVariant =
    result?.scores.score == null
      ? "neutral"
      : result.scores.score >= 80
      ? "good"
      : result.scores.score >= 60
      ? "warn"
      : "bad";

  const scoreFactors = result ? calculateScoreFactors(result.scores) : null;
  
  const displayResult = selectedResult || result;
  const displayScoreVariant =
    displayResult?.scores.score == null
      ? "neutral"
      : displayResult.scores.score >= 80
      ? "good"
      : displayResult.scores.score >= 60
      ? "warn"
      : "bad";
  const displayScoreFactors = displayResult ? calculateScoreFactors(displayResult.scores) : null;

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "40px auto",
        padding: 16,
        fontFamily: "system-ui",
        background: "white",
        color: "#8a00c2",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: "1px solid #e5e5e5",
        }}
      >
       <img src="/logo.png" alt="Logo" width={170} height={170} />

        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: "#8a00c2" }}>
            Sales Call Grader
          </h1>
          <p style={{ marginTop: 6, color: "#8a00c2", opacity: 0.65 }}>
            Upload an audio file. Get transcript + an explainable scorecard.
          </p>
        </div>
      </header>

      {/* Mode Toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setMode("single")}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "1px solid #8a00c2",
            background: mode === "single" ? "#8a00c2" : "white",
            color: mode === "single" ? "white" : "#8a00c2",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Single Upload
        </button>
        <button
          onClick={() => setMode("batch")}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "1px solid #8a00c2",
            background: mode === "batch" ? "#8a00c2" : "white",
            color: mode === "batch" ? "white" : "#8a00c2",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Batch Upload
        </button>
      </div>

      {/* Single Upload Mode */}
      {mode === "single" && (
        <>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              Rep name
              <input
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                placeholder="e.g., tank5"
                style={{ width: "100%", padding: 10 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              Call type
              <input
                value={callType}
                onChange={(e) => setCallType(e.target.value)}
                placeholder="e.g., Medicare, inbound, outbound"
                style={{ width: "100%", padding: 10 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
              Audio file (.mp3 / .wav)
              <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>

            <button
              onClick={handleUpload}
              style={{
                gridColumn: "1 / -1",
                padding: "12px 14px",
                fontWeight: 900,
                cursor: "pointer",
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "white",
              }}
            >
              Upload & Score
            </button>

            {status && (
              <div style={{ gridColumn: "1 / -1", padding: 12, background: "#f5f5f5", borderRadius: 12 }}>
                <strong>Status:</strong> {status}
              </div>
            )}

            {rawError && (
              <pre
                style={{
                  gridColumn: "1 / -1",
                  padding: 12,
                  background: "#111",
                  color: "#f55",
                  borderRadius: 12,
                  overflowX: "auto",
                }}
              >
                {rawError}
              </pre>
            )}
          </div>
        </>
      )}

     {/* Batch Upload Mode */}
      {mode === "batch" && (
        <div style={{ marginTop: 18 }}>
          <label
            style={{
              display: "block",
              padding: 40,
              border: "2px dashed #8a00c2",
              borderRadius: 12,
              textAlign: "center",
              cursor: "pointer",
              background: batchFiles.length > 0 ? "#f9f5fc" : "white",
            }}
          >
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setBatchFiles(files.map(f => ({ file: f, repName: "", callType: "" })));
              }}
              style={{ display: "none" }}
            />
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              {batchFiles.length > 0
                ? `${batchFiles.length} files selected`
                : "Click or drag audio files here"}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Supports .mp3, .wav, .m4a, .ogg
            </div>
          </label>

          {/* File List with Editable Fields */}
          {batchFiles.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 14 }}>Files to Process</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      const name = prompt("Set rep name for all files:");
                      if (name !== null) {
                        setBatchFiles(batchFiles.map(f => ({ ...f, repName: name })));
                      }
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #8a00c2",
                      background: "white",
                      color: "#8a00c2",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    Set All Rep Names
                  </button>
                  <button
                    onClick={() => {
                      const type = prompt("Set call type for all files:");
                      if (type !== null) {
                        setBatchFiles(batchFiles.map(f => ({ ...f, callType: type })));
                      }
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #8a00c2",
                      background: "white",
                      color: "#8a00c2",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    Set All Call Types
                  </button>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ padding: 8, textAlign: "left", width: "40%" }}>Filename</th>
                    <th style={{ padding: 8, textAlign: "left", width: "25%" }}>Rep Name</th>
                    <th style={{ padding: 8, textAlign: "left", width: "25%" }}>Call Type</th>
                    <th style={{ padding: 8, textAlign: "center", width: "10%" }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {batchFiles.map((item, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 8 }}>{item.file.name}</td>
                      <td style={{ padding: 8 }}>
                        <input
                          value={item.repName}
                          onChange={(e) => {
                            const updated = [...batchFiles];
                            updated[i].repName = e.target.value;
                            setBatchFiles(updated);
                          }}
                          placeholder="Rep name"
                          style={{ width: "100%", padding: 6, fontSize: 12 }}
                        />
                      </td>
                      <td style={{ padding: 8 }}>
                        <input
                          value={item.callType}
                          onChange={(e) => {
                            const updated = [...batchFiles];
                            updated[i].callType = e.target.value;
                            setBatchFiles(updated);
                          }}
                          placeholder="Call type"
                          style={{ width: "100%", padding: 6, fontSize: 12 }}
                        />
                      </td>
                      <td style={{ padding: 8, textAlign: "center" }}>
                        <button
                          onClick={() => setBatchFiles(batchFiles.filter((_, idx) => idx !== i))}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            border: "none",
                            background: "#ffecec",
                            color: "#c00",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={handleBatchUpload}
            disabled={batchFiles.length === 0 || isProcessing}
            style={{
              marginTop: 16,
              padding: "12px 24px",
              fontWeight: 900,
              cursor: batchFiles.length === 0 || isProcessing ? "not-allowed" : "pointer",
              borderRadius: 12,
              border: "none",
              background: batchFiles.length === 0 || isProcessing ? "#ccc" : "#8a00c2",
              color: "white",
              fontSize: 14,
            }}
          >
            {isProcessing ? "Processing..." : `Process ${batchFiles.length} Files`}
          </button>

          {/* Progress */}
          {batchStatus && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontWeight: 700 }}>Progress: {batchStatus.completed} / {batchStatus.total}</span>
                {batchStatus.current && (
                  <span style={{ color: "#666" }}>Processing: {batchStatus.current}</span>
                )}
              </div>
              <div style={{ width: "100%", background: "#e5e5e5", borderRadius: 999, height: 12 }}>
                <div
                  style={{
                    width: `${(batchStatus.completed / batchStatus.total) * 100}%`,
                    background: "#8a00c2",
                    height: 12,
                    borderRadius: 999,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* Results Table */}
          {batchStatus && batchStatus.results.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Results ({batchStatus.results.length} calls)</h3>
                <button
                  onClick={() => exportToCSV(batchStatus.results)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid #8a00c2",
                    background: "white",
                    color: "#8a00c2",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  📥 Export CSV
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#8a00c2", color: "white" }}>
                      <th style={{ padding: 10, textAlign: "left" }}>File</th>
                      <th style={{ padding: 10, textAlign: "left" }}>Rep</th>
                      <th style={{ padding: 10, textAlign: "center" }}>Score</th>
                      <th style={{ padding: 10, textAlign: "center" }}>SOA</th>
                      <th style={{ padding: 10, textAlign: "center" }}>Benefits</th>
                      <th style={{ padding: 10, textAlign: "center" }}>Intro</th>
                      <th style={{ padding: 10, textAlign: "center" }}>Energy</th>
                      <th style={{ padding: 10, textAlign: "center" }}>Talk %</th>
                      <th style={{ padding: 10, textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchStatus.results.map((r, i) => (
                      <tr
                        key={r.call_id}
                        style={{
                          background: i % 2 === 0 ? "white" : "#f9f9f9",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedResult(r)}
                      >
                        <td style={{ padding: 10 }}>{r.filename || r.call_id.slice(0, 8)}</td>
                        <td style={{ padding: 10 }}>{r.rep_name || "—"}</td>
                        <td style={{ padding: 10, textAlign: "center" }}>
                          <Badge
                            label={String(r.scores.score)}
                            variant={r.scores.score >= 80 ? "good" : r.scores.score >= 60 ? "warn" : "bad"}
                          />
                        </td>
                        <td style={{ padding: 10, textAlign: "center" }}>
                          <Badge label={r.scores.soa_mentioned ? "✓" : "✗"} variant={r.scores.soa_mentioned ? "good" : "bad"} />
                        </td>
                        <td style={{ padding: 10, textAlign: "center" }}>
                          <Badge
                            label={r.scores.benefits_status}
                            variant={r.scores.benefits_status === "full" ? "good" : r.scores.benefits_status === "partial" ? "warn" : "bad"}
                          />
                        </td>
                        <td style={{ padding: 10, textAlign: "center" }}>
                          <Badge
                            label={r.scores.intro?.status || "N/A"}
                            variant={r.scores.intro?.status === "full" ? "good" : r.scores.intro?.status === "partial" ? "warn" : "bad"}
                          />
                        </td>
                        <td style={{ padding: 10, textAlign: "center" }}>{r.scores.energy?.overall || "N/A"}</td>
                        <td style={{ padding: 10, textAlign: "center" }}>{r.talk_ratio?.agent_pct || "N/A"}%</td>
                        <td style={{ padding: 10, textAlign: "center" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`${API_BASE}/calls/${r.call_id}/pdf`, "_blank");

                            }}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 4,
                              border: "1px solid #8a00c2",
                              background: "white",
                              color: "#8a00c2",
                              cursor: "pointer",
                              fontSize: 11,
                            }}
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Errors */}
              {batchStatus.errors.length > 0 && (
                <div style={{ marginTop: 16, padding: 12, background: "#ffecec", borderRadius: 8 }}>
                  <strong style={{ color: "#c00" }}>Errors ({batchStatus.errors.length}):</strong>
                  <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
                    {batchStatus.errors.map((e, i) => (
                      <li key={i}>{e.filename}: {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results Detail View */}
      {displayResult && (
        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          
          {selectedResult && (
            <div style={{ gridColumn: "1 / -1", marginBottom: 8 }}>
              <button
                onClick={() => setSelectedResult(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                ← Back to table
              </button>
              <span style={{ marginLeft: 12, fontWeight: 700 }}>
                Viewing: {selectedResult.filename || selectedResult.call_id}
              </span>
            </div>
          )}

          {/* Overall Score */}
          <Card title="Overall Score">
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ fontSize: 56, fontWeight: 950, lineHeight: 1 }}>{displayResult.scores.score}</div>
              <div style={{ flex: 1 }}>
                <Badge label={`Score tier: ${displayScoreVariant.toUpperCase()}`} variant={displayScoreVariant as any} />
                
                <div style={{ marginTop: 12, color: "#444", fontSize: 12 }}>
                  <div><strong>Call ID:</strong> {displayResult.call_id}</div>
                  <div><strong>Rep:</strong> {displayResult.rep_name || "—"} | <strong>Type:</strong> {displayResult.call_type || "—"}</div>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Badge label={`Questions: ${displayResult.scores.questions}`} />
                  <Badge label={`Tie-downs: ${displayResult.scores.tie_downs}`} />
                  <Badge label={`Fillers: ${displayResult.scores.filler_total}`} variant={displayResult.scores.filler_total >= 8 ? "warn" : "neutral"} />
                  <Badge label={`Objections: ${displayResult.scores.objection_hits}`} />
                  <Badge label={`Rebuttals: ${displayResult.scores.rebuttal_hits}`} />
                </div>
              </div>
            </div>

            {displayScoreFactors && (
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "#eaffea", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#2d6a2d", marginBottom: 6 }}>TOP 3 FACTORS</div>
                  {displayScoreFactors.top.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#333" }}>
                      {displayScoreFactors.top.map((f, i) => (
                        <li key={i}>{f.label} <span style={{ color: "#2d6a2d" }}>+{f.impact}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 12, color: "#666" }}>No positive factors</div>
                  )}
                </div>
                <div style={{ background: "#ffecec", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#8b2d2d", marginBottom: 6 }}>BOTTOM 3 FACTORS</div>
                  {displayScoreFactors.bottom.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#333" }}>
                      {displayScoreFactors.bottom.map((f, i) => (
                        <li key={i}>{f.label} <span style={{ color: "#8b2d2d" }}>{f.impact}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 12, color: "#666" }}>No negative factors</div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => window.open(`https://helene-unexcepted-nondialectally.ngrok-free.dev/calls/${displayResult.call_id}/pdf`, '_blank')}
              style={{
                marginTop: 16,
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: "#8a00c2",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              📄 Download PDF Scorecard
            </button>
          </Card>

          {/* Talk Ratio */}
          {displayResult.diarization_enabled && displayResult.talk_ratio ? (
            <Card title="Talk Ratio (Agent vs Customer)">
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700 }}>Agent ({displayResult.talk_ratio.agent_speaker})</span>
                    <span style={{ fontWeight: 700 }}>{displayResult.talk_ratio.agent_pct}%</span>
                  </div>
                  <div style={{ width: "100%", background: "#e5e5e5", borderRadius: 999, height: 12 }}>
                    <div
                      style={{
                        width: `${displayResult.talk_ratio.agent_pct}%`,
                        background: "#8a00c2",
                        height: 12,
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700 }}>Customer</span>
                    <span style={{ fontWeight: 700 }}>{displayResult.talk_ratio.customer_pct}%</span>
                  </div>
                  <div style={{ width: "100%", background: "#e5e5e5", borderRadius: 999, height: 12 }}>
                    <div
                      style={{
                        width: `${displayResult.talk_ratio.customer_pct}%`,
                        background: "#4ade80",
                        height: 12,
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "#666" }}>
                  Total duration: {displayResult.talk_ratio.total_seconds}s
                </div>

                {displayResult.talk_coaching && displayResult.talk_coaching.length > 0 && (
                  <div style={{ marginTop: 8, padding: 8, background: "#f5f5f5", borderRadius: 8, fontSize: 12 }}>
                    <strong>Coaching:</strong>
                    <ul style={{ margin: "4px 0 0 0", paddingLeft: 16 }}>
                      {displayResult.talk_coaching.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card title="Talk Ratio">
              <div style={{ fontSize: 13, color: "#666" }}>
                <p style={{ marginBottom: 8 }}>⚠️ Speaker separation unavailable</p>
                {displayResult.diarization_error && (
                  <div style={{ fontSize: 12, background: "#fff6e5", padding: 8, borderRadius: 8, border: "1px solid #f1d39a" }}>
                    {displayResult.diarization_error}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Agent Energy */}
          {displayResult.scores.energy && (
            <Card title="Agent Energy">
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 52, fontWeight: 950, lineHeight: 1 }}>{displayResult.scores.energy.overall}</div>
                  <Badge
                    label={displayResult.scores.energy.label}
                    variant={
                      displayResult.scores.energy.overall >= 75 ? "good" :
                      displayResult.scores.energy.overall >= 50 ? "neutral" : "warn"
                    }
                  />
                </div>
                
                <div style={{ flex: 1 }}>
                  <EnergyBar 
                    label="Speech Pace" 
                    score={displayResult.scores.energy.speech_pace.score} 
                    detail={`${displayResult.scores.energy.speech_pace.words_per_sec} words/sec • ${displayResult.scores.energy.speech_pace.label}`}
                  />
                  <EnergyBar 
                    label="Enthusiasm" 
                    score={displayResult.scores.energy.enthusiasm.score}
                    detail={displayResult.scores.energy.enthusiasm.words_found.length > 0 
                      ? `Found: ${displayResult.scores.energy.enthusiasm.words_found.slice(0, 5).join(", ")}` 
                      : "No enthusiasm words detected"}
                  />
                  <EnergyBar 
                    label="Confidence" 
                    score={displayResult.scores.energy.confidence.score}
                    detail={displayResult.scores.energy.confidence.words_found.length > 0 
                      ? `Found: ${displayResult.scores.energy.confidence.words_found.slice(0, 5).join(", ")}` 
                      : "No confidence words detected"}
                  />
                  <EnergyBar 
                    label="Engagement" 
                    score={displayResult.scores.energy.engagement.score}
                    detail={`${displayResult.scores.energy.engagement.questions} questions asked`}
                  />
                  <EnergyBar 
                    label="Variation" 
                    score={displayResult.scores.energy.variation.score}
                    detail={`Sentence length std dev: ${displayResult.scores.energy.variation.std_dev}`}
                  />
                  <EnergyBar 
                    label="Pitch Variation" 
                    score={displayResult.voice_tone?.pitch_variation || 0}
                    detail={displayResult.voice_tone?.label || ""}
                  />
                  <EnergyBar 
                    label="Warmth" 
                    score={displayResult.scores.energy?.warmth_score || 0}
                    detail={displayResult.warmth?.label || ""}
                  />
                </div>
              </div>

              {displayResult.scores.energy.hedge_penalty.count > 0 && (
                <div style={{ marginTop: 12, padding: 10, background: "#fff6e5", borderRadius: 8, fontSize: 12, border: "1px solid #f1d39a" }}>
                  <strong style={{ color: "#92400e" }}>⚠️ Hedge Word Penalty: -{displayResult.scores.energy.hedge_penalty.score}</strong>
                  <div style={{ marginTop: 4, color: "#666" }}>
                    Found {displayResult.scores.energy.hedge_penalty.count}x: {displayResult.scores.energy.hedge_penalty.words_found.slice(0, 8).join(", ")}
                  </div>
                </div>
              )}

              {displayResult.scores.pauses && displayResult.scores.pauses.total_pauses > 0 && (
                <div style={{ marginTop: 12, padding: 10, background: "#f5f5f5", borderRadius: 8, fontSize: 12 }}>
                  <strong>Pauses (5s+):</strong> {displayResult.scores.pauses.total_pauses} pauses, {displayResult.scores.pauses.total_pause_time}s total
                  {displayResult.scores.pauses.long_pauses > 0 && (
                    <span style={{ color: "#c00" }}> ({displayResult.scores.pauses.long_pauses} long pauses 8s+)</span>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Voice Tone */}
          {displayResult.voice_tone && (
            <Card title="Voice Tone">
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 52, fontWeight: 950, lineHeight: 1 }}>{displayResult.voice_tone.pitch_variation}</div>
                  <Badge
                    label={displayResult.voice_tone.label}
                    variant={
                      displayResult.voice_tone.pitch_variation >= 70 ? "good" :
                      displayResult.voice_tone.pitch_variation >= 50 ? "neutral" : "warn"
                    }
                  />
                </div>
                <div style={{ flex: 1, fontSize: 13, color: "#666" }}>
                  <p style={{ margin: 0 }}>Pitch variation measures how dynamic vs monotone the agent's voice sounds.</p>
                  <p style={{ margin: "8px 0 0 0" }}>Higher = more engaging, varied tone</p>
                </div>
              </div>
            </Card>
          )}

          {/* Warmth */}
          {displayResult.warmth && (
            <Card title="Warmth Analysis">
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 52, fontWeight: 950, lineHeight: 1 }}>{displayResult.warmth.score}</div>
                  <Badge
                    label={displayResult.warmth.label}
                    variant={
                      displayResult.warmth.score >= 70 ? "good" :
                      displayResult.warmth.score >= 50 ? "neutral" : "warn"
                    }
                  />
                </div>
                
                <div style={{ flex: 1 }}>
                  <EnergyBar 
                    label="Mirroring" 
                    score={displayResult.warmth.mirroring} 
                    detail="Repeating customer's words"
                  />
                  <div style={{ marginTop: 12, fontSize: 12 }}>
                    <div><strong>Name Usage:</strong> {displayResult.warmth.name_usage}x</div>
                    <div><strong>Empathy Phrases:</strong> {displayResult.warmth.empathy_phrases}x</div>
                    <div style={{ color: displayResult.warmth.interruptions > 0 ? "#c00" : "#666" }}>
                      <strong>Interruptions:</strong> {displayResult.warmth.interruptions}x
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Call Timeline */}
          <Card title="Call Timeline">
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {(() => {
                // Collect all timestamped events
                const events: Array<{time: number; type: string; detail: string}> = [];
                const evidence = displayResult.scores.evidence;
                
                evidence?.soa?.forEach((e: any) => events.push({
                  time: e.timestamp, type: "SOA", detail: e.text
                }));
                evidence?.intro?.forEach((e: any) => events.push({
                  time: e.timestamp, type: `Intro: ${e.component}`, detail: e.text
                }));
                evidence?.healthcare_decisions?.forEach((e: any) => events.push({
                  time: e.timestamp, type: "Healthcare Decisions", detail: e.text
                }));
                evidence?.referral?.forEach((e: any) => events.push({
                  time: e.timestamp, type: "Referral Ask", detail: e.text
                }));
                evidence?.review?.forEach((e: any) => events.push({
                  time: e.timestamp, type: "Review Request", detail: e.text
                }));
                evidence?.objections?.forEach((e: any) => events.push({
                  time: e.timestamp, type: "Objection", detail: `"${e.phrase}" - ${e.text}`
                }));
                evidence?.rebuttals?.forEach((e: any) => events.push({
                  time: e.timestamp, type: "Rebuttal", detail: `"${e.phrase}" - ${e.text}`
                }));
                evidence?.tie_downs?.forEach((e: any) => events.push({
                  time: e.timestamp, type: "Tie-down", detail: `"${e.phrase}"`
                }));
                evidence?.benefits?.forEach((e: any) => events.push({
                  time: e.timestamp, type: "Benefit", detail: `${e.term}`
                }));
                evidence?.pauses?.forEach((e: any) => events.push({
                  time: e.timestamp, type: "Pause", detail: `${e.duration}s pause`
                }));
                
                // Sort by timestamp
                events.sort((a, b) => a.time - b.time);
                
                if (events.length === 0) {
                  return <div style={{ color: "#666", fontSize: 13 }}>No timestamped events found.</div>;
                }
                
                const formatTime = (secs: number) => {
                  const m = Math.floor(secs / 60);
                  const s = Math.floor(secs % 60);
                  return `${m}:${s.toString().padStart(2, "0")}`;
                };
                
                const typeColors: Record<string, string> = {
                  "SOA": "#22c55e",
                  "Objection": "#ef4444",
                  "Rebuttal": "#22c55e",
                  "Pause": "#eab308",
                  "Tie-down": "#8a00c2",
                  "Benefit": "#3b82f6",
                  "Healthcare Decisions": "#22c55e",
                  "Referral Ask": "#8a00c2",
                  "Review Request": "#8a00c2",
                };
                
                return events.map((e, i) => (
                  <div key={i} style={{
                    display: "flex",
                    gap: 12,
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                    fontSize: 12,
                  }}>
                    <div style={{
                      fontWeight: 700,
                      fontFamily: "monospace",
                      color: "#666",
                      minWidth: 50,
                    }}>
                      {formatTime(e.time)}
                    </div>
                    <div style={{
                      background: typeColors[e.type] || "#888",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      minWidth: 80,
                      textAlign: "center",
                    }}>
                      {e.type}
                    </div>
                    <div style={{ flex: 1, color: "#333" }}>
                      {e.detail}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </Card>

          {/* Compliance Checklist */}
          <Card title="Compliance Checklist">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, background: "#f9f9f9", borderRadius: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Intro</span>
                <Badge
                  label={displayResult.scores.intro?.status?.toUpperCase() || "N/A"}
                  variant={displayResult.scores.intro?.status === "full" ? "good" : displayResult.scores.intro?.status === "partial" ? "warn" : "bad"}
                />
              </div>
              {displayResult.scores.intro?.missing && displayResult.scores.intro.missing.length > 0 && (
                <div style={{ fontSize: 11, color: "#666", marginTop: -6, paddingLeft: 8 }}>
                  Missing: {displayResult.scores.intro.missing.join(", ")}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, background: "#f9f9f9", borderRadius: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Healthcare Decisions</span>
                <Badge
                  label={displayResult.scores.healthcare_decisions_asked ? "ASKED" : "NOT ASKED"}
                  variant={displayResult.scores.healthcare_decisions_asked ? "good" : "bad"}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, background: "#f9f9f9", borderRadius: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>SOA (Scope of Appointment)</span>
                <Badge
                  label={displayResult.scores.soa_mentioned ? "MENTIONED" : "MISSING"}
                  variant={displayResult.scores.soa_mentioned ? "good" : "bad"}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, background: "#f9f9f9", borderRadius: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Benefits Review</span>
                <Badge
                  label={displayResult.scores.benefits_status?.toUpperCase() || "NONE"}
                  variant={displayResult.scores.benefits_status === "full" ? "good" : displayResult.scores.benefits_status === "partial" ? "warn" : "bad"}
                />
              </div>
              {displayResult.scores.benefit_terms_missing && displayResult.scores.benefit_terms_missing.length > 0 && (
                <div style={{ fontSize: 11, color: "#666", marginTop: -6, paddingLeft: 8 }}>
                  Missing: {displayResult.scores.benefit_terms_missing.join(", ")}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, background: "#f9f9f9", borderRadius: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Referral Ask</span>
                <Badge
                  label={displayResult.scores.referral_asked ? "ASKED" : "NOT ASKED"}
                  variant={displayResult.scores.referral_asked ? "good" : "neutral"}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, background: "#f9f9f9", borderRadius: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Review Request</span>
                <Badge
                  label={displayResult.scores.review_requested ? "ASKED" : "NOT ASKED"}
                  variant={displayResult.scores.review_requested ? "good" : "neutral"}
                />
              </div>
            </div>
          </Card>

          {/* Filler Words Summary */}
          <Card title="Filler Words Summary">
            {displayResult.scores.top_fillers && displayResult.scores.top_fillers.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {displayResult.scores.top_fillers.map(([w, n]) => (
                  <li key={w} style={{ marginBottom: 6 }}>
                    <strong>{w}</strong>: {n}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: "#666", fontSize: 13 }}>No fillers detected.</div>
            )}
          </Card>

          {/* Transcript */}
          <Card title="Transcript">
            <button
              onClick={() => setShowTranscript((s) => !s)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {showTranscript ? "Hide transcript" : "Show transcript"}
            </button>

            {showTranscript && (
              <pre
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: "#111",
                  color: "#0f0",
                  borderRadius: 12,
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {displayResult.transcript || "(empty transcript)"}
              </pre>
            )}
          </Card>
        </div>
      )}
    </main>
  );
}