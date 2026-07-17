import type { Deck } from "@/lib/workspace/model";

export const DEMO_DECKS: Deck[] = [
  {
    id: "spanish",
    name: "Spanish",
    cards: [
      { id: "es-1", front: "hola", back: "hello" },
      { id: "es-2", front: "gato", back: "cat" },
      { id: "es-3", front: "perro", back: "dog" },
      { id: "es-4", front: "gracias", back: "thank you" },
      { id: "es-5", front: "agua", back: "water" },
    ],
  },
  {
    id: "capitals",
    name: "Capitals",
    cards: [
      { id: "cap-1", front: "France", back: "Paris" },
      { id: "cap-2", front: "Japan", back: "Tokyo" },
      { id: "cap-3", front: "Egypt", back: "Cairo" },
    ],
  },
  {
    id: "verbs",
    name: "Verbs",
    cards: [
      { id: "vb-1", front: "to be", back: "ser / estar" },
      { id: "vb-2", front: "to have", back: "tener" },
    ],
  },
];
