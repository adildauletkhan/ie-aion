/**
 * NpsSceneObjects — pure 3D content (no Canvas, no camera, no controls).
 * Shared between Desktop3DMode, VRMode and ARMode.
 */
import { Suspense } from 'react'
import { Ground           } from './objects/Ground'
import { TankFarm         } from './objects/TankFarm'
import { PodporPumpStation} from './objects/PodporPumpStation'
import { FilterUnit       } from './objects/FilterUnit'
import { MainPumpStation  } from './objects/MainPumpStation'
import { Manifold         } from './objects/Manifold'
import { UkUkn            } from './objects/UkUkn'
import { DrainageBlock    } from './objects/DrainageBlock'
import { ControlRoom      } from './objects/ControlRoom'
import { PipelineNetwork  } from './objects/PipelineNetwork'
import { Labels           } from './objects/Labels'

interface NpsSceneObjectsProps {
  /** When true, render HTML labels (disable in VR/AR where floating panels replace them) */
  showLabels?: boolean
}

export function NpsSceneObjects({ showLabels = true }: NpsSceneObjectsProps) {
  return (
    <Suspense fallback={null}>
      <Ground />
      <TankFarm />
      <PodporPumpStation />
      <FilterUnit />
      <Manifold />
      <MainPumpStation />
      <UkUkn />
      <DrainageBlock />
      <ControlRoom />
      <PipelineNetwork />
      {showLabels && <Labels />}
    </Suspense>
  )
}
