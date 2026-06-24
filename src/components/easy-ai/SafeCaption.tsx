import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { EASY_AI_BRAND } from "../../brand/easyAiBrand";
import { getSafeArea } from "../../utils/layout";

export const SafeCaption: React.FC<{ text: string }> = ({ text }) => {
  const { width, height } = useVideoConfig();
  const safe = getSafeArea(width, height);
  const isVertical = height > width;
  const fontSize = isVertical ? 40 : Math.max(32, Math.round(width * 0.024));

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: safe.y, paddingLeft: safe.x, paddingRight: safe.x }}>
      <div
        style={{
          maxWidth: isVertical ? "92%" : "78%",
          color: EASY_AI_BRAND.colors.white,
          background: "rgba(16, 32, 51, 0.84)",
          borderRadius: 28,
          padding: `${Math.round(fontSize * 0.55)}px ${Math.round(fontSize * 0.8)}px`,
          fontFamily: EASY_AI_BRAND.fonts.body,
          fontSize,
          lineHeight: 1.22,
          textAlign: "center",
          boxShadow: "0 18px 45px rgba(16, 32, 51, 0.28)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
