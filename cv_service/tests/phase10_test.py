"""
SEEMADRISHTI AI - Phase 10 Comprehensive Verification Test Suite
Team: IQ100
SIH Problem Statement: SIH26187

Covers:
- Group A: Trajectory Tracking (Tests 1-5)
- Group B: Direction Analysis (Tests 6-12)
- Group C: Movement Speed (Tests 13-17)
- Group D: Entry / Exit Detection (Tests 18-25)
- Group E: Zone Occupancy (Tests 26-29)
- Group F: Spatial Density (Tests 30-33)
- Group G: Temporal Aggregation (Tests 34-36)
- Group H: Baseline Learning (Tests 37-39)
- Group I: Anomaly Detection (Tests 40-43)
- Group J: Group Movement (Tests 44-47)
- Group K: Backend REST & WebSocket (Tests 48-52)
- Group L: Regression Suites & Production Builds (Tests 53-63)
"""

import asyncio
import json
import os
import subprocess
import sys
import time
from typing import Any, Dict, List

import requests

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from cv_service.analytics.trajectory import TrackTrajectory, TrajectoryEngine
from cv_service.analytics.direction import DirectionAnalyzer
from cv_service.analytics.speed import SpeedCalculator
from cv_service.analytics.counter import EntryExitCounter, ZoneTransitionTracker
from cv_service.analytics.occupancy import OccupancyEngine, ZoneOccupancyTracker
from cv_service.analytics.density import SpatialDensityGrid
from cv_service.analytics.corridor import CorridorAnalyzer, CorridorStats
from cv_service.analytics.temporal import TemporalAggregator, TemporalBucket
from cv_service.analytics.baseline import BaselineLearner, HourlyMetricBaseline
from cv_service.analytics.anomaly import AnomalyDetector
from cv_service.analytics.group_movement import GroupMovementDetector, CoordinatedGroup
from cv_service.analytics.engine import MovementAnalyticsEngine
from cv_service.risk.engine import RiskEngine

TEST_RESULTS: List[Dict[str, Any]] = []


def report_test(test_id: str, name: str, passed: bool, details: str = ""):
    status = "[PASS]" if passed else "[FAIL]"
    print(f"  {status} {test_id}: {name} -> {details}")
    TEST_RESULTS.append({"test_id": test_id, "name": name, "passed": passed, "details": details})


