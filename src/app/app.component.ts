import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, computed, signal } from '@angular/core';
import nspell from 'nspell';
import { WORD_BANK, WORD_LENGTHS, cleanWord } from './word-bank';
import { FEATURE_CATALOG } from './feature-catalog';

type LetterState = 'correct' | 'present' | 'absent' | 'empty';
type RoundState = 'playing' | 'won' | 'lost';
type LengthChoice = 'random' | number;
type Difficulty = 'relax' | 'normal' | 'hard' | 'expert';
type GameMode = 'random' | 'daily' | 'chrono' | 'zen';
type KeyboardLayout = 'azerty' | 'qwerty';
type Modal = 'help' | 'features' | 'stats' | 'settings' | 'achievements' | 'history' | null;
interface Tile { letter: string; state: LetterState; }
interface HistoryEntry { word: string; won: boolean; attempts: number; seconds: number; date: string; mode: GameMode; difficulty: Difficulty; }
interface Stats { played: number; won: number; streak: number; best: number; totalAttempts: number; totalSeconds: number; firstTry: number; hintsUsed: number; distribution: number[]; xp: number; }
interface Settings { sound: boolean; vibration: boolean; colorBlind: boolean; reducedMotion: boolean; highContrast: boolean; largeText: boolean; keyboard: KeyboardLayout; strict: boolean; showTimer: boolean; }
interface SessionRound { answer: string; guesses: string[]; currentGuess: string; state: RoundState; message: string; lengthChoice: LengthChoice; difficulty: Difficulty; gameMode: GameMode; startedAt: number; elapsedBeforePause: number; hintsUsed: number; revealed: number[]; }
interface Achievement { id: string; title: string; description: string; unlocked: boolean; }

const KEYBOARDS: Record<KeyboardLayout, string[]> = { azerty: ['AZERTYUIOP','QSDFGHJKLM','WXCVBN'], qwerty: ['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'] };
const EMPTY_STATS: Stats = { played: 0, won: 0, streak: 0, best: 0, totalAttempts: 0, totalSeconds: 0, firstTry: 0, hintsUsed: 0, distribution: [0,0,0,0,0,0,0,0], xp: 0 };
const DEFAULT_SETTINGS: Settings = { sound: true, vibration: true, colorBlind: false, reducedMotion: false, highContrast: false, largeText: false, keyboard: 'azerty', strict: true, showTimer: true };
const SESSION_KEY = 'wordle-current-session';
const USED_WORDS_KEY = 'wordle-used-words';
const HISTORY_KEY = 'wordle-history';

