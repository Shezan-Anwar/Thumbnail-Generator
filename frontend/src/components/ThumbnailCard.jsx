import { useState } from "react";
import { STYLE_LABELS, STYLE_DESCRIPTIONS, VARIANT_LABELS } from "../constants";

const STATUS_LABELS = {
  pending: "Queued",
  generating: "Generating…",
  uploaded: "Ready",
  failed: "Failed",
};

export default function ThumbnailCard({ styleName, status, imageUrl, variants, error }) {
  const [activeVariant, setActiveVariant] = useState("youtube");

  const displayUrl =
    variants?.[activeVariant] || imageUrl || null;

  const isLoading = status === "pending" || status === "generating";
  const isFailed = status === "failed";
  const isReady = status === "uploaded" && displayUrl;

  return (
    <article className={`thumb-card thumb-card--${status}`}>
      <div className="thumb-card__header">
        <div>
          <h3 className="thumb-card__style">{STYLE_LABELS[styleName] || styleName}</h3>
          <p className="thumb-card__desc">{STYLE_DESCRIPTIONS[styleName]}</p>
        </div>
        <span className={`thumb-card__badge thumb-card__badge--${status}`}>
          {STATUS_LABELS[status] || status}
        </span>
      </div>

      <div className="thumb-card__frame">
        {isLoading && (
          <div className="thumb-card__loading">
            <div className="spinner" aria-hidden="true" />
            <p>Creating your thumbnail…</p>
          </div>
        )}

        {isFailed && (
          <div className="thumb-card__error">
            <span aria-hidden="true">✕</span>
            <p>{error || "Generation failed. Please try again."}</p>
          </div>
        )}

        {isReady && (
          <img
            src={displayUrl}
            alt={`${STYLE_LABELS[styleName]} thumbnail`}
            className="thumb-card__image"
          />
        )}
      </div>

      {isReady && variants && (
        <div className="thumb-card__footer">
          <div className="thumb-card__variants" role="tablist">
            {Object.keys(VARIANT_LABELS).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeVariant === key}
                className={`thumb-card__variant-btn${activeVariant === key ? " thumb-card__variant-btn--active" : ""}`}
                onClick={() => setActiveVariant(key)}
              >
                {VARIANT_LABELS[key]}
              </button>
            ))}
          </div>
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="thumb-card__download"
            download
          >
            Download
          </a>
        </div>
      )}
    </article>
  );
}
