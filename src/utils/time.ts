// Converts a duration like "15m", "2h", "7d" into milliseconds
export function msToMillis(value: string): number {
  const timeRegex = /^(\d+)(ms|s|m|h|d)$/;

  const match = value.match(timeRegex);

  if (!match) {
    throw new Error(
      `Invalid time format: "${value}". Expected formats like "15m", "2h", "7d"`
    );
  }

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 1000 * 60;
    case 'h':
      return amount * 1000 * 60 * 60;
    case 'd':
      return amount * 1000 * 60 * 60 * 24;
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
}
