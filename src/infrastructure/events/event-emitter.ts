import { EventEmitter } from 'events';

export const appEmitter = new EventEmitter();

appEmitter.setMaxListeners(20);