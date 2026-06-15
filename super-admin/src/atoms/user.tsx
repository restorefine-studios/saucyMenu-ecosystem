import { atomWithStorage } from "jotai/utils";

export const userAtom = atomWithStorage<LoginData | null>("user", null);
