import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { EASY_AI_BRAND } from "../brand/easyAiBrand";
import { EasyAiWordmark } from "../components/easy-ai/EasyAiWordmark";

const Card: React.FC<{ title: string; detail: string; accent: string }> = ({ title, detail, accent }) => (
  <div style={{ background: "rgba(255,255,255,0.86)", borderRadius: 28, padding: 28, borderLeft: `12px solid ${accent}`, boxShadow: "0 24px 70px rgba(16,32,51,0.16)" }}>
    <div style={{ fontSize: 34, fontWeight: 850, color: EASY_AI_BRAND.colors.ink }}>{title}</div>
    <div style={{ fontSize: 24, marginTop: 10, color: EASY_AI_BRAND.colors.slate }}>{detail}</div>
  </div>
);

export const EasyAiBusinessDay: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isVertical = height > width;
  const progress = frame / 900;
  const ownerX = interpolate(Math.sin(progress * Math.PI * 2), [-1, 1], [-18, 18]);
  const sceneIndex = frame < 210 ? 0 : frame < 420 ? 1 : frame < 660 ? 2 : 3;
  const scenes = [
    { title: "Morning rush", detail: "Customer questions are answered promptly.", accent: EASY_AI_BRAND.colors.blue },
    { title: "Busy team", detail: "Routine follow-ups happen on time in the background.", accent: EASY_AI_BRAND.colors.teal },
    { title: "Owner in control", detail: "Clear updates support better decisions without technical clutter.", accent: EASY_AI_BRAND.colors.amber },
    { title: "Better service", detail: "Prospects, customers, and employees feel supported.", accent: EASY_AI_BRAND.colors.blue },
  ];

  return (
    <AbsoluteFill style={{ background: `linear-gradient(145deg, ${EASY_AI_BRAND.colors.cream}, ${EASY_AI_BRAND.colors.sky})`, overflow: "hidden", fontFamily: EASY_AI_BRAND.fonts.body }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 25% 20%, rgba(255,255,255,0.9), transparent 35%), radial-gradient(circle at 75% 30%, rgba(36,183,165,0.18), transparent 32%)" }} />
      <div style={{ position: "absolute", top: 54, left: 64, fontSize: isVertical ? 38 : 44 }}><EasyAiWordmark compact={isVertical} /></div>
      <div style={{ position: "absolute", left: isVertical ? "9%" : "8%", top: isVertical ? "18%" : "20%", width: isVertical ? "82%" : "40%" }}>
        <Card {...scenes[sceneIndex]} />
      </div>
      <div style={{ position: "absolute", right: isVertical ? "11%" : "10%", bottom: isVertical ? "28%" : "18%", width: isVertical ? 520 : 560, height: isVertical ? 520 : 460, borderRadius: 46, background: "rgba(255,255,255,0.55)", border: "2px solid rgba(255,255,255,0.9)", boxShadow: "0 30px 90px rgba(16,32,51,0.14)" }}>
        <div style={{ position: "absolute", left: 70 + ownerX, top: 88, width: 150, height: 150, borderRadius: "50%", background: "#D9A06F" }} />
        <div style={{ position: "absolute", left: 48 + ownerX, top: 230, width: 200, height: 190, borderRadius: "42px 42px 18px 18px", background: EASY_AI_BRAND.colors.blue }} />
        {[0, 1, 2].map((i) => <div key={i} style={{ position: "absolute", right: 70, top: 86 + i * 104, width: 190, height: 58, borderRadius: 18, background: i === sceneIndex % 3 ? EASY_AI_BRAND.colors.teal : "rgba(56,81,102,0.16)" }} />)}
      </div>
    </AbsoluteFill>
  );
};