@Component({ selector: 'app-root', standalone: true, imports: [CommonModule], templateUrl: './app.component.html', styleUrl: './app.component.css' })
export class AppComponent implements OnDestroy {
  readonly lengths = WORD_LENGTHS;
  readonly features = FEATURE_CATALOG;
  readonly featureCategories = [...new Set(FEATURE_CATALOG.map(feature => feature.category))];
  readonly answer = signal('');
  readonly guesses = signal<string[]>([]);
  readonly currentGuess = signal('');
  readonly state = signal<RoundState>('playing');
  readonly lengthChoice = signal<LengthChoice>('random');
  readonly difficulty = signal<Difficulty>('normal');
  readonly gameMode = signal<GameMode>('random');
  readonly message = signal('');
  readonly modal = signal<Modal>(null);
  readonly theme = signal<'dark' | 'light'>('dark');
  readonly stats = signal<Stats>({ ...EMPTY_STATS });
  readonly settings = signal<Settings>({ ...DEFAULT_SETTINGS });
  readonly history = signal<HistoryEntry[]>([]);
  readonly dictionaryReady = signal(false);
  readonly startedAt = signal(Date.now());
  readonly elapsed = signal(0);
  readonly hintsUsed = signal(0);
  readonly revealedPositions = signal<number[]>([]);
  readonly paused = signal(false);
  readonly keyboard = computed(() => KEYBOARDS[this.settings().keyboard]);
  readonly wordLength = computed(() => this.answer().length);
  readonly maxAttempts = computed(() => this.difficulty() === 'relax' ? 8 : this.difficulty() === 'expert' ? 5 : 6);
  readonly timeLimit = computed(() => this.gameMode() === 'chrono' ? (this.difficulty() === 'expert' ? 75 : 120) : 0);
  readonly remainingTime = computed(() => Math.max(0, this.timeLimit() - this.elapsed()));
  readonly winRate = computed(() => this.stats().played ? Math.round(this.stats().won / this.stats().played * 100) : 0);
  readonly averageAttempts = computed(() => this.stats().won ? (this.stats().totalAttempts / this.stats().won).toFixed(1) : '0');
  readonly averageTime = computed(() => this.stats().played ? Math.round(this.stats().totalSeconds / this.stats().played) : 0);
  readonly attemptNumber = computed(() => Math.min(this.guesses().length + 1, this.maxAttempts()));
  readonly rows = computed<Tile[][]>(() => Array.from({ length: this.maxAttempts() }, (_, row) => this.createRow(row)));
  readonly level = computed(() => Math.floor(this.stats().xp / 500) + 1);
  readonly levelProgress = computed(() => this.stats().xp % 500);
  readonly availableHints = computed(() => Math.max(0, 3 - this.hintsUsed()));
  readonly achievements = computed<Achievement[]>(() => this.buildAchievements());
  readonly unlockedCount = computed(() => this.achievements().filter(a => a.unlocked).length);
  featuresFor(category: string) { return this.features.filter(feature => feature.category === category); }
  readonly formattedTime = computed(() => this.formatSeconds(this.gameMode() === 'chrono' ? this.remainingTime() : this.elapsed()));
  private spellChecker?: ReturnType<typeof nspell>;
  private timerId?: number;
  private messageTimer?: number;

  constructor() {
    this.loadPreferences();
    if (!this.restoreSessionRound()) this.startRound();
    void this.loadDictionary();
    this.timerId = window.setInterval(() => this.tick(), 1000);
  }
  ngOnDestroy(): void { if (this.timerId) clearInterval(this.timerId); this.clearMessageTimer(); }

  startRound(): void {
    this.clearMessageTimer();
    try { this.answer.set(this.pickWord()); } catch { this.resetUsedWords(); this.answer.set(this.pickWord()); }
    this.guesses.set([]); this.currentGuess.set(''); this.state.set('playing'); this.hintsUsed.set(0); this.revealedPositions.set([]);
    this.startedAt.set(Date.now()); this.elapsed.set(0); this.paused.set(false);
    this.message.set(this.settings().strict ? 'Mode strict activé : chaque indice doit être respecté.' : 'Trouvez le mot avant la fin des essais.');
    this.saveSessionRound();
  }
  setLength(value: string): void { this.lengthChoice.set(value === 'random' ? 'random' : Number(value)); localStorage.setItem('wordle-length', String(this.lengthChoice())); this.startRound(); }
  setDifficulty(value: string): void { this.difficulty.set(value as Difficulty); localStorage.setItem('wordle-difficulty', value); if (value === 'expert') this.updateSetting('strict', true); this.startRound(); }
  setGameMode(value: string): void { this.gameMode.set(value as GameMode); localStorage.setItem('wordle-mode', value); this.startRound(); }

  press(key: string): void {
    if (this.state() !== 'playing' || this.modal() || this.paused()) return;
    if (key === 'ENTER') return this.submit();
    if (key === 'BACKSPACE') return this.erase();
    if (/^[A-Z]$/.test(key) && this.currentGuess().length < this.wordLength()) { this.currentGuess.update(v => v + key); this.feedbackTap(); this.clearTransientMessage(); this.saveSessionRound(); }
  }
  erase(): void { if (this.state() !== 'playing') return; this.currentGuess.update(v => v.slice(0,-1)); this.feedbackTap(); this.saveSessionRound(); }

