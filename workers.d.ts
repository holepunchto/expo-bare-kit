import type { IPC, IPCOptions } from 'bare-stow-host'
import type { WorkletOptions } from 'react-native-bare-kit'

declare const worker: {
  start(opts?: WorkletOptions & Omit<IPCOptions, 'kill'>): Promise<{ ipc: IPC }>
}

export default worker
