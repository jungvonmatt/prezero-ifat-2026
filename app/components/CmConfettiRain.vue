<template>
  <div v-if="active" class="confetti-layer" aria-hidden="true">
    <span v-for="piece in pieces" :key="piece.id" class="confetti-piece" :style="piece.style"></span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

defineProps<{
  active: boolean;
}>();

interface ConfettiPiece {
  id: number;
  style: Record<string, string>;
}

const colors = ['#a5c814', '#00d4ff', '#ffcf33', '#ff5f7a', '#7df56a', '#ffffff'];

// Tuning cheatsheet:
// - Burst radius: adjust base + step in `burstRadius` for overall spread.
// - Start cadence: adjust `% 12` and multiplier in `delay` for denser/looser staggering.
// - Lifetime: adjust `duration` formula for faster/slower motion.
// - Fade softness: lower/higher `fadeX/fadeY` multipliers and final keyframe `scale`.
// - Spin energy: tune `spin` base/step for calmer or more explosive rotation.

const pieces = computed<ConfettiPiece[]>(() => {
  return Array.from({ length: 44 }, (_, index) => {
    // Golden-angle distribution keeps the burst visually even without manual coordinates.
    const angle = ((index * 137.5) % 360) * (Math.PI / 180);
    // Increase/decrease both values to scale the overall burst radius.
    const burstRadius = 180 + (index % 8) * 22;
    const travelX = Math.cos(angle) * burstRadius;
    const travelY = Math.sin(angle) * burstRadius;
    const fadeX = travelX * 1.1;
    const fadeY = travelY * 1.1;
    // Small stagger avoids all particles starting in the same frame.
    const delay = (index % 12) * 0.045;
    const duration = 1 + (index % 6) * 0.2;
    const size = 6 + (index % 6) * 2;
    const rotate = (index * 71) % 360;
    const spin = 420 + (index % 7) * 75;
    const shape = index % 4 === 0 ? '999px' : '2px';
    const color = colors[index % colors.length] ?? '#ffffff';

    return {
      id: index,
      style: {
        '--delay': `${delay}s`,
        '--duration': `${duration}s`,
        '--size': `${size}px`,
        '--tx': `${travelX}px`,
        '--ty': `${travelY}px`,
        '--tx-fade': `${fadeX}px`,
        '--ty-fade': `${fadeY}px`,
        '--rotate': `${rotate}deg`,
        '--spin': `${spin}deg`,
        '--shape': shape,
        '--color': color,
      },
    };
  });
});
</script>

<style scoped lang="scss">
.confetti-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 4;
}

.confetti-piece {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--size);
  height: calc(var(--size) * 0.62);
  border-radius: var(--shape);
  background: var(--color);
  opacity: 0;
  transform: translate(-50%, -50%) rotate(var(--rotate));
  animation: confetti-burst var(--duration) cubic-bezier(0.22, 0.62, 0.24, 1) var(--delay) infinite;
}

@keyframes confetti-burst {
  0% {
    transform: translate(-50%, -50%) scale(0.55) rotate(var(--rotate));
    opacity: 0;
  }

  // Midpoint: particle reaches its visible peak at its radial travel target.
  60% {
    animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1); /* ease-in-out */

    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1)
      rotate(calc(var(--rotate) + var(--spin)));
    opacity: 1;
  }

  // End: only subtle outward drift plus fade, no late "jump".
  100% {
    transform: translate(calc(-50% + var(--tx-fade)), calc(-50% + var(--ty-fade))) scale(1.5)
      rotate(calc(var(--rotate) + var(--spin) + 120deg));
    opacity: 0;
  }
}
</style>
