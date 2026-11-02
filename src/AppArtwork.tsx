import { useRef, useState } from "react";
import {
  Code2,
  Expand,
  MessageSquare,
  Mic,
  PanelsTopLeft,
  StickyNote,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { CatalogApp } from "./catalog";

export function AppGlyph({
  app,
  size = 20,
}: {
  app: Pick<CatalogApp, "glyph" | "logo" | "logoTreatment">;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (app.logo && !failed) {
    return (
      <img
        className={`project-logo ${app.logoTreatment === "paper" ? "logo-on-paper" : ""}`}
        src={app.logo}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        onError={() => setFailed(true)}
      />
    );
  }
  const Icon = {
    mic: Mic,
    discord: MessageSquare,
    note: StickyNote,
    code: Code2,
    window: PanelsTopLeft,
  }[app.glyph];
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}

export function AppArtwork({ app }: { app: CatalogApp }) {
  return (
    <div className="app-art project-art project-brand-cover">
      <AppGlyph app={app} size={82} />
      <strong>{app.name}</strong>
    </div>
  );
}

export function ProjectGallery({ app }: { app: CatalogApp }) {
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState<string>();
  const dialog = useRef<HTMLDialogElement>(null);
  const images = app.images ?? [];
  const image = images[selected];
  if (!image) return <AppArtwork app={app} />;

  return (
    <section
      className="project-gallery"
      aria-label={`${app.name} project images`}
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) &&
          images.length > 1
        ) {
          event.preventDefault();
          setSelected((value) =>
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? images.length - 1
                : (value +
                    (event.key === "ArrowRight" ? 1 : -1) +
                    images.length) %
                  images.length,
          );
        }
      }}
    >
      <div className="project-stage-wrap">
        <button
          className="project-image-stage"
          disabled={failed === image.src}
          onClick={() => dialog.current?.showModal()}
          aria-label={`Enlarge ${app.name} image: ${image.caption}`}
        >
          {failed === image.src ? (
            <div className="project-art-fallback">
              <AppGlyph app={app} size={64} />
              <span>Preview unavailable</span>
            </div>
          ) : (
            <>
              <img
                src={image.src}
                alt={image.alt}
                decoding="async"
                onError={() => setFailed(image.src)}
              />
              <span className="image-expand">
                <Expand size={15} aria-hidden="true" />
                View image
              </span>
            </>
          )}
        </button>
        {images.length > 1 && (
          <div className="gallery-arrows">
            <button
              className="btn btn-sm btn-square"
              aria-label="Previous project image"
              onClick={() =>
                setSelected(
                  (value) => (value - 1 + images.length) % images.length,
                )
              }
            >
              <ChevronLeft size={19} />
            </button>
            <button
              className="btn btn-sm btn-square"
              aria-label="Next project image"
              onClick={() =>
                setSelected((value) => (value + 1) % images.length)
              }
            >
              <ChevronRight size={19} />
            </button>
          </div>
        )}
      </div>
      <div className="gallery-caption">
        <span>{image.caption}</span>
        <span>
          {selected + 1} / {images.length}
        </span>
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbnails" aria-label="Choose project image">
          {images.map((item, index) => (
            <button
              key={item.src}
              className={selected === index ? "selected" : ""}
              aria-label={`Show ${item.caption}`}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              <img src={item.src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <p className="gallery-version-note">
        Images from the project’s releases and documentation. Your installed
        version may differ.
      </p>
      <dialog
        ref={dialog}
        className="modal image-viewer"
        aria-label={`${app.name} image viewer`}
      >
        <div className="modal-box image-viewer-box">
          <div className="image-viewer-heading">
            <div>
              <strong>{app.name}</strong>
              <p>{image.caption}</p>
            </div>
            <form method="dialog">
              <button
                className="btn btn-sm btn-ghost"
                aria-label="Close image viewer"
              >
                <X size={20} />
              </button>
            </form>
          </div>
          <img className="full-project-image" src={image.src} alt={image.alt} />
          {images.length > 1 && (
            <div className="image-viewer-controls">
              <button
                className="btn btn-sm"
                aria-label="Previous enlarged image"
                onClick={() =>
                  setSelected(
                    (value) => (value - 1 + images.length) % images.length,
                  )
                }
              >
                <ChevronLeft size={17} />
                Previous
              </button>
              <span>
                {selected + 1} / {images.length}
              </span>
              <button
                className="btn btn-sm"
                aria-label="Next enlarged image"
                onClick={() =>
                  setSelected((value) => (value + 1) % images.length)
                }
              >
                Next
                <ChevronRight size={17} />
              </button>
            </div>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>Close image</button>
        </form>
      </dialog>
    </section>
  );
}
