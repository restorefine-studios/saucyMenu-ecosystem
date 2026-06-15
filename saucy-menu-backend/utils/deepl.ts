import * as deepl from 'deepl-node';

const authKey = process.env.DEEPL_API_KEY!; // Replace with your key
export const deeplClient = new deepl.DeepLClient(authKey);