def run_phase10_suite():
    print("\n===================================================================")
    print("[TEST SUITE] RUNNING SEEMADRISHTI PHASE 10 MOVEMENT & BEHAVIOR TESTS")
    print("===================================================================\n")

    # -------------------------------------------------------------------------
    # TEST GROUP A: TRAJECTORY TRACKING (Tests 1 - 5)
    # -------------------------------------------------------------------------
    try:
        traj = TrackTrajectory("cam-01", 1, "person", [100, 100, 200, 300], 100.0, max_history_points=5)
        passed = traj.track_id == 1 and traj.point_count == 1 and traj.total_distance == 0.0
        report_test("Test 01", "Trajectory Initialization", passed, f"ID: {traj.track_id}, points: {traj.point_count}")
    except Exception as e:
        report_test("Test 01", "Trajectory Initialization", False, str(e))

    try:
        traj = TrackTrajectory("cam-01", 2, "person", [100, 200, 300, 400], 100.0)
        cx, cy = traj.latest_centroid
        passed = cx == 200.0 and cy == 300.0
        report_test("Test 02", "Centroid Calculation", passed, f"Centroid: ({cx}, {cy})")
    except Exception as e:
        report_test("Test 02", "Centroid Calculation", False, str(e))

    try:
        traj = TrackTrajectory("cam-01", 3, "person", [100, 100, 150, 150], 100.0)
        traj.update([130, 140, 180, 190], 101.0)
        passed = traj.point_count == 2 and traj.total_distance > 0.0 and traj.average_speed > 0.0
        report_test("Test 03", "Trajectory Update & Path Distance", passed, f"Dist: {traj.total_distance:.1f}px, Speed: {traj.average_speed}px/s")
    except Exception as e:
        report_test("Test 03", "Trajectory Update & Path Distance", False, str(e))

    try:
        traj = TrackTrajectory("cam-01", 4, "person", [0, 0, 10, 10], 100.0, max_history_points=3)
        for i in range(1, 10):
            traj.update([i*10, i*10, i*10+10, i*10+10], 100.0 + i)
        passed = traj.point_count == 3
        report_test("Test 04", "Trajectory Max History Limit", passed, f"Bounded count: {traj.point_count} (max 3)")
    except Exception as e:
        report_test("Test 04", "Trajectory Max History Limit", False, str(e))

    try:
        traj = TrackTrajectory("cam-01", 5, "person", [0, 0, 10, 10], 50.0)
        traj.update([10, 10, 20, 20], 55.0)
        traj.update([20, 20, 30, 30], 60.0)
        passed = traj.first_seen == 50.0 and traj.last_seen == 60.0 and len(traj.timestamps) == 3
        report_test("Test 05", "Trajectory Timestamp Tracking", passed, f"Span: {traj.first_seen}s -> {traj.last_seen}s")
    except Exception as e:
        report_test("Test 05", "Trajectory Timestamp Tracking", False, str(e))

    # -------------------------------------------------------------------------
    # TEST GROUP B: DIRECTION ANALYSIS (Tests 6 - 12)
    # -------------------------------------------------------------------------
    da = DirectionAnalyzer(min_displacement_px=3.0, window_size=5)

    try:
        # East: x increasing, y constant
        dir_e = da.calculate_direction([(100.0, 100.0), (120.0, 100.0)])
        report_test("Test 06", "East Movement Direction", dir_e == "EAST", f"Classified: {dir_e}")
    except Exception as e:
        report_test("Test 06", "East Movement Direction", False, str(e))

    try:
        # West: x decreasing, y constant
        dir_w = da.calculate_direction([(200.0, 100.0), (170.0, 100.0)])
        report_test("Test 07", "West Movement Direction", dir_w == "WEST", f"Classified: {dir_w}")
    except Exception as e:
        report_test("Test 07", "West Movement Direction", False, str(e))

    try:
        # North: x constant, y decreasing in image coordinates
        dir_n = da.calculate_direction([(100.0, 200.0), (100.0, 170.0)])
        report_test("Test 08", "North Movement Direction", dir_n == "NORTH", f"Classified: {dir_n}")
    except Exception as e:
        report_test("Test 08", "North Movement Direction", False, str(e))

    try:
        # South: x constant, y increasing in image coordinates
        dir_s = da.calculate_direction([(100.0, 100.0), (100.0, 140.0)])
        report_test("Test 09", "South Movement Direction", dir_s == "SOUTH", f"Classified: {dir_s}")
    except Exception as e:
        report_test("Test 09", "South Movement Direction", False, str(e))

    try:
        # Diagonal: Southeast (x+, y+)
        dir_se = da.calculate_direction([(100.0, 100.0), (130.0, 130.0)])
        report_test("Test 10", "Diagonal Movement Direction", dir_se == "SOUTHEAST", f"Classified: {dir_se}")
    except Exception as e:
        report_test("Test 10", "Diagonal Movement Direction", False, str(e))

    try:
        # Stationary: displacement < min_displacement_px (3px)
        dir_stat = da.calculate_direction([(100.0, 100.0), (101.0, 101.0)])
        report_test("Test 11", "Stationary Movement Suppression", dir_stat == "STATIONARY", f"Classified: {dir_stat}")
    except Exception as e:
        report_test("Test 11", "Stationary Movement Suppression", False, str(e))

    try:
        # Jitter: insufficient points or single point
        dir_unk = da.calculate_direction([(100.0, 100.0)])
        report_test("Test 12", "Jitter & Sub-pixel Noise Filtering", dir_unk == "UNKNOWN", f"Classified: {dir_unk}")
    except Exception as e:
        report_test("Test 12", "Jitter & Sub-pixel Noise Filtering", False, str(e))

    # -------------------------------------------------------------------------
    # TEST GROUP C: MOVEMENT SPEED (Tests 13 - 17)
    # -------------------------------------------------------------------------
    sp_calc = SpeedCalculator(max_valid_speed_px_s=500.0)

    try:
        # 100px in 2 seconds = 50 px/s
        s = sp_calc.calculate_current_speed([(0.0, 0.0), (100.0, 0.0)], [0.0, 2.0])
        report_test("Test 13", "Movement Speed Calculation", abs(s - 50.0) < 0.1, f"Speed: {s} px/s")
    except Exception as e:
        report_test("Test 13", "Movement Speed Calculation", False, str(e))

    try:
        # Zero dt handling
        s_zero = sp_calc.calculate_current_speed([(0.0, 0.0), (100.0, 0.0)], [2.0, 2.0])
        report_test("Test 14", "Zero Elapsed Time Handling", s_zero == 0.0, f"Speed: {s_zero}")
    except Exception as e:
        report_test("Test 14", "Zero Elapsed Time Handling", False, str(e))

    try:
        avg_s = sp_calc.calculate_average_speed(300.0, 10.0)
        report_test("Test 15", "Average Speed Calculation", avg_s == 30.0, f"Avg Speed: {avg_s} px/s")
    except Exception as e:
        report_test("Test 15", "Average Speed Calculation", False, str(e))

    try:
        avg_s_zero = sp_calc.calculate_average_speed(100.0, 0.0)
        report_test("Test 16", "Zero Duration Speed Handling", avg_s_zero == 0.0, f"Safe output: {avg_s_zero}")
    except Exception as e:
        report_test("Test 16", "Zero Duration Speed Handling", False, str(e))

    try:
        # Speed spike suppression (> 500 px/s)
        spike_s = sp_calc.calculate_current_speed([(0.0, 0.0), (1000.0, 0.0)], [0.0, 0.1])
        report_test("Test 17", "Teleportation Speed Spike Suppression", spike_s == 0.0, f"Spike filtered: {spike_s}")
    except Exception as e:
        report_test("Test 17", "Teleportation Speed Spike Suppression", False, str(e))

    # -------------------------------------------------------------------------
    # TEST GROUP D: ENTRY / EXIT DETECTION (Tests 18 - 25)
    # -------------------------------------------------------------------------
    poly = [(100.0, 100.0), (300.0, 100.0), (300.0, 300.0), (100.0, 300.0)]
    zt = ZoneTransitionTracker("cam-01", "zone-01", "Restricted Area", poly)

    try:
        # Outside track: no transition
        ev1 = zt.process_track(1, "person", (50.0, 50.0), "EAST", 10.0, 100.0)
        report_test("Test 18", "Outside Target Produces No Event", ev1 is None, f"Event: {ev1}")
    except Exception as e:
        report_test("Test 18", "Outside Target Produces No Event", False, str(e))

    try:
        # Entry transition: moves from outside (50, 50) to inside (200, 200)
        ev_entry = zt.process_track(1, "person", (200.0, 200.0), "EAST", 10.0, 101.0)
        passed = ev_entry is not None and ev_entry["event_type"] == "ENTRY" and zt.total_entries == 1
        report_test("Test 19", "OUTSIDE -> INSIDE Entry Detection", passed, f"Event: {ev_entry['event_type'] if ev_entry else None}")
    except Exception as e:
        report_test("Test 19", "OUTSIDE -> INSIDE Entry Detection", False, str(e))

    try:
        # Repeated inside frame produces no duplicate entry
        ev_inside = zt.process_track(1, "person", (210.0, 210.0), "EAST", 10.0, 102.0)
        report_test("Test 20", "Repeated Inside Frames Suppressed", ev_inside is None, f"Suppressed duplicate: {ev_inside}")
    except Exception as e:
        report_test("Test 20", "Repeated Inside Frames Suppressed", False, str(e))

    try:
        # Exit transition: moves from inside (210, 210) to outside (50, 50)
        ev_exit = zt.process_track(1, "person", (50.0, 50.0), "WEST", 10.0, 103.0)
        passed = ev_exit is not None and ev_exit["event_type"] == "EXIT" and zt.total_exits == 1
        report_test("Test 21", "INSIDE -> OUTSIDE Exit Detection", passed, f"Event: {ev_exit['event_type'] if ev_exit else None}")
    except Exception as e:
        report_test("Test 21", "INSIDE -> OUTSIDE Exit Detection", False, str(e))

    try:
        # Re-entry: moves inside again
        ev_reentry = zt.process_track(1, "person", (200.0, 200.0), "EAST", 10.0, 104.0)
        passed = ev_reentry is not None and ev_reentry["event_type"] == "ENTRY" and zt.total_entries == 2
        report_test("Test 22", "Re-entry Detection & Tally", passed, f"Total Entries: {zt.total_entries}")
    except Exception as e:
        report_test("Test 22", "Re-entry Detection & Tally", False, str(e))

    try:
        # Multi-track: Track 2 enters while Track 1 is inside
        ev_t2 = zt.process_track(2, "car", (250.0, 250.0), "SOUTH", 25.0, 105.0)
        stats = zt.get_stats()
        passed = ev_t2 is not None and stats["current_occupants"] == 2
        report_test("Test 23", "Multiple Simultaneous Tracks Handled", passed, f"Occupants: {stats['current_occupants']}")
    except Exception as e:
        report_test("Test 23", "Multiple Simultaneous Tracks Handled", False, str(e))

    try:
        # Multiple zones on counter engine
        eec = EntryExitCounter()
        eec.register_zone("cam-01", "z1", "Zone 1", [(0, 0), (100, 0), (100, 100), (0, 100)])
        eec.register_zone("cam-01", "z2", "Zone 2", [(200, 200), (300, 200), (300, 300), (200, 300)])
        evs = eec.process_tracks("cam-01", [{"track_id": 9, "class_name": "person", "centroid": (50, 50)}])
        z1_stat = eec.get_zone_stats("cam-01", "z1")
        z2_stat = eec.get_zone_stats("cam-01", "z2")
        passed = len(evs) == 1 and z1_stat["current_occupants"] == 1 and z2_stat["current_occupants"] == 0
        report_test("Test 24", "Multiple Zones Maintained Independently", passed, f"Z1: {z1_stat['current_occupants']}, Z2: {z2_stat['current_occupants']}")
    except Exception as e:
        report_test("Test 24", "Multiple Zones Maintained Independently", False, str(e))

    try:
        # Multiple cameras on counter engine
        eec.register_zone("cam-02", "z1", "Zone 1 Cam 2", [(0, 0), (100, 0), (100, 100), (0, 100)])
        eec.process_tracks("cam-02", [{"track_id": 9, "class_name": "person", "centroid": (50, 50)}])
        all_stats = eec.get_all_stats()
        passed = len(all_stats) == 3
        report_test("Test 25", "Multiple Cameras Maintained Independently", passed, f"Total zones tracked: {len(all_stats)}")
    except Exception as e:
        report_test("Test 25", "Multiple Cameras Maintained Independently", False, str(e))

    # -------------------------------------------------------------------------
    # TEST GROUP E: ZONE OCCUPANCY (Tests 26 - 29)
    # -------------------------------------------------------------------------
    occ_eng = OccupancyEngine()
    occ_eng.register_zone("cam-01", "z-alpha", "Alpha Zone", [(0, 0), (200, 0), (200, 200), (0, 200)])

    try:
        # 2 tracks inside
        tracks_t1 = [
            {"track_id": 1, "class_name": "person", "centroid": (50, 50)},
            {"track_id": 2, "class_name": "car", "centroid": (100, 100)},
        ]
        res1 = occ_eng.update_camera("cam-01", tracks_t1, 100.0)
        passed = res1[0]["current_occupants"] == 2 and res1[0]["is_occupied"] is True
        report_test("Test 26", "Current Zone Occupancy Calculation", passed, f"Occupants: {res1[0]['current_occupants']}")
    except Exception as e:
        report_test("Test 26", "Current Zone Occupancy Calculation", False, str(e))

    try:
        # Add 3rd track -> peak becomes 3
        tracks_t2 = tracks_t1 + [{"track_id": 3, "class_name": "person", "centroid": (150, 150)}]
        res2 = occ_eng.update_camera("cam-01", tracks_t2, 101.0)
        passed = res2[0]["peak_occupants"] == 3
        report_test("Test 27", "Peak Occupancy Tracking", passed, f"Peak: {res2[0]['peak_occupants']}")
    except Exception as e:
        report_test("Test 27", "Peak Occupancy Tracking", False, str(e))

    try:
        # Average occupancy across observations: (2 + 3) / 2 = 2.5
        stat = occ_eng.get_zone_stats("cam-01", "z-alpha")
        passed = stat["average_occupants"] == 2.5
        report_test("Test 28", "Average Occupancy Calculation", passed, f"Avg: {stat['average_occupants']}")
    except Exception as e:
        report_test("Test 28", "Average Occupancy Calculation", False, str(e))

    try:
        # Class breakdown: 2 persons, 1 car
        stat = occ_eng.get_zone_stats("cam-01", "z-alpha")
        bd = stat["class_breakdown"]
        passed = bd.get("person") == 2 and bd.get("car") == 1
        report_test("Test 29", "Occupancy Class Breakdown", passed, f"Breakdown: {bd}")
    except Exception as e:
        report_test("Test 29", "Occupancy Class Breakdown", False, str(e))

    # -------------------------------------------------------------------------
    # TEST GROUP F: SPATIAL DENSITY (Tests 30 - 33)
    # -------------------------------------------------------------------------
    grid = SpatialDensityGrid("cam-01", 1920, 1080, grid_rows=4, grid_cols=4)

    try:
        matrix = grid.get_density_matrix()
        passed = len(matrix) == 16
        report_test("Test 30", "Spatial Grid Generation (4x4)", passed, f"Total cells: {len(matrix)}")
    except Exception as e:
        report_test("Test 30", "Spatial Grid Generation (4x4)", False, str(e))

    try:
        # Point at (100, 100) -> cell (0, 0)
        grid.record_centroids([{"track_id": 1, "centroid": (100.0, 100.0), "speed": 10.0}])
        matrix = grid.get_density_matrix()
        cell_0_0 = next(c for c in matrix if c["row"] == 0 and c["col"] == 0)
        passed = cell_0_0["visits"] == 1 and cell_0_0["dwell_frames"] == 1
        report_test("Test 31", "Centroid Density Recording", passed, f"Visits: {cell_0_0['visits']}, Dwell: {cell_0_0['dwell_frames']}")
    except Exception as e:
        report_test("Test 31", "Centroid Density Recording", False, str(e))

    try:
        grid_empty = SpatialDensityGrid("cam-02", 1920, 1080, 2, 2)
        m_empty = grid_empty.get_density_matrix()
        passed = all(c["visits"] == 0 and c["dwell_frames"] == 0 for c in m_empty)
        report_test("Test 32", "Empty Grid Default State", passed, "All cells zero visits and dwell")
    except Exception as e:
        report_test("Test 32", "Empty Grid Default State", False, str(e))

    try:
        # Hotspot ranking
        for _ in range(5):
            grid.record_centroids([{"track_id": 2, "centroid": (100.0, 100.0), "speed": 5.0}])
        hotspots = grid.get_top_hotspots(limit=1)
        passed = len(hotspots) == 1 and hotspots[0]["row"] == 0 and hotspots[0]["col"] == 0
        report_test("Test 33", "Activity Hotspot Ranking", passed, f"Top cell: ({hotspots[0]['row']}, {hotspots[0]['col']}) with {hotspots[0]['dwell_frames']} frames")
    except Exception as e:
        report_test("Test 33", "Activity Hotspot Ranking", False, str(e))

    # -------------------------------------------------------------------------
    # TEST GROUP G: TEMPORAL ANALYTICS (Tests 34 - 36)
    # -------------------------------------------------------------------------
    temp = TemporalAggregator()

    try:
        # 1-minute bucket aggregation
        temp.record_event("cam-01", "ENTRY", "person", count=5, timestamp=1000.0)
        temp.record_event("cam-01", "EXIT", "person", count=2, timestamp=1010.0)
        buckets_1m = temp.get_buckets("cam-01", "1m")
        passed = len(buckets_1m) == 1 and buckets_1m[0]["entries"] == 5 and buckets_1m[0]["exits"] == 2
        report_test("Test 34", "1-Minute Window Temporal Aggregation", passed, f"Entries: {buckets_1m[0]['entries']}, Exits: {buckets_1m[0]['exits']}")
    except Exception as e:
        report_test("Test 34", "1-Minute Window Temporal Aggregation", False, str(e))

    try:
        # 1-hour bucket aggregation
        temp.record_event("cam-01", "INTRUSION", "person", count=3, timestamp=1000.0)
        buckets_1h = temp.get_buckets("cam-01", "1h")
        passed = len(buckets_1h) == 1 and buckets_1h[0]["intrusion_count"] == 3
        report_test("Test 35", "1-Hour Window Temporal Aggregation", passed, f"Intrusions: {buckets_1h[0]['intrusion_count']}")
    except Exception as e:
        report_test("Test 35", "1-Hour Window Temporal Aggregation", False, str(e))

    try:
        # Time range filtering
        b_filtered = temp.get_buckets("cam-01", "1m", from_ts=500.0, to_ts=1500.0)
        passed = len(b_filtered) == 1
        report_test("Test 36", "Temporal Date / Timestamp Range Filtering", passed, f"Matched buckets: {len(b_filtered)}")
    except Exception as e:
        report_test("Test 36", "Temporal Date / Timestamp Range Filtering", False, str(e))

    # -------------------------------------------------------------------------
    # TEST GROUP H: BASELINE LEARNING (Tests 37 - 39)
    # -------------------------------------------------------------------------
    bl = BaselineLearner(min_samples=3)

    try:
        # Insufficient data
        bl.record_observation("cam-01", "zone-1", 14, "entries", 5.0)
        res_insuf = bl.evaluate_metric("cam-01", "zone-1", 14, "entries", 10.0)
        passed = res_insuf["baseline_status"] == "INSUFFICIENT_DATA"
        report_test("Test 37", "Insufficient Data Baseline Status", passed, f"Status: {res_insuf['baseline_status']}")
    except Exception as e:
        report_test("Test 37", "Insufficient Data Baseline Status", False, str(e))

    try:
        # Record enough samples to establish baseline: 5, 5, 5 -> mean 5.0, std 0.0
        bl.record_observation("cam-01", "zone-1", 14, "entries", 5.0)
        bl.record_observation("cam-01", "zone-1", 14, "entries", 5.0)
        res_est = bl.evaluate_metric("cam-01", "zone-1", 14, "entries", 5.0)
        passed = res_est["baseline_status"] == "ESTABLISHED" and res_est["baseline_mean"] == 5.0
        report_test("Test 38", "Established Baseline Mean Calculation", passed, f"Mean: {res_est['baseline_mean']}")
    except Exception as e:
        report_test("Test 38", "Established Baseline Mean Calculation", False, str(e))

    try:
        # Deviation calculation: 15 entries / 5.0 mean = 3.0x
        res_dev = bl.evaluate_metric("cam-01", "zone-1", 14, "entries", 15.0)
        passed = res_dev["deviation_ratio"] == 3.0
        report_test("Test 39", "Mathematical Deviation Ratio Calculation", passed, f"Deviation: {res_dev['deviation_ratio']}x")
    except Exception as e:
        report_test("Test 39", "Mathematical Deviation Ratio Calculation", False, str(e))

    # -------------------------------------------------------------------------
    # TEST GROUP I: ANOMALY DETECTION (Tests 40 - 43)
    # -------------------------------------------------------------------------
    anom_det = AnomalyDetector(bl, entry_anomaly_ratio=2.5, occupancy_anomaly_ratio=2.0)

    try:
        # Normal traffic within baseline -> no anomaly
        norm_anom = anom_det.evaluate_entry_count("cam-01", "zone-1", 6, 14, 100.0)
        report_test("Test 40", "Normal Flow Produces Zero Anomalies", norm_anom is None, "Suppressed normal fluctuation")
    except Exception as e:
        report_test("Test 40", "Normal Flow Produces Zero Anomalies", False, str(e))

    try:
        # High volume anomaly: 18 entries vs baseline 5.0 (3.6x)
        high_anom = anom_det.evaluate_entry_count("cam-01", "zone-1", 18, 14, 200.0)
        passed = high_anom is not None and high_anom["anomaly_type"] == "HIGH_VOLUME_ENTRY" and high_anom["severity"] in ("HIGH", "CRITICAL")
        report_test("Test 41", "High Volume Entry Anomaly Detection", passed, f"Type: {high_anom['anomaly_type'] if high_anom else None}")
    except Exception as e:
        report_test("Test 41", "High Volume Entry Anomaly Detection", False, str(e))

    try:
        # Occupancy anomaly: set baseline 2, 2, 2 -> test 6 occupants (3.0x)
        bl.record_observation("cam-01", "zone-1", 14, "occupancy", 2.0)
        bl.record_observation("cam-01", "zone-1", 14, "occupancy", 2.0)
        bl.record_observation("cam-01", "zone-1", 14, "occupancy", 2.0)
        occ_anom = anom_det.evaluate_occupancy("cam-01", "zone-1", 6, 14, 300.0)
        passed = occ_anom is not None and occ_anom["anomaly_type"] == "ABNORMAL_OCCUPANCY"
        report_test("Test 42", "Abnormal Zone Occupancy Anomaly Detection", passed, f"Severity: {occ_anom['severity'] if occ_anom else None}")
    except Exception as e:
        report_test("Test 42", "Abnormal Zone Occupancy Anomaly Detection", False, str(e))

    try:
        # Explainable reason format verification
        assert high_anom is not None
        reason = high_anom["reason"]
        passed = "recorded 18 entries" in reason and "learned baseline" in reason and "3.6×" in reason
        report_test("Test 43", "Explainable Human-Readable Reason Format", passed, f"Reason: '{reason}'")
    except Exception as e:
        report_test("Test 43", "Explainable Human-Readable Reason Format", False, str(e))

    # -------------------------------------------------------------------------
    # TEST GROUP J: GROUP MOVEMENT DETECTION (Tests 44 - 47)
    # -------------------------------------------------------------------------
    grp_det = GroupMovementDetector(max_separation_px=100.0, min_group_size=2, min_frames=2)

    try:
        # Frame 1: Tracks 1 & 2 moving East in proximity
        t_f1 = [
            {"track_id": 1, "centroid": (100.0, 100.0), "direction": "EAST", "speed": 15.0},
            {"track_id": 2, "centroid": (130.0, 100.0), "direction": "EAST", "speed": 16.0},
        ]
        # Frame 2: Persist group
        t_f2 = [
            {"track_id": 1, "centroid": (115.0, 100.0), "direction": "EAST", "speed": 15.0},
            {"track_id": 2, "centroid": (145.0, 100.0), "direction": "EAST", "speed": 16.0},
        ]
        grp_det.process_tracks("cam-01", t_f1, 100.0)
        groups = grp_det.process_tracks("cam-01", t_f2, 101.0)
        passed = len(groups) == 1 and groups[0]["size"] == 2 and groups[0]["direction"] == "EAST"
        report_test("Test 44", "Coordinated Group Movement Detection", passed, f"Group size: {groups[0]['size'] if groups else 0}, Dir: {groups[0]['direction'] if groups else None}")
    except Exception as e:
        report_test("Test 44", "Coordinated Group Movement Detection", False, str(e))

    try:
        # Spatial separation: Distant tracks (> 100px apart) should NOT form a group
        grp_det_sep = GroupMovementDetector(max_separation_px=50.0, min_group_size=2, min_frames=1)
        t_distant = [
            {"track_id": 10, "centroid": (100.0, 100.0), "direction": "EAST", "speed": 15.0},
            {"track_id": 11, "centroid": (500.0, 500.0), "direction": "EAST", "speed": 15.0},
        ]
        g_sep = grp_det_sep.process_tracks("cam-01", t_distant, 200.0)
        report_test("Test 45", "Distant Targets Do Not Form Group", len(g_sep) == 0, f"Groups found: {len(g_sep)}")
    except Exception as e:
        report_test("Test 45", "Distant Targets Do Not Form Group", False, str(e))

    try:
        # Direction mismatch: Same location but opposite directions (EAST vs WEST)
        grp_det_dir = GroupMovementDetector(max_separation_px=100.0, min_group_size=2, min_frames=1)
        t_mismatch = [
            {"track_id": 20, "centroid": (100.0, 100.0), "direction": "EAST", "speed": 15.0},
            {"track_id": 21, "centroid": (120.0, 100.0), "direction": "WEST", "speed": 15.0},
        ]
        g_opp = grp_det_dir.process_tracks("cam-01", t_mismatch, 300.0)
        report_test("Test 46", "Opposite Directions Do Not Form Group", len(g_opp) == 0, f"Groups found: {len(g_opp)}")
    except Exception as e:
        report_test("Test 46", "Opposite Directions Do Not Form Group", False, str(e))

    try:
        # Group disappearance: targets vanish
        g_empty = grp_det.process_tracks("cam-01", [], 110.0)
        report_test("Test 47", "Group Disappearance & Cleanup", len(g_empty) == 0, "Group safely dissolved")
    except Exception as e:
        report_test("Test 47", "Group Disappearance & Cleanup", False, str(e))

    # -------------------------------------------------------------------------
    # TEST GROUP K: BACKEND REST & WEBSOCKET (Tests 48 - 52)
    # -------------------------------------------------------------------------
    api_base = "http://127.0.0.1:8000/api/analytics"

    try:
        # REST: Summary Endpoint
        r_sum = requests.get(f"{api_base}/summary", timeout=5.0)
        passed = r_sum.status_code == 200 and r_sum.json().get("success") is True
        report_test("Test 48", "REST GET /api/analytics/summary", passed, f"HTTP {r_sum.status_code}")
    except Exception as e:
        report_test("Test 48", "REST GET /api/analytics/summary", False, str(e))

    try:
        # REST: Post Event & Persistence Check
        ev_id = f"mve-p10-test-{int(time.time()*1000)}"
        r_ev = requests.post(
            f"{api_base}/events",
            json={
                "id": ev_id,
                "camera_id": "cam-01",
                "zone_id": "zone-p10",
                "track_id": 99,
                "class_name": "person",
                "event_type": "ENTRY",
                "direction": "NORTH",
                "speed": 14.5,
            },
            timeout=5.0,
        )
        passed = r_ev.status_code == 201 and r_ev.json().get("data", {}).get("id") == ev_id
        report_test("Test 49", "REST POST /api/analytics/events & Persistence", passed, f"Inserted: {ev_id}")
    except Exception as e:
        report_test("Test 49", "REST POST /api/analytics/events & Persistence", False, str(e))

    try:
        # REST: Query Movement Events
        r_mve = requests.get(f"{api_base}/movement?camera_id=cam-01", timeout=5.0)
        data = r_mve.json().get("data", [])
        passed = r_mve.status_code == 200 and len(data) > 0
        report_test("Test 50", "REST GET /api/analytics/movement", passed, f"Found {len(data)} events")
    except Exception as e:
        report_test("Test 50", "REST GET /api/analytics/movement", False, str(e))

    try:
        # WebSocket: movement_update Fan-Out
        import websockets

        async def test_ws():
            async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
                ack = await asyncio.wait_for(ws.recv(), timeout=3.0)
                pkt = {
                    "type": "movement_update",
                    "data": {
                        "camera_id": "cam-01",
                        "zone_id": "zone-ws",
                        "track_id": 77,
                        "class_name": "person",
                        "event_type": "ENTRY",
                        "direction": "EAST",
                        "speed": 12.0,
                    },
                }
                await ws.send(json.dumps(pkt))
                recv_raw = await asyncio.wait_for(ws.recv(), timeout=3.0)
                recv = json.loads(recv_raw)
                return recv.get("type") == "movement_update" and recv.get("data", {}).get("track_id") == 77

        ws_passed = asyncio.run(test_ws())
        report_test("Test 51", "WebSocket movement_update Fan-Out", ws_passed, "Received over /ws")
    except Exception as e:
        report_test("Test 51", "WebSocket movement_update Fan-Out", False, str(e))

    try:
        # REST: Camera Specific Analytics
        r_cam = requests.get(f"{api_base}/cameras/cam-01", timeout=5.0)
        passed = r_cam.status_code == 200 and r_cam.json().get("data", {}).get("camera_id") == "cam-01"
        report_test("Test 52", "REST GET /api/analytics/cameras/:id", passed, "Camera analytics validated")
    except Exception as e:
        report_test("Test 52", "REST GET /api/analytics/cameras/:id", False, str(e))

    # -------------------------------------------------------------------------
    # TEST GROUP L: REGRESSIONS (Phases 1 through 9, Lint, Vite Build) (Tests 53 - 63)
    # -------------------------------------------------------------------------
    env_fast = os.environ.copy()
    env_fast["FAST_REGRESSION"] = "1"

    # TEST 53: Phase 9 Night Intelligence Regression (45 tests)
    try:
        res_p9 = subprocess.run(
            [sys.executable, "cv_service/tests/phase9_test.py"],
            capture_output=True,
            text=True,
            timeout=180,
            env=env_fast,
        )
        passed = res_p9.returncode == 0 and "Passed: 45" in res_p9.stdout
        report_test("Test 53", "Phase 9 Night Intelligence Regression Suite", passed, "45/45 Phase 9 tests passed")
    except Exception as e:
        report_test("Test 53", "Phase 9 Night Intelligence Regression Suite", False, str(e))

    # TEST 54: Phase 8 Multi-Camera Correlation Regression (37 tests)
    try:
        res_p8 = subprocess.run(
            [sys.executable, "cv_service/tests/phase8_test.py"],
            capture_output=True,
            text=True,
            timeout=90,
            env=env_fast,
        )
        passed = res_p8.returncode == 0 and "Passed: 37" in res_p8.stdout
        report_test("Test 54", "Phase 8 Multi-Camera Correlation Regression", passed, "37/37 Phase 8 tests passed")
    except Exception as e:
        report_test("Test 54", "Phase 8 Multi-Camera Correlation Regression", False, str(e))

    # TEST 55: Phase 7 Forensic Evidence Capture Regression (28 tests)
    try:
        res_p7 = subprocess.run(
            [sys.executable, "cv_service/tests/phase7_test.py"],
            capture_output=True,
            text=True,
            timeout=90,
            env=env_fast,
        )
        passed = res_p7.returncode == 0 and "Passed: 28" in res_p7.stdout
        report_test("Test 55", "Phase 7 Forensic Evidence Regression Suite", passed, "28/28 Phase 7 tests passed")
    except Exception as e:
        report_test("Test 55", "Phase 7 Forensic Evidence Regression Suite", False, str(e))

    # TEST 56: Phase 6 Risk Assessment Regression (36 tests)
    try:
        res_p6 = subprocess.run(
            [sys.executable, "cv_service/tests/phase6_test.py"],
            capture_output=True,
            text=True,
            timeout=90,
            env=env_fast,
        )
        passed = res_p6.returncode == 0 and "Passed: 36" in res_p6.stdout
        report_test("Test 56", "Phase 6 Risk Assessment Regression Suite", passed, "36/36 Phase 6 tests passed")
    except Exception as e:
        report_test("Test 56", "Phase 6 Risk Assessment Regression Suite", False, str(e))

    # TEST 57: Phase 5 Loitering Regression (31 tests)
    try:
        res_p5 = subprocess.run(
            [sys.executable, "cv_service/tests/phase5_test.py"],
            capture_output=True,
            text=True,
            timeout=90,
            env=env_fast,
        )
        passed = res_p5.returncode == 0 and "Passed: 31" in res_p5.stdout
        report_test("Test 57", "Phase 5 Loitering Detection Regression", passed, "31/31 Phase 5 tests passed")
    except Exception as e:
        report_test("Test 57", "Phase 5 Loitering Detection Regression", False, str(e))

    # TEST 58: Phase 4 Intrusion Regression (22 tests)
    try:
        res_p4 = subprocess.run(
            [sys.executable, "cv_service/tests/phase4_test.py"],
            capture_output=True,
            text=True,
            timeout=90,
            env=env_fast,
        )
        passed = res_p4.returncode == 0 and "Passed: 22" in res_p4.stdout
        report_test("Test 58", "Phase 4 Virtual Perimeter Regression", passed, "22/22 Phase 4 tests passed")
    except Exception as e:
        report_test("Test 58", "Phase 4 Virtual Perimeter Regression", False, str(e))

    # TEST 59: Phase 3 ByteTrack Tracking Regression (12 tests)
    try:
        res_p3 = subprocess.run(
            [sys.executable, "cv_service/tests/phase3_test.py"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        passed = res_p3.returncode == 0 and "Passed: 12" in res_p3.stdout
        report_test("Test 59", "Phase 3 ByteTrack Tracking Regression", passed, "12/12 Phase 3 tests passed")
    except Exception as e:
        report_test("Test 59", "Phase 3 ByteTrack Tracking Regression", False, str(e))

    # TEST 60: Phase 2 YOLOv8 Object Detection Regression (12 tests)
    try:
        res_p2 = subprocess.run(
            [sys.executable, "cv_service/tests/phase2_test.py"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        passed = res_p2.returncode == 0 and "Passed: 12" in res_p2.stdout
        report_test("Test 60", "Phase 2 YOLOv8 Detection Regression", passed, "12/12 Phase 2 tests passed")
    except Exception as e:
        report_test("Test 60", "Phase 2 YOLOv8 Detection Regression", False, str(e))

    # TEST 61: Phase 1 Backend REST & SQLite Regression (13 tests)
    try:
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        res_p1 = subprocess.run(
            [npm_cmd, "run", "test:phase1"],
            capture_output=True,
            text=True,
            timeout=60,
            shell=(sys.platform == "win32"),
        )
        passed = res_p1.returncode == 0 and "Passed: 13" in res_p1.stdout
        report_test("Test 61", "Phase 1 Backend REST & DB Regression", passed, "13/13 Phase 1 tests passed")
    except Exception as e:
        report_test("Test 61", "Phase 1 Backend REST & DB Regression", False, str(e))

    # TEST 62: TypeScript Strict Typecheck
    try:
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        res_lint = subprocess.run(
            [npm_cmd, "run", "lint"],
            capture_output=True,
            text=True,
            timeout=180,
            shell=(sys.platform == "win32"),
        )
        passed = res_lint.returncode == 0
        report_test("Test 62", "TypeScript Strict Typecheck", passed, "0 errors (tsc --noEmit)")
    except Exception as e:
        report_test("Test 62", "TypeScript Strict Typecheck", False, str(e))

    # TEST 63: Vite Production Bundle Build
    try:
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        res_build = subprocess.run(
            [npm_cmd, "run", "build"],
            capture_output=True,
            text=True,
            timeout=180,
            shell=(sys.platform == "win32"),
        )
        passed = res_build.returncode == 0 and "built in" in res_build.stdout
        report_test("Test 63", "Vite Production Bundle Build", passed, "Production assets compiled successfully")
    except Exception as e:
        report_test("Test 63", "Vite Production Bundle Build", False, str(e))

    total = len(TEST_RESULTS)
    passed_count = sum(1 for t in TEST_RESULTS if t["passed"])
    failed_count = total - passed_count

    print("\n===================================================================")
    print("[SUMMARY] PHASE 10 TEST SUMMARY:")
    print(f"  Total:  {total}")
    print(f"  Passed: {passed_count}")
    print(f"  Failed: {failed_count}")
    print("===================================================================\n")

    if failed_count > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    run_phase10_suite()
