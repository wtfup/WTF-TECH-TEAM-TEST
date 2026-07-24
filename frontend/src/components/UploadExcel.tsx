import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";

type Props = {
  onSuccess: () => void;
};

type Job = {
  id: number;
  status: "processing" | "completed" | "failed";
  total_rows: number;
  processed_rows: number;
  inserted: number;
  merged: number;
  failed: number;
  error?: string | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function UploadExcel({ onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stop polling / setting state if the component unmounts mid-job.
  const cancelled = useRef(false);
  useEffect(() => () => { cancelled.current = true; }, []);

  async function uploadFile() {
    if (!file) return;

    setError(null);
    setJob(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const jobId = res.data.jobId;

      // Poll job status until it finishes — real progress, not an animation.
      // Bounded so a stuck job can never poll forever, and stops on unmount.
      const MAX_POLLS = 4500; // ~60 min at 800 ms — a safety valve, not a normal path
      let polls = 0;
      while (!cancelled.current) {
        const { data } = await api.get<Job>(`/upload/${jobId}`);
        if (cancelled.current) return;
        setJob(data);
        if (data.status === "completed" || data.status === "failed") {
          if (data.status === "failed") {
            setError(data.error || "Ingest failed");
          } else {
            setFile(null);
            onSuccess();
          }
          break;
        }
        if (++polls >= MAX_POLLS) {
          setError("Timed out waiting for the import to finish.");
          break;
        }
        await sleep(800);
      }
    } catch (err) {
      console.error(err);
      if (!cancelled.current) setError("Upload failed. Please try again.");
    } finally {
      if (!cancelled.current) setLoading(false);
    }
  }

  // While streaming, the total row count is unknown until the job completes, so
  // there is no honest percentage — show an indeterminate bar + a live row count
  // rather than a fake 0% or a bar that jumps to 100% at the end.
  const known = !!job && job.total_rows > 0;
  const pct = known
    ? Math.min(100, Math.round((job!.processed_rows / job!.total_rows) * 100))
    : 0;

  return (
    <div style={{ background: "#fff", padding: 25, borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,.08)", marginBottom: 30 }}>
      <h2 style={{ marginTop: 0, marginBottom: 10 }}>Upload Candidates</h2>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Select an Excel (.xlsx or .xls) file to import candidates.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx,.xls"
          style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
          disabled={loading}
          onChange={(e) => {
            if (e.target.files?.length) setFile(e.target.files[0]);
          }}
        />
        <label
          htmlFor="excel-upload"
          style={{
            background: "#f3f4f6", color: "#111827", border: "2px dashed #94a3b8",
            borderRadius: 10, padding: "12px 20px", cursor: loading ? "not-allowed" : "pointer",
            display: "inline-block", fontWeight: 600,
          }}
        >
          Choose Excel File
        </label>

        <button
          onClick={uploadFile}
          disabled={loading || !file}
          style={{
            background: loading || !file ? "#9ca3af" : "#2563eb", color: "#fff", border: "none",
            padding: "10px 18px", borderRadius: 8,
            cursor: loading || !file ? "not-allowed" : "pointer", fontWeight: 600,
          }}
        >
          {loading ? "Uploading..." : "Upload Excel"}
        </button>
      </div>

      {file && !job && (
        <div style={{ marginTop: 20, padding: 12, background: "#f3f4f6", borderRadius: 8, color: "#444" }}>
          <strong>Selected File:</strong> {file.name}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 20, padding: 12, background: "#fef2f2", color: "#b91c1c", borderRadius: 8 }} role="alert">
          {error}
        </div>
      )}

      {job && !error && (
        <div style={{ marginTop: 20 }}>
          {job.status === "processing" && (
            <>
              <div style={{ height: 10, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}>
                {known ? (
                  <div style={{ width: `${pct}%`, height: "100%", background: "#2563eb", transition: "width .3s" }} />
                ) : (
                  <div className="tm-indeterminate" style={{ height: "100%", background: "#2563eb", borderRadius: 6 }} />
                )}
              </div>
              <p style={{ color: "#666", marginTop: 8 }}>
                Processing… {job.processed_rows.toLocaleString()} rows
                {known ? ` of ${job.total_rows.toLocaleString()} (${pct}%)` : " so far"}
              </p>
              <style>{`
                @keyframes tm-indet { 0% { margin-left: -40%; width: 40%; } 50% { width: 55%; } 100% { margin-left: 100%; width: 40%; } }
                .tm-indeterminate { animation: tm-indet 1.2s ease-in-out infinite; }
              `}</style>
            </>
          )}

          {job.status === "completed" && (
            <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8, color: "#166534" }}>
              <strong>Import complete.</strong>{" "}
              Read {job.total_rows} · Inserted {job.inserted} · Merged {job.merged} · Failed {job.failed}
              {job.failed > 0 && " (see failed rows for reasons)"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
