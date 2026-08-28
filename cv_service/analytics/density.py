"""
SEEMADRISHTI AI - Spatial Activity Density Engine (Phase 10)
Team: IQ100
SIH Problem Statement: SIH26187

Partitions the camera view into an N x M spatial grid.
Calculates numerical density: visits, dwell time, and movement frequency per cell.
"""

from typing import Any, Dict, List, Optional, Tuple


class SpatialDensityGrid:
    """
    Maintains a 2D spatial grid over the video frame to track activity density.
    """

    def __init__(
        self,
        camera_id: str,
        frame_width: int = 1920,
        frame_height: int = 1080,
        grid_rows: int = 8,
        grid_cols: int = 8,
    ):
        self.camera_id: str = camera_id
        self.frame_width: int = int(frame_width)
        self.frame_height: int = int(frame_height)
        self.grid_rows: int = int(grid_rows)
        self.grid_cols: int = int(grid_cols)

        self.cell_width: float = self.frame_width / float(self.grid_cols)
        self.cell_height: float = self.frame_height / float(self.grid_rows)

        # 2D stats per cell: (row, col) -> {"visits": int, "dwell_frames": int, "movement_count": int}
        self.cells: Dict[Tuple[int, int], Dict[str, int]] = {
            (r, c): {"visits": 0, "dwell_frames": 0, "movement_count": 0}
            for r in range(self.grid_rows)
            for c in range(self.grid_cols)
        }

        # Track previous cell per track_id to detect cell entry/transitions
        self.track_prev_cell: Dict[int, Tuple[int, int]] = {}

    def get_cell_for_point(self, x: float, y: float) -> Tuple[int, int]:
        c = int(max(0, min(self.grid_cols - 1, x // self.cell_width)))
        r = int(max(0, min(self.grid_rows - 1, y // self.cell_height)))
        return (r, c)

    def record_centroids(self, tracks: List[Dict[str, Any]]):
        """
        Ingests active tracks, mapping centroids to grid cells.
        Updates visits, dwell, and movement counters.
        """
        for trk in tracks:
            tid = int(trk.get("track_id", 0))
            cx, cy = trk.get("centroid", (0.0, 0.0))
            cell = self.get_cell_for_point(cx, cy)

            if cell not in self.cells:
                continue

            # Cell dwell
            self.cells[cell]["dwell_frames"] += 1

            # Cell visit (target moved into this cell from outside or new track)
            prev_cell = self.track_prev_cell.get(tid)
            if prev_cell != cell:
                self.cells[cell]["visits"] += 1
                self.track_prev_cell[tid] = cell

            # Movement count
            speed = float(trk.get("speed", 0.0))
            if speed > 1.0:
                self.cells[cell]["movement_count"] += 1

    def get_density_matrix(self) -> List[Dict[str, Any]]:
        """
        Returns structured list of cells with their coordinates, visits, and dwell.
        """
        output = []
        for (r, c), data in self.cells.items():
            output.append({
                "row": r,
                "col": c,
                "bounds": {
                    "x1": round(c * self.cell_width, 1),
                    "y1": round(r * self.cell_height, 1),
                    "x2": round((c + 1) * self.cell_width, 1),
                    "y2": round((r + 1) * self.cell_height, 1),
                },
                "visits": data["visits"],
                "dwell_frames": data["dwell_frames"],
                "movement_count": data["movement_count"],
            })
        return output

    def get_top_hotspots(self, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Returns top activity hotspots sorted by visits and dwell.
        """
        matrix = self.get_density_matrix()
        # Sort primarily by visits, then dwell_frames
        sorted_cells = sorted(matrix, key=lambda c: (c["visits"], c["dwell_frames"]), reverse=True)
        return sorted_cells[:limit]

    def reset(self):
        for cell in self.cells.values():
            cell["visits"] = 0
            cell["dwell_frames"] = 0
            cell["movement_count"] = 0
        self.track_prev_cell.clear()
