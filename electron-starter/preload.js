// preload.js
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('api', {
  ping: () => 'pong'
});
