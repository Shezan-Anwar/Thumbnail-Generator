import ThumbnailCard from "./ThumbnailCard";

export default function ThumbnailGrid({ thumbnails }) {
  if (!thumbnails.length) return null;

  return (
    <section className="results">
      <h2 className="results__title">Generated Thumbnails</h2>
      <div className={`results__grid results__grid--${thumbnails.length}`}>
        {thumbnails.map((thumb) => (
          <ThumbnailCard
            key={thumb.styleName}
            styleName={thumb.styleName}
            status={thumb.status}
            imageUrl={thumb.imageUrl}
            variants={thumb.variants}
            error={thumb.error}
          />
        ))}
      </div>
    </section>
  );
}
