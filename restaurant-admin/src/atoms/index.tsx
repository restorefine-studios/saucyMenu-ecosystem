// import { atom } from "jotai";

// export function atomWithLocalStorage  <T>(key: string, initialValue: T){
//   const getInitialValue = (): T => {
//     const item = localStorage.getItem(key);
//     if (item !== null) {
//       return JSON.parse(item);
//     }
//     return initialValue;
//   };

//   const baseAtom = atom<T>(getInitialValue());

//   const derivedAtom = atom<T, T | ((prev: T) => T)>(
//     (get) => get(baseAtom),
//     (get, set, update) => {
//       const nextValue = typeof update === "function"
//         ? (update as (prev: T) => T)(get(baseAtom))
//         : update;
//       set(baseAtom, nextValue);
//       localStorage.setItem(key, JSON.stringify(nextValue));
//     }
//   );

//   return derivedAtom;
// };
