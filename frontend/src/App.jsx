import { useEffect, useRef, useState } from "react";
import { uploadHeadshot, createJob, subscribeToJob } from "./Api";
import { STYLE_ORDER } from "./constants";
import Header from "./components/Header";
import UploadZone from "./components/UploadZone";
import ThumbnailGrid from "./components/ThumbnailGrid";
import "./App.css";

function buildInitialThumbnails(count) {
  return STYLE_ORDER.slice(0, count).map((styleName) => ({
    styleName,
    status: "pending",
    imageUrl: null,
    variants: null,
    error: null,
  }));
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [numThumbnails, setNumThumbnails] = useState(2);
  const [headshotFile, setHeadshotFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [headshotUrl, setHeadshotUrl] = useState(null);

  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);

  const streamRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    return () => {
      streamRef.current?.close();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function handleFileSelect(file) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreviewUrl(url);
    setHeadshotFile(file);
    setHeadshotUrl(null);
    setError(null);
  }

  function updateThumbnail(styleName, patch) {
    setThumbnails((prev) =>
      prev.map((t) => (t.styleName === styleName ? { ...t, ...patch } : t))
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!headshotFile) {
      setError("Please upload a headshot image.");
      return;
    }
    if (!prompt.trim()) {
      setError("Please describe your video topic.");
      return;
    }

    streamRef.current?.close();

    try {
      setPhase("uploading");

      let url = headshotUrl;
      if (!url) {
        const uploadResult = await uploadHeadshot(headshotFile);
        url = uploadResult.url;
        setHeadshotUrl(url);
      }

      setPhase("generating");
      setThumbnails(buildInitialThumbnails(numThumbnails));

      const { job_id: jobId } = await createJob({
        prompt: prompt.trim(),
        numThumbnails,
        headshotUrl: url,
      });

      streamRef.current = subscribeToJob(jobId, {
        onThumbnailReady: (data) => {
          updateThumbnail(data.style_name, {
            status: "uploaded",
            imageUrl: data.imagekit_url,
            variants: data.variants,
            error: null,
          });
        },
        onThumbnailFailed: (data) => {
          updateThumbnail(data.style_name, {
            status: "failed",
            error: data.error || "Generation failed",
          });
        },
        onJobComplete: () => {
          setPhase("complete");
        },
        onError: (err) => {
          setError(err?.error || err?.message || "Stream connection lost.");
          setPhase("complete");
        },
      });
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setPhase("idle");
      setThumbnails([]);
    }
  }

  function handleReset() {
    streamRef.current?.close();
    setPhase("idle");
    setThumbnails([]);
    setError(null);
  }

  const isBusy = phase === "uploading" || phase === "generating";
  const showResults = thumbnails.length > 0;

  return (
    <div className="app">
      <Header />

      <main className="main">
        <section className="panel panel--form">
          <h2 className="panel__title">Create Thumbnails</h2>
          <p className="panel__subtitle">
            Upload your face, describe your video, and get up to three styled YouTube thumbnails.
          </p>

          <form className="form" onSubmit={handleSubmit}>
            <div className="form__group">
              <label className="form__label">Your Headshot</label>
              <UploadZone
                previewUrl={previewUrl}
                onFileSelect={handleFileSelect}
                disabled={isBusy}
              />
            </div>

            <div className="form__group">
              <label className="form__label" htmlFor="prompt">
                Video Topic / Prompt
              </label>
              <textarea
                id="prompt"
                className="form__textarea"
                placeholder="e.g. How I built a SaaS app in 30 days and made $10k MRR"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isBusy}
                rows={4}
              />
            </div>

            <div className="form__group">
              <span className="form__label">Number of Styles</span>
              <div className="form__count" role="group" aria-label="Number of thumbnails">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`form__count-btn${numThumbnails === n ? " form__count-btn--active" : ""}`}
                    onClick={() => setNumThumbnails(n)}
                    disabled={isBusy}
                    aria-pressed={numThumbnails === n}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="form__hint">
                Each style produces a unique look — dramatic, minimal, or energetic.
              </p>
            </div>

            {error && (
              <div className="alert alert--error" role="alert">
                {error}
              </div>
            )}

            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={isBusy}>
                {phase === "uploading"
                  ? "Uploading headshot…"
                  : phase === "generating"
                    ? "Generating thumbnails…"
                    : "Generate Thumbnails"}
              </button>

              {showResults && (
                <button type="button" className="btn btn--ghost" onClick={handleReset} disabled={isBusy}>
                  Start Over
                </button>
              )}
            </div>
          </form>
        </section>

        {showResults && (
          <section className="panel panel--results">
            {phase === "generating" && (
              <div className="progress-banner">
                <div className="spinner spinner--sm" aria-hidden="true" />
                <p>AI is crafting your thumbnails — this may take a minute…</p>
              </div>
            )}
            <ThumbnailGrid thumbnails={thumbnails} />
          </section>
        )}
      </main>

      <footer className="footer">
        <p>ThumbForge · Powered by AI image generation</p>
      </footer>
    </div>
  );
}
