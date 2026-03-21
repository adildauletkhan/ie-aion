import {
  AlertTriangle,
  BadgeCheck,
  BatteryCharging,
  Cpu,
  Droplet,
  Factory,
  Flame,
  Gauge,
  Home,
  Radio,
  Recycle,
  Route,
  Shield,
  Thermometer,
  Warehouse,
  Zap,
} from "lucide-react";
import pumpjackIcon from "../assets/pumpjack.svg";
import oilBarrelIcon from "../assets/oil-barrel.svg";
import oilPumpsIcon from "../assets/oil-pumps-petroleum.svg";
import pumpIcon from "../assets/pump.svg";
import handPumpIcon from "../assets/hand-pump-petroleum.svg";
import valveIcon from "../assets/valve.svg";
import pipeIcon from "../assets/pipe.svg";
import oilRigIcon from "../assets/oil-rig.svg";
import chemistryIcon from "../assets/chemical-chemistry.svg";
import teePipeIcon from "../assets/tee-pipe.svg";
import pipeValveIcon from "../assets/pipe-valve.svg";
import agzuIcon from "../assets/agzu.svg";
import uppnIcon from "../assets/uppn.svg";
import ppnIcon from "../assets/ppn.svg";
import vpnIcon from "../assets/vpn.svg";
import dnsIcon from "../assets/dns.svg";
import kunIcon from "../assets/kun.svg";
import cpsIcon from "../assets/cps.svg";
import separatorIcon from "../assets/separator.svg";

const imageIconMap: Record<string, string> = {
  production_well: pumpjackIcon,
  injection_well: handPumpIcon,
  rvs: oilBarrelIcon,
  valve: valveIcon,
  ball_valve: valveIcon,
  check_valve: valveIcon,
  pump: pumpIcon,
  separator: separatorIcon,
  agzu: agzuIcon,
  uppn: uppnIcon,
  vpn: vpnIcon,
  ppn: ppnIcon,
  kun: kunIcon,
  dns: dnsIcon,
  cps: cpsIcon,
  oil_pipeline: pipeIcon,
  water_pipeline: pipeIcon,
  gas_pipeline: pipeIcon,
  product_pipeline: pipeIcon,
  collector: pipeValveIcon,
  tap_in: pipeIcon,
  tee: teePipeIcon,
  reducer: pipeIcon,
  shutoff_node: pipeValveIcon,
  bpv: chemistryIcon,
  water_treatment: chemistryIcon,
  wash_water_tank: oilBarrelIcon,
  gcs: oilRigIcon,
  ukpg: oilRigIcon,
  flare: oilRigIcon,
  bg: pipeValveIcon,
  bkns: oilPumpsIcon,
  settling_tank: oilBarrelIcon,
  metering_tank: oilBarrelIcon,
  kns_ppd: oilPumpsIcon,
  reagent_dosing: chemistryIcon,
  water_intake_well: pumpjackIcon,
  booster_pump_station: oilPumpsIcon,
  circulation_system: pipeIcon,
  transfer_pump_station: oilPumpsIcon,
  tp: oilRigIcon,
  des: oilRigIcon,
  lep: pipeIcon,
  ru: oilRigIcon,
  boiler_house: oilRigIcon,
  heat_exchanger: chemistryIcon,
  heat_pipeline: pipeIcon,
  oil_heater: oilRigIcon,
  heat_exchange_unit: chemistryIcon,
  sikn: chemistryIcon,
  uza: pipeValveIcon,
  flow_meter: pipeValveIcon,
  telemechanics_point: oilRigIcon,
  control_cabinet: oilRigIcon,
  sensor: chemistryIcon,
  spill_pond: oilBarrelIcon,
  sludge_pond: oilBarrelIcon,
  flare_utilization: oilRigIcon,
  vapor_recovery: chemistryIcon,
  fire_tank: oilBarrelIcon,
  fire_suppression: oilRigIcon,
  emergency_tank: oilBarrelIcon,
  field_road: pipeIcon,
  shift_camp: oilRigIcon,
  bpo: oilRigIcon,
  mto_warehouse: oilRigIcon,
};

export function ObjectIcon({ code }: { code?: string | null }) {
  const icon = code ? imageIconMap[code] : undefined;
  const LucideIcon =
    (code &&
      ({
        tp: Zap,
        des: BatteryCharging,
        lep: Route,
        ru: BadgeCheck,
        boiler_house: Factory,
        heat_exchanger: Thermometer,
        heat_pipeline: Route,
        oil_heater: Flame,
        heat_exchange_unit: Thermometer,
        sikn: Gauge,
        uza: Gauge,
        flow_meter: Gauge,
        telemechanics_point: Radio,
        control_cabinet: Cpu,
        sensor: Gauge,
        spill_pond: Droplet,
        sludge_pond: Recycle,
        flare: Flame,
        flare_utilization: Flame,
        vapor_recovery: Recycle,
        fire_tank: Droplet,
        fire_suppression: Shield,
        emergency_tank: AlertTriangle,
        field_road: Route,
        shift_camp: Home,
        bpo: Warehouse,
        mto_warehouse: Warehouse,
        circulation_system: Route,
        water_treatment: Recycle,
        bpv: Recycle,
        gcs: Factory,
        ukpg: Factory,
        kns_ppd: Gauge,
        booster_pump_station: Gauge,
        transfer_pump_station: Gauge,
        reagent_dosing: Recycle,
        water_intake_well: Droplet,
      } as const)[code]) ||
    undefined;

  if (icon) {
    return (
      <span className="object-icon" aria-hidden>
        <img className="object-icon-image" src={icon} alt="" />
      </span>
    );
  }

  if (LucideIcon) {
    return (
      <span className="object-icon" aria-hidden>
        <LucideIcon className="object-icon-lucide" />
      </span>
    );
  }

  return (
    <span className="object-icon" aria-hidden>
      <img className="object-icon-image" src={oilRigIcon} alt="" />
    </span>
  );
}
