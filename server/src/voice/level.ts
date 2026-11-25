/**
 * Tells the caller's own voice from background sound on the line.
 *
 * Speech recognition hears everything: a fan, traffic, a TV, someone else in the room, a cough.
 * The caller, speaking into the phone, is louder than all of that. This meter tracks the line's
 * noise floor (the quiet between words) and counts the 20 ms windows clearly above it, so the agent
 * can ask "was that the caller, for long enough to mean it?" before stopping or answering.
 */
const WIN_MS = 20;
const KEEP_MS = 10_000;
/** Windows this far above the noise floor are the caller speaking into the phone. */
const ABOVE_FLOOR_DB = 10;
/** Quieter than this is never the caller, whatever the floor. */
const MIN_DB = -55;

type Win = { at: number; db: number; loud: boolean };

export class LevelMeter {
  private readonly winBytes: number;
  private carry: Buffer = Buffer.alloc(0);
  private wins: Win[] = [];
  private floor = -60;
  private since = 0;
  /** How loud this caller's accepted turns were, so a quieter voice in the room can be told apart. */
  private voiceDb: number | null = null;

  constructor(sampleRate: number) {
    this.winBytes = (sampleRate / (1000 / WIN_MS)) * 2;
  }

  feed(pcm: Buffer) {
    const buf = this.carry.length ? Buffer.concat([this.carry, pcm]) : pcm;
    let off = 0;
    const now = Date.now();
    for (; off + this.winBytes <= buf.length; off += this.winBytes) {
      let sum = 0;
      for (let i = off; i < off + this.winBytes; i += 2) {
        const s = buf.readInt16LE(i);
        sum += s * s;
      }
      const db = 10 * Math.log10(sum / (this.winBytes / 2) / 32768 ** 2 + 1e-10);
      this.wins.push({ at: now, db, loud: false });
    }
    this.carry = Buffer.from(buf.subarray(off));
    while (this.wins.length && this.wins[0].at < now - KEEP_MS) this.wins.shift();
    this.updateFloor();
  }

  /** The noise floor is the 10th percentile of the last 5 s: the gaps between words, or the room when nobody speaks. */
  private updateFloor() {
    const recent = this.wins.slice(-(5000 / WIN_MS));
    if (recent.length >= 25) {
      const sorted = recent.map((w) => w.db).sort((a, b) => a - b);
      this.floor = sorted[Math.floor(sorted.length * 0.1)];
    }
    for (let i = Math.max(0, this.wins.length - 50); i < this.wins.length; i++) {
      const w = this.wins[i];
      w.loud = w.db > MIN_DB && w.db > this.floor + ABOVE_FLOOR_DB;
    }
  }

  /**
   * How loud a window must be to be this caller rather than someone in the background: within 6 dB of the
   * caller's own turns. Before the first turn that is unknown, so it must stand well clear of the line noise.
   */
  private callerDb() {
    return this.voiceDb === null ? this.floor + 18 : Math.max(this.floor + ABOVE_FLOOR_DB, this.voiceDb - 6);
  }

  /** `ms`: any clear sound; `callerMs`: at the caller's own loudness; `db`: mean level of the clear sound. */
  private measure(from: number) {
    const min = this.callerDb();
    let loud = 0;
    let caller = 0;
    let sum = 0;
    for (const w of this.wins) {
      if (w.at < from || !w.loud) continue;
      loud += 1;
      sum += w.db;
      if (w.db >= min) caller += 1;
    }
    return { ms: loud * WIN_MS, callerMs: caller * WIN_MS, db: loud ? sum / loud : -100 };
  }

  /** Speech at the caller's loudness in the last `ms`: for deciding whether to stop talking. */
  recentCallerMs(ms: number) {
    return this.measure(Date.now() - ms).callerMs;
  }

  /** Sound since the previous transcript: the utterance a new transcript came from. */
  utterance() {
    const u = this.measure(Math.max(this.since, Date.now() - KEEP_MS));
    this.since = Date.now();
    return u;
  }

  /** Before the caller's first turn their voice is unknown, so the agent waits for longer speech before stopping. */
  get knowsVoice() {
    return this.voiceDb !== null;
  }

  /** A turn was accepted as the caller's: learn how loud they are. */
  learn(db: number) {
    if (db <= -100) return;
    this.voiceDb = this.voiceDb === null ? db : this.voiceDb * 0.7 + db * 0.3;
  }

  get noiseFloor() {
    return this.floor;
  }
}
