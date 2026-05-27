/**
 * Desktop3DMode — orthographic isometric view of the NPS.
 * Thin wrapper around NpsScene for use in TechSchemeKTO.
 */
import { NpsScene } from '../scene/NpsScene'

interface Desktop3DModeProps {
  onBack?: () => void
}

export function Desktop3DMode({ onBack }: Desktop3DModeProps) {
  return <NpsScene onBack={onBack} />
}
