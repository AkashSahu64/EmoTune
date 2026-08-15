export function hashString(value = 'waveform') {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateWaveform(id, count = 38) {
  const seed = hashString(String(id || 'waveform'));
  return Array.from({ length: count }, (_, index) => {
    const value = Math.sin(seed + index * 0.73) * 10000;
    return 0.2 + (value - Math.floor(value)) * 0.8;
  });
}
