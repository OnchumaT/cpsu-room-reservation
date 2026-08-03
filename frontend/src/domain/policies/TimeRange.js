// TimeRange — value object for a "HH:MM"–"HH:MM" span, with overlap logic
// pulled out of the old inline conflict-checking loop in submitBook().

export class TimeRange {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  static fromLabel(label) {
    const [start, end] = label.includes('–') ? label.split('–') : label.split('-');
    return new TimeRange(start, end);
  }

  isValid() {
    return Boolean(this.start) && Boolean(this.end) && this.start < this.end;
  }

  overlaps(other) {
    // overlap if: thisStart < otherEnd AND thisEnd > otherStart
    return this.start < other.end && this.end > other.start;
  }

  toLabel(separator = '-') {
    return `${this.start}${separator}${this.end}`;
  }
}
