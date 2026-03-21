from decimal import Decimal
from typing import Any


class FlowBalanceCalculator:
    """Calculates flow balance and bottlenecks for a field scheme."""

    def __init__(self, scheme_data: dict):
        self.objects = {obj["id"]: obj for obj in scheme_data["objects"]}
        self.connections = scheme_data["connections"]
        self.flow_graph = self._build_flow_graph()

    def _build_flow_graph(self) -> dict:
        graph: dict[str, dict[str, list]] = {}
        for conn in self.connections:
            source_id = conn["source_object_id"]
            target_id = conn["target_object_id"]
            if source_id not in graph:
                graph[source_id] = {"outgoing": [], "incoming": []}
            if target_id not in graph:
                graph[target_id] = {"outgoing": [], "incoming": []}
            graph[source_id]["outgoing"].append({"target": target_id, "connection": conn})
            graph[target_id]["incoming"].append({"source": source_id, "connection": conn})
        return graph

    def _find_sources(self) -> list[str]:
        sources: list[str] = []
        for obj_id, obj in self.objects.items():
            has_incoming = obj_id in self.flow_graph and self.flow_graph[obj_id]["incoming"]
            if not has_incoming and obj["object_type"]["code"] in {"production_well", "injection_well"}:
                sources.append(obj_id)
        return sources

    def _propagate_flow(self, node_id: str, node_flows: dict[str, dict[str, Decimal]]) -> None:
        if node_id not in self.flow_graph:
            return
        current_flow = node_flows.get(
            node_id,
            {"oil": Decimal(0), "water": Decimal(0), "gas": Decimal(0), "total_liquid": Decimal(0)},
        )
        for outgoing in self.flow_graph[node_id]["outgoing"]:
            target_id = outgoing["target"]
            if target_id not in node_flows:
                node_flows[target_id] = {"oil": Decimal(0), "water": Decimal(0), "gas": Decimal(0), "total_liquid": Decimal(0)}
            node_flows[target_id]["oil"] += current_flow["oil"]
            node_flows[target_id]["water"] += current_flow["water"]
            node_flows[target_id]["gas"] += current_flow["gas"]
            node_flows[target_id]["total_liquid"] += current_flow["total_liquid"]
            self._propagate_flow(target_id, node_flows)

    def calculate_flows(self) -> dict[str, Any]:
        sources = self._find_sources()
        node_flows: dict[str, dict[str, Decimal]] = {}
        for source_id in sources:
            source_obj = self.objects[source_id]
            properties = source_obj.get("properties") or {}
            debit_oil = Decimal(str(properties.get("debit_oil", 0)))
            debit_water = Decimal(str(properties.get("debit_water", 0)))
            debit_gas = Decimal(str(properties.get("debit_gas", 0)))
            total_liquid = debit_oil + debit_water
            node_flows[source_id] = {
                "oil": debit_oil,
                "water": debit_water,
                "gas": debit_gas,
                "total_liquid": total_liquid,
            }
            self._propagate_flow(source_id, node_flows)

        validation_messages: list[dict] = []
        bottlenecks: list[dict] = []

        for obj_id, flow in node_flows.items():
            obj = self.objects[obj_id]
            capacity = Decimal(str((obj.get("properties") or {}).get("capacity", 0)))
            if capacity > 0:
                utilization = (flow["total_liquid"] / capacity) * 100
                if utilization > 100:
                    bottlenecks.append(
                        {
                            "object_id": obj_id,
                            "object_code": obj.get("object_code"),
                            "capacity": float(capacity),
                            "actual_flow": float(flow["total_liquid"]),
                            "overload_pct": float(utilization - 100),
                        }
                    )
                    validation_messages.append(
                        {
                            "type": "error",
                            "object_id": obj_id,
                            "message": f"{obj.get('object_code')}: Превышение capacity на {utilization - 100:.1f}%",
                        }
                    )
                elif utilization > 95:
                    validation_messages.append(
                        {
                            "type": "warning",
                            "object_id": obj_id,
                            "message": f"{obj.get('object_code')}: Высокая загрузка {utilization:.1f}%",
                        }
                    )

        status = "errors" if bottlenecks else ("warnings" if validation_messages else "valid")
        node_flow_values = {
            node_id: {key: float(value) for key, value in flow.items()} for node_id, flow in node_flows.items()
        }
        return {
            "node_flows": node_flow_values,
            "bottlenecks": bottlenecks,
            "validation_messages": validation_messages,
            "status": status,
        }