  submit(): void {
    const guess = this.currentGuess();
    if (guess.length !== this.wordLength()) return this.flash(`Il manque ${this.wordLength()-guess.length} lettre${this.wordLength()-guess.length>1?'s':''}.`);
    if (!this.dictionaryReady()) return this.flash('Le dictionnaire français est encore en cours de chargement.');
    if (!this.isRecognizedWord(guess)) return this.flash('Mot non reconnu dans le dictionnaire français.');
    if (this.guesses().includes(guess)) return this.flash('Ce mot a déjà été proposé.');
    if (this.settings().strict) { const error = this.strictRuleError(guess); if (error) return this.flash(error); }
    if (this.difficulty() === 'expert' && this.guesses().length === 0 && new Set(guess).size < Math.min(guess.length, 4)) return this.flash('Mode expert : le premier mot doit contenir au moins 4 lettres différentes.');
    const next = [...this.guesses(), guess]; this.guesses.set(next); this.currentGuess.set(''); this.playTone(guess === this.answer() ? 720 : 340); this.saveSessionRound();
    if (guess === this.answer()) this.finishRound('won'); else if (next.length >= this.maxAttempts()) this.finishRound('lost'); else this.flash(`Essai ${next.length}/${this.maxAttempts()} validé.`);
  }

  useHint(kind: 'letter'|'vowel'|'position'): void {
    if (this.state() !== 'playing' || this.availableHints() <= 0 || this.difficulty() === 'expert') return this.flash('Les indices sont indisponibles en mode expert.');
    const answer = this.answer(); const unknown = [...answer].map((_,i)=>i).filter(i=>!this.revealedPositions().includes(i));
    if (!unknown.length) return this.flash('Toutes les positions ont déjà été révélées.');
    let position = unknown[Math.floor(Math.random()*unknown.length)];
    if (kind === 'vowel') { const vowels = unknown.filter(i=>'AEIOUY'.includes(answer[i])); if (!vowels.length) return this.flash('Aucune voyelle supplémentaire ne peut être révélée.'); position = vowels[Math.floor(Math.random()*vowels.length)]; }
    this.revealedPositions.update(v=>[...v,position]); this.hintsUsed.update(v=>v+1); this.stats.update(s=>({...s,hintsUsed:s.hintsUsed+1})); this.persistStats();
    this.flash(kind === 'position' ? `La lettre en position ${position+1} est ${answer[position]}.` : `Indice : le mot contient la lettre ${answer[position]}.`); this.saveSessionRound();
  }
  skip(): void { if (this.state()==='playing') this.finishRound('lost'); }
  togglePause(): void { if (this.gameMode()==='chrono' && this.state()==='playing') { this.paused.update(v=>!v); this.message.set(this.paused() ? 'Partie en pause.' : 'Partie reprise.'); } }

  tileState(word: string): Tile[] {
    const available=this.answer().split(''); const result:Tile[]=word.split('').map(letter=>({letter,state:'absent'}));
    word.split('').forEach((letter,index)=>{if(letter===available[index]){result[index].state='correct';available[index]='';}});
    word.split('').forEach((letter,index)=>{if(result[index].state==='correct')return;const found=available.indexOf(letter);if(found>=0){result[index].state='present';available[found]='';}}); return result;
  }
  keyState(letter:string):LetterState { const priority:LetterState[]=['empty','absent','present','correct']; let best:LetterState='empty'; for(const guess of this.guesses()) for(const tile of this.tileState(guess)) if(tile.letter===letter&&priority.indexOf(tile.state)>priority.indexOf(best)) best=tile.state; return best; }
  revealedLetter(index:number):string { return this.revealedPositions().includes(index) ? this.answer()[index] : ''; }

  toggleTheme():void { this.theme.update(v=>v==='dark'?'light':'dark'); this.applyAppearance(); localStorage.setItem('wordle-theme',this.theme()); }
  updateSetting(key:keyof Settings,value:boolean|string):void { this.settings.update(s=>({...s,[key]:value} as Settings)); localStorage.setItem('wordle-settings',JSON.stringify(this.settings())); this.applyAppearance(); }
  resetStats():void { this.stats.set({...EMPTY_STATS,distribution:[0,0,0,0,0,0,0,0]}); this.history.set([]); localStorage.removeItem('wordle-stats'); localStorage.removeItem(HISTORY_KEY); }
  resetUsedWords():void { localStorage.removeItem(USED_WORDS_KEY); this.flash('La liste des mots déjà joués a été réinitialisée.'); }
  clearCurrentRound():void { sessionStorage.removeItem(SESSION_KEY); this.startRound(); }

