
export function formatBandwidth(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

export function calculateSpeed(bytesTransferred: number, timeInSeconds: number): number {
  return bytesTransferred / timeInSeconds;
}

export function formatLatency(ms: number): string {
  return `${ms.toFixed(0)}ms`;
}
