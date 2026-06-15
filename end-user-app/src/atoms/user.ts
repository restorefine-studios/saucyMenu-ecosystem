/* eslint-disable @typescript-eslint/no-explicit-any */
// import { Message } from "ai";

import { atomWithStorage } from 'jotai/utils'

export const userAtom = atomWithStorage<LoginData | null>('user', null)
// type ChatStore = Record<string, Message[]>;

export const chatStoreAtom = atomWithStorage<any>('chatStore', {})