  exportData():void { const data={stats:this.stats(),history:this.history(),settings:this.settings(),usedWords:[...this.loadUsedWords()]}; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download='wordle-sauvegarde.json';a.click();URL.revokeObjectURL(url); }
  shareResult():void { const squares=this.guesses().map(g=>this.tileState(g).map(t=>t.state==='correct'?'🟩':t.state==='present'?'🟨':'⬛').join('')).join('\n'); const text=`WORDLE ${this.state()==='won'?this.guesses().length:'X'}/${this.maxAttempts()}\n${squares}`; if(navigator.share) void navigator.share({text}).catch(()=>{}); else void navigator.clipboard?.writeText(text).then(()=>this.flash('Résultat copié.')).catch(()=>this.flash(text)); }

  @HostListener('window:keydown',['$event']) handleKeyboard(event:KeyboardEvent):void { if(this.modal())return;if(event.key==='Enter')this.press('ENTER');else if(event.key==='Backspace')this.press('BACKSPACE');else{const l=cleanWord(event.key);if(/^[A-Z]$/.test(l))this.press(l);} }

  private tick():void { if(this.state()!=='playing'||this.paused()||this.modal())return; this.elapsed.update(v=>v+1); if(this.gameMode()==='chrono'&&this.remainingTime()<=0)this.finishRound('lost'); if(this.elapsed()%5===0)this.saveSessionRound(); }
  private strictRuleError(guess:string):string|null {
    if(!this.guesses().length)return null; const fixed=new Map<number,string>(), forbidden=new Map<string,Set<number>>(), minimum=new Map<string,number>(), absent=new Set<string>();
    for(const previous of this.guesses()){const tiles=this.tileState(previous),positive=new Map<string,number>();tiles.forEach((tile,index)=>{if(tile.state==='correct')fixed.set(index,tile.letter);if(tile.state==='present'){const p=forbidden.get(tile.letter)??new Set<number>();p.add(index);forbidden.set(tile.letter,p);}if(tile.state!=='absent')positive.set(tile.letter,(positive.get(tile.letter)??0)+1);});for(const [l,c] of positive)minimum.set(l,Math.max(minimum.get(l)??0,c));tiles.forEach(t=>{if(t.state==='absent'&&!positive.has(t.letter))absent.add(t.letter);});}
    for(const [p,l] of fixed)if(guess[p]!==l)return `La lettre ${l} doit rester en position ${p+1}.`;
    for(const [l,positions] of forbidden)for(const p of positions)if(guess[p]===l)return `La lettre ${l} ne peut pas être en position ${p+1}.`;
    for(const [l,min] of minimum)if([...guess].filter(x=>x===l).length<min)return min>1?`Le mot doit contenir au moins ${min} lettres ${l}.`:`Le mot doit contenir la lettre ${l}.`;
    for(const l of absent)if(guess.includes(l))return `La lettre ${l} a déjà été exclue.`; return null;
  }
  private createRow(index:number):Tile[]{const submitted=this.guesses()[index];if(submitted)return this.tileState(submitted);const value=index===this.guesses().length&&this.state()==='playing'?this.currentGuess():'';return Array.from({length:this.wordLength()},(_,p)=>({letter:value[p]??this.revealedLetter(p),state:'empty'}));}
  private wordsOfCurrentLength():string[]{return WORD_BANK[this.wordLength()]??[];}
  private async loadDictionary():Promise<void>{try{const[a,d]=await Promise.all([fetch('dictionaries/fr.aff'),fetch('dictionaries/fr.dic')]);if(!a.ok||!d.ok)throw new Error();this.spellChecker=nspell({aff:await a.text(),dic:await d.text()});this.dictionaryReady.set(true);}catch{this.dictionaryReady.set(false);this.flash('Le dictionnaire français n’a pas pu être chargé.');}}
  private isRecognizedWord(guess:string):boolean{if(this.wordsOfCurrentLength().includes(guess))return true;if(!this.spellChecker)return false;const lower=guess.toLocaleLowerCase('fr-FR');if(this.spellChecker.correct(lower))return true;return this.spellChecker.suggest(lower).some(s=>cleanWord(s)===cleanWord(guess));}
  private pickWord():string { const requested=this.lengthChoice(); const lengths=requested==='random'?WORD_LENGTHS:[requested as number]; if(this.gameMode()==='daily'){const seed=Math.floor(Date.now()/86400000);const length=lengths[seed%lengths.length];const bank=WORD_BANK[length];return bank[seed%bank.length];} const used=this.loadUsedWords();let eligible=lengths.filter(l=>(WORD_BANK[l]??[]).some(w=>!used.has(w)));if(!eligible.length){this.resetUsedWords();eligible=lengths;}const length=eligible[Math.floor(Math.random()*eligible.length)];const choices=WORD_BANK[length].filter(w=>!used.has(w));const word=choices[Math.floor(Math.random()*choices.length)];used.add(word);localStorage.setItem(USED_WORDS_KEY,JSON.stringify([...used]));return word; }
  private loadUsedWords():Set<string>{try{return new Set(JSON.parse(localStorage.getItem(USED_WORDS_KEY)??'[]'));}catch{return new Set();}}
  private saveSessionRound():void{const r:SessionRound={answer:this.answer(),guesses:this.guesses(),currentGuess:this.currentGuess(),state:this.state(),message:this.message(),lengthChoice:this.lengthChoice(),difficulty:this.difficulty(),gameMode:this.gameMode(),startedAt:this.startedAt(),elapsedBeforePause:this.elapsed(),hintsUsed:this.hintsUsed(),revealed:this.revealedPositions()};sessionStorage.setItem(SESSION_KEY,JSON.stringify(r));}
  private restoreSessionRound():boolean{try{const s=JSON.parse(sessionStorage.getItem(SESSION_KEY)??'null') as SessionRound|null;if(!s?.answer||!Array.isArray(s.guesses)||(WORD_BANK[s.answer.length]??[]).indexOf(s.answer)<0)return false;this.answer.set(s.answer);this.guesses.set(s.guesses);this.currentGuess.set(s.currentGuess??'');this.state.set(s.state??'playing');this.message.set(s.message??'');this.lengthChoice.set(s.lengthChoice??'random');this.difficulty.set(s.difficulty??'normal');this.gameMode.set(s.gameMode??'random');this.startedAt.set(s.startedAt??Date.now());this.elapsed.set(s.elapsedBeforePause??0);this.hintsUsed.set(s.hintsUsed??0);this.revealedPositions.set(s.revealed??[]);return true;}catch{return false;}}
  private finishRound(result:'won'|'lost'):void{if(this.state()!=='playing')return;this.state.set(result);const attempts=this.guesses().length;const gain=result==='won'?Math.max(40,180-attempts*20-this.hintsUsed()*15)+(this.difficulty()==='expert'?80:0):10;const current={...this.stats(),distribution:[...this.stats().distribution]};current.played++;current.totalSeconds+=this.elapsed();current.xp+=gain;if(result==='won'){current.won++;current.streak++;current.best=Math.max(current.best,current.streak);current.totalAttempts+=attempts;if(attempts===1)current.firstTry++;current.distribution[Math.min(attempts-1,7)]++;}else current.streak=0;this.stats.set(current);this.persistStats();this.history.update(h=>[{word:this.answer(),won:result==='won',attempts,seconds:this.elapsed(),date:new Date().toISOString(),mode:this.gameMode(),difficulty:this.difficulty()},...h].slice(0,100));localStorage.setItem(HISTORY_KEY,JSON.stringify(this.history()));this.message.set(result==='won'?`Bravo ! ${this.answer()} trouvé en ${attempts} essai${attempts>1?'s':''}. +${gain} XP`:`Temps écoulé ou essais épuisés. Le mot était ${this.answer()}.`);this.playTone(result==='won'?880:180);this.saveSessionRound();}
  private buildAchievements():Achievement[]{const s=this.stats(),h=this.history();return [
    ['first','Première victoire','Gagner une première partie',s.won>=1],['ten','Habitué','Gagner 10 parties',s.won>=10],['fifty','Maître des mots','Gagner 50 parties',s.won>=50],['streak5','En série','Atteindre 5 victoires consécutives',s.best>=5],['streak10','Inarrêtable','Atteindre une série de 10',s.best>=10],['firsttry','Coup de génie','Trouver un mot au premier essai',s.firstTry>=1],['fast','Éclair','Gagner en moins de 30 secondes',h.some(x=>x.won&&x.seconds<30)],['nohint','Sans assistance','Gagner sans utiliser d’indice',h.some(x=>x.won)&&s.hintsUsed===0],['expert','Expert','Gagner en difficulté expert',h.some(x=>x.won&&x.difficulty==='expert')],['chrono','Contre-la-montre','Gagner en mode chrono',h.some(x=>x.won&&x.mode==='chrono')],['level5','Collectionneur','Atteindre le niveau 5',this.level()>=5],['century','Centenaire','Jouer 100 parties',s.played>=100]
  ].map(([id,title,description,unlocked])=>({id:id as string,title:title as string,description:description as string,unlocked:Boolean(unlocked)}));}
  private persistStats():void{localStorage.setItem('wordle-stats',JSON.stringify(this.stats()));}
  private flash(text:string):void{this.clearMessageTimer();this.message.set(text);this.feedbackError();this.messageTimer=window.setTimeout(()=>this.clearTransientMessage(),3000);}
  private clearTransientMessage():void{if(this.state()==='playing'&&!this.paused())this.message.set(this.settings().strict?'Mode strict activé : chaque indice doit être respecté.':'Trouvez le mot avant la fin des essais.');}
  private clearMessageTimer():void{if(this.messageTimer)clearTimeout(this.messageTimer);this.messageTimer=undefined;}
  private feedbackTap():void{if(this.settings().vibration&&navigator.vibrate)navigator.vibrate(8);}
  private feedbackError():void{if(this.settings().vibration&&navigator.vibrate)navigator.vibrate([30,20,30]);this.playTone(150);}
  private playTone(freq:number):void{if(!this.settings().sound)return;try{const ctx=new AudioContext(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=freq;gain.gain.value=.035;osc.connect(gain);gain.connect(ctx.destination);osc.start();gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.12);osc.stop(ctx.currentTime+.13);}catch{}}
  private formatSeconds(v:number):string{return `${Math.floor(v/60).toString().padStart(2,'0')}:${(v%60).toString().padStart(2,'0')}`;}
  private applyAppearance():void{document.documentElement.dataset['theme']=this.theme();document.documentElement.dataset['colorblind']=String(this.settings().colorBlind);document.documentElement.dataset['contrast']=String(this.settings().highContrast);document.documentElement.dataset['largeText']=String(this.settings().largeText);document.documentElement.dataset['reducedMotion']=String(this.settings().reducedMotion);}
  private loadPreferences():void{const theme=localStorage.getItem('wordle-theme');if(theme==='light')this.theme.set('light');const length=localStorage.getItem('wordle-length');if(length&&WORD_LENGTHS.includes(Number(length)))this.lengthChoice.set(Number(length));this.difficulty.set((localStorage.getItem('wordle-difficulty') as Difficulty)||'normal');this.gameMode.set((localStorage.getItem('wordle-mode') as GameMode)||'random');try{this.stats.set({...EMPTY_STATS,...JSON.parse(localStorage.getItem('wordle-stats')??'{}')});this.settings.set({...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem('wordle-settings')??'{}')});this.history.set(JSON.parse(localStorage.getItem(HISTORY_KEY)??'[]'));}catch{}this.applyAppearance();}
}
