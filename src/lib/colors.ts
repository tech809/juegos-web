export const PLAYER_COLORS = [
  "#c0392b", // rojo ladrillo
  "#e67e22", // naranja
  "#f1c40f", // trigo
  "#27ae60", // oveja
  "#2980b9", // agua
  "#8e44ad", // púrpura
  "#16a085", // bosque
  "#7f8c8d", // mineral
];

export function colorForIndex(index: number) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
