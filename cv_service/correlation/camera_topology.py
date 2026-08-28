"""
SEEMADRISHTI AI - Camera Topology & Spatial-Temporal Sector Relationship Model (Phase 8)

Team: IQ100
Problem Statement: SIH26187

Manages camera-to-camera directed graphs, sector connectivity, travel time boundaries
(min_travel_seconds, max_travel_seconds), and topological transition validity.
Does NOT require GPS; represents monitored-sector relationships along border fence/sectors.
"""

from dataclasses import dataclass, field, asdict
import json
import os
from typing import Dict, List, Optional, Set, Tuple


@dataclass
class CameraEdge:
    from_camera_id: str
    to_camera_id: str
    min_travel_seconds: float = 3.0
    max_travel_seconds: float = 45.0
    distance_meters: float = 120.0
    bidirectional: bool = True
    sector_name: str = "Border Corridor"

    def to_dict(self) -> Dict:
        return asdict(self)


class CameraTopology:
    """
    Graph representation of surveillance camera topology.
    Maps monitored sectors, transition corridors, and temporal boundaries.
    """

    def __init__(self, config_path: Optional[str] = None):
        self._adjacency: Dict[str, Dict[str, CameraEdge]] = {}
        self._camera_nodes: Set[str] = set()

        if config_path and os.path.exists(config_path):
            self.load_from_json(config_path)
        else:
            self._load_default_border_topology()

    def _normalize_cam_id(self, cam_id: str) -> str:
        return cam_id.strip().lower() if cam_id else ""

    def add_camera_node(self, camera_id: str) -> None:
        cid = self._normalize_cam_id(camera_id)
        if cid:
            self._camera_nodes.add(cid)
            if cid not in self._adjacency:
                self._adjacency[cid] = {}

    def add_relationship(
        self,
        from_camera_id: str,
        to_camera_id: str,
        min_travel_seconds: float = 3.0,
        max_travel_seconds: float = 45.0,
        distance_meters: float = 120.0,
        bidirectional: bool = True,
        sector_name: str = "Border Sector",
    ) -> None:
        c1 = self._normalize_cam_id(from_camera_id)
        c2 = self._normalize_cam_id(to_camera_id)

        if not c1 or not c2 or c1 == c2:
            return

        self.add_camera_node(c1)
        self.add_camera_node(c2)

        edge_forward = CameraEdge(
            from_camera_id=c1,
            to_camera_id=c2,
            min_travel_seconds=float(min_travel_seconds),
            max_travel_seconds=float(max_travel_seconds),
            distance_meters=float(distance_meters),
            bidirectional=bidirectional,
            sector_name=sector_name,
        )
        self._adjacency[c1][c2] = edge_forward

        if bidirectional:
            edge_reverse = CameraEdge(
                from_camera_id=c2,
                to_camera_id=c1,
                min_travel_seconds=float(min_travel_seconds),
                max_travel_seconds=float(max_travel_seconds),
                distance_meters=float(distance_meters),
                bidirectional=True,
                sector_name=sector_name,
            )
            self._adjacency[c2][c1] = edge_reverse

    def remove_relationship(self, from_camera_id: str, to_camera_id: str, bidirectional: bool = True) -> None:
        c1 = self._normalize_cam_id(from_camera_id)
        c2 = self._normalize_cam_id(to_camera_id)

        if c1 in self._adjacency and c2 in self._adjacency[c1]:
            del self._adjacency[c1][c2]

        if bidirectional and c2 in self._adjacency and c1 in self._adjacency[c2]:
            del self._adjacency[c2][c1]

    def are_cameras_connected(self, from_camera_id: str, to_camera_id: str) -> bool:
        c1 = self._normalize_cam_id(from_camera_id)
        c2 = self._normalize_cam_id(to_camera_id)
        if not c1 or not c2 or c1 == c2:
            return False
        return c1 in self._adjacency and c2 in self._adjacency[c1]

    def get_relationship(self, from_camera_id: str, to_camera_id: str) -> Optional[CameraEdge]:
        c1 = self._normalize_cam_id(from_camera_id)
        c2 = self._normalize_cam_id(to_camera_id)
        if c1 in self._adjacency:
            return self._adjacency[c1].get(c2)
        return None

    def is_transition_timely(
        self,
        from_camera_id: str,
        to_camera_id: str,
        elapsed_seconds: float,
        tolerance_factor: float = 1.0,
    ) -> Tuple[bool, str]:
        """
        Validates whether elapsed_seconds falls within configured travel boundaries.
        Returns (is_valid, reason_message).
        """
        edge = self.get_relationship(from_camera_id, to_camera_id)
        if not edge:
            return False, f"Cameras '{from_camera_id}' and '{to_camera_id}' are not connected in topology"

        min_t = edge.min_travel_seconds * (1.0 / tolerance_factor)
        max_t = edge.max_travel_seconds * tolerance_factor

        if elapsed_seconds < min_t:
            return False, f"Transition too fast ({elapsed_seconds:.1f}s < minimum {min_t:.1f}s)"
        if elapsed_seconds > max_t:
            return False, f"Transition expired ({elapsed_seconds:.1f}s > maximum {max_t:.1f}s)"

        return True, f"Transition within valid travel window ({min_t:.1f}s - {max_t:.1f}s)"

    def get_connected_cameras(self, camera_id: str) -> List[str]:
        cid = self._normalize_cam_id(camera_id)
        if cid in self._adjacency:
            return sorted(list(self._adjacency[cid].keys()))
        return []

    def get_all_edges(self) -> List[CameraEdge]:
        edges: List[CameraEdge] = []
        for c1, dests in self._adjacency.items():
            for c2, edge in dests.items():
                edges.append(edge)
        return edges

    def to_json(self) -> str:
        data = {
            "camera_nodes": sorted(list(self._camera_nodes)),
            "edges": [edge.to_dict() for edge in self.get_all_edges()],
        }
        return json.dumps(data, indent=2)

    def save_to_json(self, file_path: str) -> None:
        os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(self.to_json())

    def load_from_json(self, file_path: str) -> None:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self._adjacency.clear()
        self._camera_nodes.clear()

        for node in data.get("camera_nodes", []):
            self.add_camera_node(node)

        for edge_data in data.get("edges", []):
            self.add_relationship(
                from_camera_id=edge_data["from_camera_id"],
                to_camera_id=edge_data["to_camera_id"],
                min_travel_seconds=edge_data.get("min_travel_seconds", 3.0),
                max_travel_seconds=edge_data.get("max_travel_seconds", 45.0),
                distance_meters=edge_data.get("distance_meters", 120.0),
                bidirectional=edge_data.get("bidirectional", True),
                sector_name=edge_data.get("sector_name", "Border Sector"),
            )

    def _load_default_border_topology(self) -> None:
        """
        Default SEEMADRISHTI Border Surveillance topology:
        CAM-01 (Sector Alpha Main Gate)
          ↕ (3s - 30s, 120m)
        CAM-02 (Sector Alpha Restricted Perimeter)
          ↕ (4s - 45s, 180m)
        CAM-03 (Sector Bravo Northern Ridge)
          ↕ (5s - 60s, 240m)
        CAM-04 (Sector Charlie Outpost)
        """
        self.add_relationship(
            from_camera_id="cam-01",
            to_camera_id="cam-02",
            min_travel_seconds=3.0,
            max_travel_seconds=30.0,
            distance_meters=120.0,
            bidirectional=True,
            sector_name="Sector Alpha Main Corridor",
        )
        self.add_relationship(
            from_camera_id="cam-02",
            to_camera_id="cam-03",
            min_travel_seconds=4.0,
            max_travel_seconds=45.0,
            distance_meters=180.0,
            bidirectional=True,
            sector_name="Sector Alpha to Bravo Ridge Corridor",
        )
        self.add_relationship(
            from_camera_id="cam-03",
            to_camera_id="cam-04",
            min_travel_seconds=5.0,
            max_travel_seconds=60.0,
            distance_meters=240.0,
            bidirectional=True,
            sector_name="Sector Bravo to Charlie Outpost",
        )
        self.add_relationship(
            from_camera_id="cam-01",
            to_camera_id="cam-04",
            min_travel_seconds=10.0,
            max_travel_seconds=120.0,
            distance_meters=380.0,
            bidirectional=True,
            sector_name="Sector Alpha Direct Outpost Transit",
        )
