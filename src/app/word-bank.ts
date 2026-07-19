export const WORD_BANK: Record<number, string[]> = {
  4: ['AUBE','BANC','BOIS','BRAS','CIEL','DOUX','FEUX','LACS','LION','LUNE','MAIN','NUIT','OURS','PAIN','PARC','PORT','RIRE','ROSE','VENT','VITE'],
  5: ['ARBRE','BRAVE','CHIEN','DANSE','ECRAN','FLEUR','GLACE','JOUER','LIVRE','MONDE','NUAGE','PERLE','PIANO','PLAGE','REINE','ROUGE','SABLE','SALON','TABLE','TIGRE'],
  6: ['ANIMAL','BATEAU','CADEAU','CHEMIN','ETOILE','JARDIN','ORANGE','PAPIER','SOLEIL','TOMATE','VOYAGE','VISAGE','NATURE','PLUIES','SECRET'],
  7: ['BONHEUR','CHAPEAU','CHATEAU','CUISINE','FROMAGE','JOURNAL','PAYSAGE','SOURIRE','VACANCE','VILLAGE','VOITURE','COURAGE'],
  8: ['CHOCOLAT','ELEPHANT','MONTAGNE','FONTAINE','QUESTION','SOUVENIR','VACANCES','AVENTURE','PAPILLON','HISTOIRE']
};

export const WORD_LENGTHS = Object.keys(WORD_BANK).map(Number);

export function cleanWord(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '').toUpperCase();
}
