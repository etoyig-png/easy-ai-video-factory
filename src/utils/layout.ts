export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const getSafeArea = (width: number, height: number) => {
  const shortest = Math.min(width, height);
  return {
    x: Math.round(shortest * 0.07),
    y: Math.round(shortest * 0.07),
  };
};
