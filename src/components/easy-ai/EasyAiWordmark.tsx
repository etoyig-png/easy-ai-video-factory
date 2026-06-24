import React from "react";
import { EASY_AI_BRAND } from "../../brand/easyAiBrand";

export const EasyAiWordmark: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: compact ? 10 : 16,
      fontFamily: EASY_AI_BRAND.fonts.heading,
      fontWeight: 900,
      letterSpacing: compact ? 1 : 3,
      color: EASY_AI_BRAND.colors.ink,
    }}
  >
    <span
      style={{
        width: compact ? 36 : 54,
        height: compact ? 36 : 54,
        borderRadius: 14,
        background: `linear-gradient(135deg, ${EASY_AI_BRAND.colors.blue}, ${EASY_AI_BRAND.colors.teal})`,
        display: "inline-block",
        boxShadow: "0 12px 24px rgba(23, 107, 206, 0.22)",
      }}
    />
    <span>EASY AI</span>
  </div>
);
