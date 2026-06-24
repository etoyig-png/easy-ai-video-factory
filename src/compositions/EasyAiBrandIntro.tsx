import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { EASY_AI_BRAND } from "../brand/easyAiBrand";
import { EASY_AI_CAPTIONS } from "../captions/easyAiCaptions";
import { EasyAiWordmark } from "../components/easy-ai/EasyAiWordmark";
import { SafeCaption } from "../components/easy-ai/SafeCaption";
import { EasyAiBusinessDay } from "../scenes/EasyAiScenes";

export const EasyAiBrandIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const caption = EASY_AI_CAPTIONS.find((item) => frame >= item.startFrame && frame < item.endFrame);
  const isEndCard = frame >= 760;
  const isVertical = height > width;

  return (
    <AbsoluteFill>
      <EasyAiBusinessDay />
      {isEndCard ? (
        <Sequence from={760}>
          <AbsoluteFill style={{ background: EASY_AI_BRAND.colors.white, justifyContent: "center", alignItems: "center", textAlign: "center", padding: Math.min(width, height) * 0.08, fontFamily: EASY_AI_BRAND.fonts.body }}>
            <div style={{ fontSize: isVertical ? 76 : 88, marginBottom: 34 }}><EasyAiWordmark /></div>
            <div style={{ color: EASY_AI_BRAND.colors.ink, fontSize: isVertical ? 46 : 54, lineHeight: 1.12, fontWeight: 850, maxWidth: 1120 }}>{EASY_AI_BRAND.slogan}</div>
            <div style={{ marginTop: 54, color: EASY_AI_BRAND.colors.white, background: EASY_AI_BRAND.colors.blue, borderRadius: 999, padding: "26px 38px", fontSize: isVertical ? 32 : 38, fontWeight: 900, letterSpacing: 1.2 }}>START YOUR FREE BUSINESS ASSESSMENT TODAY</div>
          </AbsoluteFill>
        </Sequence>
      ) : null}
      {caption ? <SafeCaption text={caption.text} /> : null}
    </AbsoluteFill>
  );
};
