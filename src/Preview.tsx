import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { EasyAiBrandIntro } from "./compositions/EasyAiBrandIntro";
import { EASY_AI_BRAND } from "./brand/easyAiBrand";
import { EASY_AI_DURATION_FRAMES, EASY_AI_FORMATS, EASY_AI_FPS, type EasyAiFormatName } from "./config/videoFormats";

const PREVIEW_MAX_HEIGHT = 720;
const PREVIEW_MAX_WIDTH = 960;

const formatNames = Object.keys(EASY_AI_FORMATS) as EasyAiFormatName[];

const getPreviewScale = (width: number, height: number) =>
  Math.min(PREVIEW_MAX_WIDTH / width, PREVIEW_MAX_HEIGHT / height, 1);

const PreviewApp: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<EasyAiFormatName>("vertical");
  const format = EASY_AI_FORMATS[selectedFormat];
  const scale = useMemo(() => getPreviewScale(format.width, format.height), [format.height, format.width]);

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Remotion browser preview</p>
          <h1 style={styles.title}>Easy AI Phase 1 Video</h1>
          <p style={styles.subtitle}>{EASY_AI_BRAND.slogan}</p>
        </div>
        <div style={styles.cta}>{EASY_AI_BRAND.cta}</div>
      </section>

      <section style={styles.controls} aria-label="Choose a video format">
        {formatNames.map((name) => {
          const option = EASY_AI_FORMATS[name];
          const isSelected = selectedFormat === name;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedFormat(name)}
              style={{
                ...styles.button,
                ...(isSelected ? styles.buttonSelected : null),
              }}
              aria-pressed={isSelected}
            >
              <strong>{option.label}</strong>
              <span>
                {option.width} × {option.height}
              </span>
            </button>
          );
        })}
      </section>

      <section style={styles.playerShell}>
        <Player
          key={format.id}
          component={EasyAiBrandIntro}
          durationInFrames={EASY_AI_DURATION_FRAMES}
          fps={EASY_AI_FPS}
          compositionWidth={format.width}
          compositionHeight={format.height}
          controls
          loop
          style={{
            width: Math.round(format.width * scale),
            height: Math.round(format.height * scale),
            maxWidth: "100%",
            boxShadow: "0 24px 80px rgba(16, 32, 51, 0.22)",
            borderRadius: 18,
            overflow: "hidden",
          }}
        />
      </section>

      <p style={styles.note}>
        This preview uses code-generated dry-run visuals and safe local placeholders only. No paid generation APIs or secrets are used in the browser.
      </p>
    </main>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    margin: 0,
    padding: "40px 24px",
    boxSizing: "border-box",
    background: "linear-gradient(135deg, #DDF1FF 0%, #FFF8EA 100%)",
    color: EASY_AI_BRAND.colors.ink,
    fontFamily: EASY_AI_BRAND.fonts.body,
  },
  header: {
    maxWidth: 1100,
    margin: "0 auto 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 24,
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: "0 0 8px",
    color: EASY_AI_BRAND.colors.blue,
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    fontSize: "clamp(34px, 5vw, 64px)",
    lineHeight: 0.98,
    letterSpacing: -1.8,
  },
  subtitle: {
    margin: "14px 0 0",
    maxWidth: 760,
    color: EASY_AI_BRAND.colors.slate,
    fontSize: 20,
    lineHeight: 1.35,
  },
  cta: {
    background: EASY_AI_BRAND.colors.blue,
    color: EASY_AI_BRAND.colors.white,
    borderRadius: 999,
    padding: "14px 20px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  controls: {
    maxWidth: 1100,
    margin: "0 auto 24px",
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  button: {
    appearance: "none",
    border: `2px solid ${EASY_AI_BRAND.colors.sky}`,
    background: EASY_AI_BRAND.colors.white,
    color: EASY_AI_BRAND.colors.ink,
    borderRadius: 16,
    padding: "14px 18px",
    cursor: "pointer",
    display: "grid",
    gap: 4,
    textAlign: "left",
    minWidth: 180,
    font: "inherit",
  },
  buttonSelected: {
    borderColor: EASY_AI_BRAND.colors.blue,
    boxShadow: "0 10px 30px rgba(23, 107, 206, 0.18)",
  },
  playerShell: {
    maxWidth: 1100,
    margin: "0 auto",
    minHeight: 420,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    borderRadius: 28,
    background: "rgba(255, 255, 255, 0.66)",
    border: "1px solid rgba(255, 255, 255, 0.8)",
  },
  note: {
    maxWidth: 1100,
    margin: "18px auto 0",
    color: EASY_AI_BRAND.colors.slate,
    fontSize: 15,
  },
};

createRoot(document.getElementById("root") as HTMLElement).render(<PreviewApp />);
