export const ANIMALS = [
  { id: 'dragons', label: 'Dragons', hero: '/hero-image-menu.png' },
  { id: 'tulpars', label: 'Tulpars', hero: '/heroes/hero-tulpar.webp' },
  { id: 'llamas', label: 'Llamas', hero: '/heroes/hero-llama.webp' },
  { id: 'unicorns', label: 'Unicorns', hero: '/heroes/hero-unicorn.webp' },
];

const DEFAULT_ANIMAL = ANIMALS[0];
const STORAGE_KEY = 'ud_animal';

export function findAnimal(animalId) {
  return ANIMALS.find((animal) => animal.id === animalId) || DEFAULT_ANIMAL;
}

export function loadAnimal() {
  return findAnimal(localStorage.getItem(STORAGE_KEY)).id;
}

export function saveAnimal(animalId) {
  localStorage.setItem(STORAGE_KEY, findAnimal(animalId).id);
}
