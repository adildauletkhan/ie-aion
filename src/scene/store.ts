import { create } from 'zustand'

export interface EquipParams {
  pressure?:    string
  temperature?: string
  flowRate?:    string
  level?:       string
  status:       'running' | 'standby' | 'fault' | 'maintenance'
}

const MOCK: Record<string, EquipParams> = {
  RVS1:    { level: '72 %',  temperature: '42 °C', status: 'running'     },
  RVS2:    { level: '65 %',  temperature: '41 °C', status: 'running'     },
  RVS3:    { level: '81 %',  temperature: '40 °C', status: 'running'     },
  RVS4:    { level: '93 %',  temperature: '39 °C', status: 'fault'       },
  PODPOR:  { pressure: '0.48 МПа', flowRate: '490 м³/ч', status: 'running' },
  FS1:     { pressure: '0.42 МПа', status: 'running'  },
  FS2:     { pressure: '0.41 МПа', status: 'running'  },
  MANIFOLD:{ pressure: '0.38 МПа', status: 'running'  },
  NA1:     { pressure: '6.84 МПа', flowRate: '363 м³/ч', temperature: '48 °C', status: 'running' },
  NA2:     { pressure: '6.82 МПа', flowRate: '365 м³/ч', temperature: '47 °C', status: 'running' },
  NA3:     { pressure: '6.83 МПа', flowRate: '362 м³/ч', temperature: '49 °C', status: 'running' },
  NA4:     { pressure: '—',        flowRate: '—',         temperature: '—',     status: 'maintenance' },
  SIKN:    { flowRate: '1 455 м³/ч', pressure: '6.81 МПа', status: 'running' },
  DRAIN:   { level: '18 %',  status: 'standby'     },
  CTRL:    { status: 'running' },
}

interface NpsStore {
  selectedId:  string | null
  flowRate:    number           // м³/ч — drives pipe animation speed
  select:      (id: string | null) => void
  setFlowRate: (rate: number) => void
  getParams:   (id: string) => EquipParams | undefined
}

export const useNpsStore = create<NpsStore>((set, get) => ({
  selectedId:  null,
  flowRate:    1455,
  select:      (id) => set({ selectedId: id }),
  setFlowRate: (rate) => set({ flowRate: rate }),
  getParams:   (id)   => MOCK[id],
}))
