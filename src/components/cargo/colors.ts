const ITEM_COLORS = [
  "hsl(40, 60%, 52%)",
  "hsl(205, 65%, 50%)",
  "hsl(150, 50%, 40%)",
  "hsl(275, 45%, 55%)",
  "hsl(15, 70%, 55%)",
  "hsl(335, 55%, 55%)",
  "hsl(180, 45%, 40%)",
  "hsl(60, 50%, 42%)",
];

export const itemColor = (index: number) => ITEM_COLORS[index % ITEM_COLORS.length];
