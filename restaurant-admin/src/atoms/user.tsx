/* eslint-disable @typescript-eslint/no-explicit-any */
import { atomWithStorage } from "jotai/utils";

export const userAtom = atomWithStorage<any | null>("user", null);
