import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, computed, signal } from '@angular/core';
import { WORD_BANK, WORD_LENGTHS, cleanWord } from './word-bank';

type LetterState = 'correct' | 'present' | 'absent' | 'empty';
type RoundState = 'playing' | 'won' | 'lost';
type LengthChoice = 'random' | number;
interface Tile { letter: string; state: LetterState; }
interface Stats { played: number; won: number; streak: number; best: number; }

const KEYBOARD = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];
const MAX_ATTEMPTS = 6;
const EMPTY_STATS: Stats = { played: 0, won: 0, streak: 0, best: 0 };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnDestroy {
  readonly keyboard = KEYBOARD;
  readonly lengths = WORD_LENGTHS;
  readonly maxAttempts = MAX_ATTEMPTS;
  readonly answer = signal('');
  readonly guesses = signal<string[]>([]);
  readonly currentGuess = signal('');
  readonly state = signal<RoundState>('playing');
  readonly lengthChoice = signal<LengthChoice>('random');
  readonly message = signal('');
  readonly secondsBeforeNext = signal(0);
  readonly modal = signal<'help' | 'stats' | null>(null);
  readonly theme = signal<'dark' | 'light'>('dark');
  readonly validating = signal(false);
  readonly stats = signal<Stats>({ ...EMPTY_STATS });
  readonly wordLength = computed(() => this.answer().length);
  readonly winRate = computed(() => this.stats().played ? Math.round(this.stats().won / this.stats().played * 100) : 0);
  readonly rows = computed<Tile[][]>(() => Array.from({ length: MAX_ATTEMPTS }, (_, row) => this.createRow(row)));
  private nextTimer?: number;
  private countdownTimer?: number;

  constructor() {
    this.loadPreferences();
    this.startRound();
  }

  ngOnDestroy(): void { this.clearTimers(); }

  startRound(): void {
    this.clearTimers();
    this.answer.set(this.pickWord());
    this.guesses.set([]);
    this.currentGuess.set('');
    this.state.set('playing');
    this.message.set('');
    this.secondsBeforeNext.set(0);
  }

  setLength(value: string): void {
    this.lengthChoice.set(value === 'random' ? 'random' : Number(value));
    localStorage.setItem('motus-length', String(this.lengthChoice()));
    this.startRound();
  }

  press(key: string): void {
    if (this.state() !== 'playing' || this.validating()) return;
    if (key === 'ENTER') { void this.submit(); return; }
    if (key === 'BACKSPACE') { this.erase(); return; }
    if (/^[A-Z]$/.test(key) && this.currentGuess().length < this.wordLength()) {
      this.currentGuess.update(value => value + key);
    }
  }

  erase(): void {
    if (this.state() !== 'playing') return;
    this.currentGuess.update(value => value.slice(0, -1));
  }

  async submit(): Promise<void> {
    const guess = this.currentGuess();
    if (guess.length !== this.wordLength()) { this.flash(`Le mot doit contenir ${this.wordLength()} lettres.`); return; }
    if (this.guesses().includes(guess)) { this.flash('Vous avez déjà essayé ce mot.'); return; }
    this.validating.set(true);
    const valid = await this.isValidFrenchWord(guess);
    this.validating.set(false);
    if (!valid) { this.flash('Ce mot ne figure pas dans le dictionnaire.'); return; }

    const nextGuesses = [...this.guesses(), guess];
    this.guesses.set(nextGuesses);
    this.currentGuess.set('');
    if (guess === this.answer()) this.finishRound('won');
    else if (nextGuesses.length >= MAX_ATTEMPTS) this.finishRound('lost');
    else this.flash(`Essai ${nextGuesses.length} validé.`);
  }

  skip(): void { if (this.state() === 'playing') this.finishRound('lost'); }

  tileState(word: string): Tile[] {
    const available = this.answer().split('');
    const result: Tile[] = word.split('').map(letter => ({ letter, state: 'absent' }));
    word.split('').forEach((letter, index) => {
      if (letter === available[index]) { result[index].state = 'correct'; available[index] = ''; }
    });
    word.split('').forEach((letter, index) => {
      if (result[index].state === 'correct') return;
      const found = available.indexOf(letter);
      if (found >= 0) { result[index].state = 'present'; available[found] = ''; }
    });
    return result;
  }

  keyState(letter: string): LetterState {
    const priority: LetterState[] = ['empty', 'absent', 'present', 'correct'];
    let best: LetterState = 'empty';
    for (const guess of this.guesses()) {
      for (const tile of this.tileState(guess)) {
        if (tile.letter === letter && priority.indexOf(tile.state) > priority.indexOf(best)) best = tile.state;
      }
    }
    return best;
  }

  toggleTheme(): void {
    this.theme.update(value => value === 'dark' ? 'light' : 'dark');
    document.documentElement.dataset['theme'] = this.theme();
    localStorage.setItem('motus-theme', this.theme());
  }

  resetStats(): void {
    this.stats.set({ ...EMPTY_STATS });
    localStorage.removeItem('motus-stats-v2');
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (this.modal()) return;
    if (event.key === 'Enter') this.press('ENTER');
    else if (event.key === 'Backspace') this.press('BACKSPACE');
    else {
      const letter = cleanWord(event.key);
      if (/^[A-Z]$/.test(letter)) this.press(letter);
    }
  }

  private createRow(index: number): Tile[] {
    const submitted = this.guesses()[index];
    if (submitted) return this.tileState(submitted);
    const value = index === this.guesses().length && this.state() === 'playing' ? this.currentGuess() : '';
    return Array.from({ length: this.wordLength() }, (_, position) => ({ letter: value[position] ?? '', state: 'empty' }));
  }

  private pickWord(): string {
    const selectedLength = this.lengthChoice() === 'random'
      ? WORD_LENGTHS[Math.floor(Math.random() * WORD_LENGTHS.length)]
      : this.lengthChoice() as number;
    const words = WORD_BANK[selectedLength];
    const previous = localStorage.getItem('motus-previous-word');
    const choices = words.filter(word => word !== previous);
    const word = (choices.length ? choices : words)[Math.floor(Math.random() * (choices.length || words.length))];
    localStorage.setItem('motus-previous-word', word);
    return word;
  }

  private async isValidFrenchWord(word: string): Promise<boolean> {
    if (Object.values(WORD_BANK).flat().includes(word)) return true;
    try {
      const response = await fetch(`https://fr.wiktionary.org/w/api.php?action=query&format=json&origin=*&titles=${encodeURIComponent(word.toLowerCase())}`);
      if (!response.ok) throw new Error('dictionary unavailable');
      const data = await response.json();
      return !Object.values(data.query.pages as Record<string, { missing?: string }>).some(page => 'missing' in page);
    } catch {
      this.flash('Dictionnaire indisponible : utilisez un mot courant.');
      return false;
    }
  }

  private finishRound(result: Exclude<RoundState, 'playing'>): void {
    this.state.set(result);
    const current = { ...this.stats() };
    current.played++;
    if (result === 'won') { current.won++; current.streak++; current.best = Math.max(current.best, current.streak); }
    else current.streak = 0;
    this.stats.set(current);
    localStorage.setItem('motus-stats-v2', JSON.stringify(current));
    this.message.set(result === 'won' ? `Bravo, vous avez trouvé ${this.answer()} !` : `Le mot était ${this.answer()}.`);
    this.secondsBeforeNext.set(5);
    this.countdownTimer = window.setInterval(() => this.secondsBeforeNext.update(value => Math.max(0, value - 1)), 1000);
    this.nextTimer = window.setTimeout(() => this.startRound(), 5000);
  }

  private flash(text: string): void {
    this.message.set(text);
    window.setTimeout(() => { if (this.state() === 'playing' && this.message() === text) this.message.set(''); }, 2200);
  }

  private clearTimers(): void {
    if (this.nextTimer) window.clearTimeout(this.nextTimer);
    if (this.countdownTimer) window.clearInterval(this.countdownTimer);
    this.nextTimer = undefined;
    this.countdownTimer = undefined;
  }

  private loadPreferences(): void {
    const savedTheme = localStorage.getItem('motus-theme');
    if (savedTheme === 'light') this.theme.set('light');
    document.documentElement.dataset['theme'] = this.theme();
    const savedLength = localStorage.getItem('motus-length');
    if (savedLength && WORD_LENGTHS.includes(Number(savedLength))) this.lengthChoice.set(Number(savedLength));
    try { this.stats.set({ ...EMPTY_STATS, ...JSON.parse(localStorage.getItem('motus-stats-v2') ?? '{}') }); } catch { this.stats.set({ ...EMPTY_STATS }); }
  }
}
