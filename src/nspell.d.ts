declare module 'nspell' {
  interface NSpellInstance {
    correct(word: string): boolean;
    suggest(word: string): string[];
  }

  interface Dictionary {
    aff: string | Uint8Array;
    dic: string | Uint8Array;
  }

  function nspell(dictionary: Dictionary): NSpellInstance;
  function nspell(aff: string | Uint8Array, dic: string | Uint8Array): NSpellInstance;
  export default nspell;
}
