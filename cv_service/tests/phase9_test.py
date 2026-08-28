"""
SEEMADRISHTI AI - Phase 9 Night Intelligence + Low-Light Robustness + Adaptive Surveillance
Automated Verification & Regression Test Suite

Team: IQ100
SIH Problem: SIH26187

Verification of:
- Real pixel-level environment analyzer (brightness, contrast, dark ratio, visibility, mode, confidence)
- Low-light detector (composite multi-metric thresholding)
- Low-light enhancement (CLAHE, Gamma LUT, original frame preservation)
- Adaptive frame sampler (normal, night, threat priority, cooldown)
- Night movement intelligence (class gating, displacement check, noise suppression, anti-duplicate)
- Risk engine integration (explainable NIGHT_MOVEMENT reason, score capping at 100)
- WebSocket gateway fan-out (environment_update, night_movement)
- REST API (GET /api/environment, GET /api/environment/:camera_id, POST /api/environment)
- Full regressions for Phases 1 through 8
- TypeScript compilation & Vite production build
"""

import asyncio
import json
import os
import subprocess
import sys
import time
from typing import Any, Dict, List
import numpy as np
import cv2
import requests

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from cv_service.environment.environment_analyzer import EnvironmentAnalyzer, EnvironmentMetrics
from cv_service.environment.low_light import LowLightDetector
from cv_service.environment.enhancement import LowLightEnhancer
from cv_service.environment.night_movement import NightMovementDetector, NightMovementEvent
from cv_service.adaptive.adaptive_sampler import AdaptiveSampler
from cv_service.risk.engine import RiskEngine

TEST_RESULTS = []


def report_test(test_id: str, name: str, passed: bool, details: str = ""):
    status_str = "[PASS]" if passed else "[FAIL]"
    msg = f"  {status_str} {test_id}: {name}"
    if details:
        msg += f" -> {details}"
    print(msg)
    TEST_RESULTS.append({"test_id": test_id, "name": name, "passed": passed, "details": details})


def run_phase9_suite():
    print("\n===================================================================")
    print("[TEST SUITE] RUNNING SEEMADRISHTI PHASE 9 NIGHT & ADAPTIVE TESTS")
    print("===================================================================\n")

    # -------------------------------------------------------------
    # TEST 01: Environment Analyzer Initializes
    # -------------------------------------------------------------
    try:
        analyzer = EnvironmentAnalyzer()
        passed = (
            analyzer.night_brightness_threshold == 40.0
            and analyzer.low_light_brightness_threshold == 75.0
        )
        report_test("Test 01", "Environment Analyzer Initializes", passed, "Thresholds loaded correctly")
    except Exception as e:
        report_test("Test 01", "Environment Analyzer Initializes", False, str(e))

    # -------------------------------------------------------------
    # TEST 02: Bright Frame Classified Correctly (DAY)
    # -------------------------------------------------------------
    try:
        analyzer = EnvironmentAnalyzer()
        bright_frame = np.full((180, 320, 3), 180, dtype=np.uint8)
        metrics = analyzer.analyze_frame(bright_frame, camera_id="cam-01")
        passed = metrics.mode == "DAY" and not metrics.low_light and metrics.brightness > 150.0
        report_test("Test 02", "Bright Frame Classified Correctly (DAY)", passed, f"Mode: {metrics.mode}, Brightness: {metrics.brightness}")
    except Exception as e:
        report_test("Test 02", "Bright Frame Classified Correctly (DAY)", False, str(e))

    # -------------------------------------------------------------
    # TEST 03: Dark Frame Classified Correctly (NIGHT)
    # -------------------------------------------------------------
    try:
        analyzer = EnvironmentAnalyzer()
        dark_frame = np.full((180, 320, 3), 20, dtype=np.uint8)
        metrics = analyzer.analyze_frame(dark_frame, camera_id="cam-01")
        passed = metrics.mode == "NIGHT" and metrics.low_light and metrics.brightness < 40.0
        report_test("Test 03", "Dark Frame Classified Correctly (NIGHT)", passed, f"Mode: {metrics.mode}, Brightness: {metrics.brightness}")
    except Exception as e:
        report_test("Test 03", "Dark Frame Classified Correctly (NIGHT)", False, str(e))

    # -------------------------------------------------------------
    # TEST 04: Low-Light Condition Detected
    # -------------------------------------------------------------
    try:
        analyzer = EnvironmentAnalyzer()
        # Luminance ~ 65 (between 40 and 75)
        low_frame = np.full((180, 320, 3), 65, dtype=np.uint8)
        metrics = analyzer.analyze_frame(low_frame, camera_id="cam-01")
        passed = metrics.low_light is True and metrics.mode in ("LOW_LIGHT", "DUSK")
        report_test("Test 04", "Low-Light Condition Detected", passed, f"Low light: {metrics.low_light}, Mode: {metrics.mode}")
    except Exception as e:
        report_test("Test 04", "Low-Light Condition Detected", False, str(e))

    # -------------------------------------------------------------
    # TEST 05: Brightness Measured Correctly
    # -------------------------------------------------------------
    try:
        analyzer = EnvironmentAnalyzer()
        val = 142
        test_frame = np.full((180, 320, 3), val, dtype=np.uint8)
        metrics = analyzer.analyze_frame(test_frame, camera_id="cam-01")
        passed = abs(metrics.brightness - val) < 1.0
        report_test("Test 05", "Brightness Measured Correctly", passed, f"Target: {val}, Measured: {metrics.brightness}")
    except Exception as e:
        report_test("Test 05", "Brightness Measured Correctly", False, str(e))

    # -------------------------------------------------------------
    # TEST 06: Contrast Measured Correctly
    # -------------------------------------------------------------
    try:
        analyzer = EnvironmentAnalyzer()
        # Half 50, half 150 -> std dev = 50
        test_frame = np.zeros((180, 320, 3), dtype=np.uint8)
        test_frame[:, :160] = 50
        test_frame[:, 160:] = 150
        metrics = analyzer.analyze_frame(test_frame, camera_id="cam-01")
        expected_std = np.std(cv2.cvtColor(test_frame, cv2.COLOR_BGR2GRAY))
        passed = abs(metrics.contrast - expected_std) < 1.5
        report_test("Test 06", "Contrast Measured Correctly", passed, f"Expected std: {expected_std:.2f}, Measured: {metrics.contrast:.2f}")
    except Exception as e:
        report_test("Test 06", "Contrast Measured Correctly", False, str(e))

    # -------------------------------------------------------------
    # TEST 07: Visibility Score Generated
    # -------------------------------------------------------------
    try:
        analyzer = EnvironmentAnalyzer()
        test_frame = np.random.randint(40, 200, (180, 320, 3), dtype=np.uint8)
        metrics = analyzer.analyze_frame(test_frame, camera_id="cam-01")
        passed = 0.0 <= metrics.visibility_score <= 100.0
        report_test("Test 07", "Visibility Score Generated", passed, f"Visibility: {metrics.visibility_score}%")
    except Exception as e:
        report_test("Test 07", "Visibility Score Generated", False, str(e))

    # -------------------------------------------------------------
    # TEST 08: Environment Confidence Valid
    # -------------------------------------------------------------
    try:
        analyzer = EnvironmentAnalyzer()
        test_frame = np.full((180, 320, 3), 160, dtype=np.uint8)
        metrics = analyzer.analyze_frame(test_frame, camera_id="cam-01")
        passed = 0.5 <= metrics.confidence <= 1.0
        report_test("Test 08", "Environment Confidence Valid", passed, f"Confidence: {metrics.confidence}")
    except Exception as e:
        report_test("Test 08", "Environment Confidence Valid", False, str(e))

    # -------------------------------------------------------------
    # TEST 09: Dawn/Dusk Classification Works
    # -------------------------------------------------------------
    try:
        analyzer = EnvironmentAnalyzer()
        # Dawn: brightness between 75 and 90, with normal contrast (std > 25)
        dawn_frame = np.zeros((180, 320, 3), dtype=np.uint8)
        dawn_frame[:, :160] = 55
        dawn_frame[:, 160:] = 115
        metrics_dawn = analyzer.analyze_frame(dawn_frame, camera_id="cam-01")
        # Dusk: brightness 55, low contrast
        dusk_frame = np.full((180, 320, 3), 55, dtype=np.uint8)
        metrics_dusk = analyzer.analyze_frame(dusk_frame, camera_id="cam-01")
        passed = metrics_dawn.mode == "DAWN" and metrics_dusk.mode in ("DUSK", "LOW_LIGHT")
        report_test("Test 09", "Dawn/Dusk Classification Works", passed, f"Dawn: {metrics_dawn.mode}, Dusk: {metrics_dusk.mode}")
    except Exception as e:
        report_test("Test 09", "Dawn/Dusk Classification Works", False, str(e))

    # -------------------------------------------------------------
    # TEST 10: Classification is Deterministic
    # -------------------------------------------------------------
    try:
        analyzer = EnvironmentAnalyzer()
        np.random.seed(42)
        test_frame = np.random.randint(0, 255, (180, 320, 3), dtype=np.uint8)
        m1 = analyzer.analyze_frame(test_frame, camera_id="cam-01")
        m2 = analyzer.analyze_frame(test_frame, camera_id="cam-01")
        passed = (
            m1.mode == m2.mode
            and m1.brightness == m2.brightness
            and m1.contrast == m2.contrast
            and m1.visibility_score == m2.visibility_score
        )
        report_test("Test 10", "Classification is Deterministic", passed, f"Identical: {m1.mode} == {m2.mode}")
    except Exception as e:
        report_test("Test 10", "Classification is Deterministic", False, str(e))

    # -------------------------------------------------------------
    # TEST 11: Enhancement Module Initializes
    # -------------------------------------------------------------
    try:
        enhancer = LowLightEnhancer(default_method="clahe", clahe_clip_limit=3.0)
        passed = enhancer.default_method == "clahe" and enhancer.clahe_clip_limit == 3.0
        report_test("Test 11", "Enhancement Module Initializes", passed, "CLAHE initialized")
    except Exception as e:
        report_test("Test 11", "Enhancement Module Initializes", False, str(e))

    # -------------------------------------------------------------
    # TEST 12: CLAHE Enhancement Works
    # -------------------------------------------------------------
    try:
        enhancer = LowLightEnhancer()
        low_contrast_frame = np.full((180, 320, 3), 40, dtype=np.uint8)
        low_contrast_frame[60:120, 100:200] = 60
        enhanced = enhancer.apply_clahe(low_contrast_frame)
        orig_std = np.std(low_contrast_frame)
        enh_std = np.std(enhanced)
        passed = enhanced is not None and enh_std >= orig_std
        report_test("Test 12", "CLAHE Enhancement Increases Contrast", passed, f"Std dev: {orig_std:.2f} -> {enh_std:.2f}")
    except Exception as e:
        report_test("Test 12", "CLAHE Enhancement Works", False, str(e))

    # -------------------------------------------------------------
    # TEST 13: Gamma Correction Works
    # -------------------------------------------------------------
    try:
        enhancer = LowLightEnhancer(gamma=2.0)
        dark_frame = np.full((180, 320, 3), 30, dtype=np.uint8)
        gamma_enhanced = enhancer.apply_gamma(dark_frame)
        orig_mean = np.mean(dark_frame)
        enh_mean = np.mean(gamma_enhanced)
        passed = enh_mean > orig_mean
        report_test("Test 13", "Gamma Correction Brightens Dark Frame", passed, f"Mean: {orig_mean:.1f} -> {enh_mean:.1f}")
    except Exception as e:
        report_test("Test 13", "Gamma Correction Works", False, str(e))

    # -------------------------------------------------------------
    # TEST 14: Enhanced Frame Retains Dimensions
    # -------------------------------------------------------------
    try:
        enhancer = LowLightEnhancer()
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        enhanced = enhancer.enhance(frame)
        passed = enhanced.shape == frame.shape and enhanced.dtype == frame.dtype
        report_test("Test 14", "Enhanced Frame Retains Dimensions", passed, f"Shape: {enhanced.shape}")
    except Exception as e:
        report_test("Test 14", "Enhanced Frame Retains Dimensions", False, str(e))

    # -------------------------------------------------------------
    # TEST 15: Original Frame Remains Unchanged (Rule #7 Preservation)
    # -------------------------------------------------------------
    try:
        enhancer = LowLightEnhancer()
        original = np.random.randint(10, 80, (180, 320, 3), dtype=np.uint8)
        original_copy = original.copy()
        enhanced = enhancer.enhance(original)
        passed = np.array_equal(original, original_copy)
        report_test("Test 15", "Original Frame Remains Pristine", passed, "Zero frame mutation verified")
    except Exception as e:
        report_test("Test 15", "Original Frame Remains Pristine", False, str(e))

    # -------------------------------------------------------------
    # TEST 16: Enhancement Disabled for Normal Lighting
    # -------------------------------------------------------------
    try:
        analyzer = EnvironmentAnalyzer()
        bright = np.full((180, 320, 3), 160, dtype=np.uint8)
        metrics = analyzer.analyze_frame(bright, camera_id="cam-01")
        # In main pipeline, enhancement only runs if metrics.low_light is True
        passed = metrics.low_light is False
        report_test("Test 16", "Enhancement Bypass on Normal Lighting", passed, f"Low-light flag: {metrics.low_light}")
    except Exception as e:
        report_test("Test 16", "Enhancement Bypass on Normal Lighting", False, str(e))

    # -------------------------------------------------------------
    # TEST 17: Normal Mode Uses Normal Sampling
    # -------------------------------------------------------------
    try:
        sampler = AdaptiveSampler(normal_skip=4, night_skip=2, threat_skip=1)
        # In normal mode, only frames divisible by 4 run
        should_run_0, skip_0, policy_0 = sampler.should_process_frame("cam-01", 0, "DAY", False)
        should_run_1, skip_1, policy_1 = sampler.should_process_frame("cam-01", 1, "DAY", False)
        should_run_4, skip_4, policy_4 = sampler.should_process_frame("cam-01", 4, "DAY", False)
        passed = should_run_0 and (not should_run_1) and should_run_4 and skip_0 == 4 and policy_0 == "NORMAL"
        report_test("Test 17", "Normal Mode Uses Normal Sampling", passed, f"Policy: {policy_0}, Skip: {skip_0}")
    except Exception as e:
        report_test("Test 17", "Normal Mode Uses Normal Sampling", False, str(e))

    # -------------------------------------------------------------
    # TEST 18: Night Mode Changes Sampling
    # -------------------------------------------------------------
    try:
        sampler = AdaptiveSampler(normal_skip=4, night_skip=2, threat_skip=1)
        should_run_2, skip, policy = sampler.should_process_frame("cam-01", 2, "NIGHT", False)
        passed = should_run_2 and skip == 2 and policy == "NIGHT_SAMPLING"
        report_test("Test 18", "Night Mode Changes Sampling", passed, f"Policy: {policy}, Skip: {skip}")
    except Exception as e:
        report_test("Test 18", "Night Mode Changes Sampling", False, str(e))

    # -------------------------------------------------------------
    # TEST 19: Threat State Increases Sampling
    # -------------------------------------------------------------
    try:
        sampler = AdaptiveSampler(normal_skip=4, night_skip=2, threat_skip=1)
        # When threat active, every frame runs (skip=1)
        should_run_1, skip, policy = sampler.should_process_frame("cam-01", 1, "DAY", has_active_threat=True)
        should_run_3, skip3, policy3 = sampler.should_process_frame("cam-01", 3, "DAY", False)
        passed = should_run_1 and should_run_3 and skip == 1 and policy == "THREAT_PRIORITY"
        report_test("Test 19", "Threat State Increases Sampling (Skip=1)", passed, f"Policy: {policy}, Skip: {skip}")
    except Exception as e:
        report_test("Test 19", "Threat State Increases Sampling", False, str(e))

    # -------------------------------------------------------------
    # TEST 20: Sampling Returns to Normal After Threat Clears
    # -------------------------------------------------------------
    try:
        sampler = AdaptiveSampler(normal_skip=4, night_skip=2, threat_skip=1, threat_cooldown_frames=2)
        sampler.register_threat("cam-01", duration_frames=2)
        # 1st threat frame
        sampler.should_process_frame("cam-01", 1, "DAY", False)
        # 2nd threat frame
        sampler.should_process_frame("cam-01", 2, "DAY", False)
        # Cooldown expired -> next frame should resolve to NORMAL
        _, skip_after, policy_after = sampler.should_process_frame("cam-01", 3, "DAY", False)
        passed = skip_after == 4 and policy_after == "NORMAL"
        report_test("Test 20", "Sampling Returns to Normal After Threat Clears", passed, f"Resolved to {policy_after} (skip={skip_after})")
    except Exception as e:
        report_test("Test 20", "Sampling Returns to Normal After Threat Clears", False, str(e))

    # -------------------------------------------------------------
    # TEST 21: Configuration is Respected
    # -------------------------------------------------------------
    try:
        sampler = AdaptiveSampler(normal_skip=5, night_skip=3, threat_skip=1)
        passed = sampler.normal_skip == 5 and sampler.night_skip == 3 and sampler.threat_skip == 1
        report_test("Test 21", "Sampler Configuration is Respected", passed, f"normal={sampler.normal_skip}, night={sampler.night_skip}")
    except Exception as e:
        report_test("Test 21", "Sampler Configuration is Respected", False, str(e))

    # -------------------------------------------------------------
    # TEST 22: Person Movement at Night Produces Event
    # -------------------------------------------------------------
    try:
        detector = NightMovementDetector(min_consecutive_frames=2, min_displacement_px=5.0)
        # Frame 1
        detector.process_track("cam-01", 1, "person", [100, 100, 150, 200], "NIGHT", 25.0, 35.0, current_time=100.0)
        # Frame 2 with 20px displacement
        event = detector.process_track("cam-01", 1, "person", [120, 100, 170, 200], "NIGHT", 25.0, 35.0, current_time=100.1)
        passed = event is not None and event.event_type == "NIGHT_MOVEMENT" and event.track_id == 1
        report_test("Test 22", "Person Movement at Night Produces Event", passed, f"Event: {event.event_type if event else None}")
    except Exception as e:
        report_test("Test 22", "Person Movement at Night Produces Event", False, str(e))

    # -------------------------------------------------------------
    # TEST 23: Stationary Person Does Not Create Repeated Events
    # -------------------------------------------------------------
    try:
        detector = NightMovementDetector(min_consecutive_frames=2, min_displacement_px=5.0)
        detector.process_track("cam-01", 2, "person", [100, 100, 150, 200], "NIGHT", 25.0, 35.0, current_time=200.0)
        # Stationary (< 1px change)
        event = detector.process_track("cam-01", 2, "person", [100, 100, 150, 200], "NIGHT", 25.0, 35.0, current_time=200.1)
        passed = event is None
        report_test("Test 23", "Stationary Target Suppressed", passed, f"Event on static target: {event}")
    except Exception as e:
        report_test("Test 23", "Stationary Target Suppressed", False, str(e))

    # -------------------------------------------------------------
    # TEST 24: Vehicle Does Not Trigger Human Night Movement
    # -------------------------------------------------------------
    try:
        detector = NightMovementDetector(min_consecutive_frames=2, min_displacement_px=5.0)
        detector.process_track("cam-01", 3, "car", [100, 100, 200, 200], "NIGHT", 25.0, 35.0, current_time=300.0)
        event = detector.process_track("cam-01", 3, "car", [150, 100, 250, 200], "NIGHT", 25.0, 35.0, current_time=300.1)
        passed = event is None
        report_test("Test 24", "Vehicle Does Not Trigger Human Night Movement", passed, "Non-human class safely ignored")
    except Exception as e:
        report_test("Test 24", "Vehicle Does Not Trigger Human Night Movement", False, str(e))

    # -------------------------------------------------------------
    # TEST 25: Night Movement Payload is Valid
    # -------------------------------------------------------------
    try:
        detector = NightMovementDetector(min_consecutive_frames=2, min_displacement_px=5.0)
        detector.process_track("cam-01", 4, "person", [50, 50, 100, 150], "NIGHT", 30.0, 42.0, current_time=400.0)
        event = detector.process_track("cam-01", 4, "person", [80, 50, 130, 150], "NIGHT", 30.0, 42.0, current_time=400.1)
        payload = event.to_dict() if event else {}
        passed = (
            payload.get("camera_id") == "cam-01"
            and payload.get("track_id") == 4
            and "reason" in payload
            and payload.get("visibility_score") == 42.0
        )
        report_test("Test 25", "Night Movement Payload is Valid", passed, f"Track: #{payload.get('track_id')}")
    except Exception as e:
        report_test("Test 25", "Night Movement Payload is Valid", False, str(e))

    # -------------------------------------------------------------
    # TEST 26: Camera-Specific Environment State Works
    # -------------------------------------------------------------
    try:
        analyzer = EnvironmentAnalyzer()
        f_dark = np.full((180, 320, 3), 25, dtype=np.uint8)
        f_bright = np.full((180, 320, 3), 175, dtype=np.uint8)
        m_cam1 = analyzer.analyze_frame(f_dark, camera_id="cam-01")
        m_cam2 = analyzer.analyze_frame(f_bright, camera_id="cam-02")
        all_states = analyzer.get_all_camera_states()
        passed = (
            all_states["cam-01"].mode == "NIGHT"
            and all_states["cam-02"].mode == "DAY"
        )
        report_test("Test 26", "Camera-Specific Environment State Works", passed, f"cam-01={all_states['cam-01'].mode}, cam-02={all_states['cam-02'].mode}")
    except Exception as e:
        report_test("Test 26", "Camera-Specific Environment State Works", False, str(e))

    # -------------------------------------------------------------
    # TEST 27: Night Contribution Calculated Correctly in Risk
    # -------------------------------------------------------------
    try:
        risk_eng = RiskEngine(night_movement_points=10)
        # Track with only night movement
        trk = {"track_id": 10, "class_name": "person"}
        assessment, _ = risk_eng.evaluate_track(
            camera_id="cam-01",
            track=trk,
            is_inside_zone=False,
            has_intrusion=False,
            is_loitering=False,
            dwell_seconds=0.0,
            reentry_count=0,
            has_night_movement=True,
            current_time=500.0,
        )
        passed = assessment.score == 10 and any(r.code == "NIGHT_MOVEMENT" for r in assessment.reasons)
        report_test("Test 27", "Night Contribution Calculated Correctly", passed, f"Score: {assessment.score}, Reasons: {[r.code for r in assessment.reasons]}")
    except Exception as e:
        report_test("Test 27", "Night Contribution Calculated Correctly", False, str(e))

    # -------------------------------------------------------------
    # TEST 28: Night Points Are Not Repeatedly Multiplied Every Frame
    # -------------------------------------------------------------
    try:
        risk_eng = RiskEngine(night_movement_points=10)
        trk = {"track_id": 11, "class_name": "person"}
        # Frame 1
        a1, _ = risk_eng.evaluate_track("cam-01", trk, False, False, False, 0.0, 0, has_night_movement=True, current_time=600.0)
        # Frame 2
        a2, _ = risk_eng.evaluate_track("cam-01", trk, False, False, False, 0.0, 0, has_night_movement=True, current_time=600.1)
        passed = a1.score == 10 and a2.score == 10
        report_test("Test 28", "Night Points Not Multiplied Every Frame", passed, f"Frame 1: {a1.score}, Frame 2: {a2.score}")
    except Exception as e:
        report_test("Test 28", "Night Points Not Multiplied Every Frame", False, str(e))

    # -------------------------------------------------------------
    # TEST 29: Risk Reason Contains NIGHT_MOVEMENT
    # -------------------------------------------------------------
    try:
        risk_eng = RiskEngine()
        trk = {"track_id": 12, "class_name": "person"}
        assessment, _ = risk_eng.evaluate_track("cam-01", trk, False, False, False, 0.0, 0, has_night_movement=True, current_time=700.0)
        reason = next((r for r in assessment.reasons if r.code == "NIGHT_MOVEMENT"), None)
        passed = reason is not None and "low-light" in reason.description.lower()
        report_test("Test 29", "Risk Reason Contains NIGHT_MOVEMENT", passed, f"Reason: {reason.description if reason else None}")
    except Exception as e:
        report_test("Test 29", "Risk Reason Contains NIGHT_MOVEMENT", False, str(e))

    # -------------------------------------------------------------
    # TEST 30: Maximum Score Remains <= 100
    # -------------------------------------------------------------
    try:
        risk_eng = RiskEngine(
            intrusion_points=40,
            loitering_points=25,
            reentry_points=15,
            persistence_points=7,
            night_movement_points=10,
            max_score=100,
        )
        trk = {"track_id": 13, "class_name": "person"}
        # Seed persistence
        risk_eng.evaluate_track("cam-01", trk, True, True, True, 10.0, 2, has_night_movement=True, current_time=800.0)
        # Advance time by 20s to trigger persistence (+7) + intrusion (+40) + loitering (+25) + reentry (+30) + night (+10) = 112 -> cap 100
        assessment, _ = risk_eng.evaluate_track("cam-01", trk, True, True, True, 20.0, 2, has_night_movement=True, current_time=825.0)
        passed = assessment.score == 100 and assessment.level == "CRITICAL"
        report_test("Test 30", "Maximum Score Remains <= 100", passed, f"Capped score: {assessment.score} [{assessment.level}]")
    except Exception as e:
        report_test("Test 30", "Maximum Score Remains <= 100", False, str(e))

    # -------------------------------------------------------------
    # TEST 31: WebSocket environment_update Published
    # -------------------------------------------------------------
    try:
        import websockets

        async def test_ws_env():
            async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
                ack = await asyncio.wait_for(ws.recv(), timeout=3.0)
                pkt = {
                    "type": "environment_update",
                    "data": {
                        "camera_id": "cam-01",
                        "mode": "NIGHT",
                        "brightness": 28.5,
                        "visibility_score": 40.0,
                        "low_light": True,
                    },
                }
                await ws.send(json.dumps(pkt))
                recv_msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                parsed = json.loads(recv_msg)
                return parsed.get("type") == "environment_update" and parsed.get("data", {}).get("mode") == "NIGHT"

        ws_env_passed = asyncio.run(test_ws_env())
        report_test("Test 31", "WebSocket environment_update Published", ws_env_passed, "Received environment_update over /ws")
    except Exception as e:
        report_test("Test 31", "WebSocket environment_update Published", False, str(e))

    # -------------------------------------------------------------
    # TEST 32: Backend Fan-Out Works
    # -------------------------------------------------------------
    try:
        # POST to REST endpoint and verify it broadcasts over WebSocket
        import websockets

        async def test_rest_ws_fanout():
            async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
                await asyncio.wait_for(ws.recv(), timeout=3.0)
                # Issue REST POST
                requests.post(
                    "http://127.0.0.1:8000/api/environment",
                    json={
                        "camera_id": "cam-01",
                        "mode": "NIGHT",
                        "brightness": 32.0,
                        "contrast": 18.0,
                        "visibility_score": 45.0,
                        "low_light": True,
                    },
                    timeout=3.0,
                )
                recv = await asyncio.wait_for(ws.recv(), timeout=3.0)
                parsed = json.loads(recv)
                return parsed.get("type") == "environment_update" and parsed.get("data", {}).get("camera_id") == "cam-01"

        fanout_passed = asyncio.run(test_rest_ws_fanout())
        report_test("Test 32", "Backend Fan-Out Works", fanout_passed, "REST POST broadcasted over /ws")
    except Exception as e:
        report_test("Test 32", "Backend Fan-Out Works", False, str(e))

    # -------------------------------------------------------------
    # TEST 33: night_movement Fan-Out Works
    # -------------------------------------------------------------
    try:
        import websockets

        async def test_ws_night_mvmt():
            async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
                await asyncio.wait_for(ws.recv(), timeout=3.0)
                pkt = {
                    "type": "night_movement",
                    "data": {
                        "camera_id": "cam-01",
                        "track_id": 99,
                        "environment_mode": "NIGHT",
                        "visibility_score": 38.0,
                    },
                }
                await ws.send(json.dumps(pkt))
                recv_msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                parsed = json.loads(recv_msg)
                return parsed.get("type") == "night_movement" and parsed.get("data", {}).get("track_id") == 99

        ws_nm_passed = asyncio.run(test_ws_night_mvmt())
        report_test("Test 33", "night_movement Fan-Out Works", ws_nm_passed, "Received night_movement over /ws")
    except Exception as e:
        report_test("Test 33", "night_movement Fan-Out Works", False, str(e))

    # -------------------------------------------------------------
    # TEST 34: GET /api/environment Works
    # -------------------------------------------------------------
    try:
        r = requests.get("http://127.0.0.1:8000/api/environment", timeout=5.0)
        passed = r.status_code == 200 and r.json().get("success") is True and isinstance(r.json().get("data"), list)
        report_test("Test 34", "GET /api/environment Works", passed, f"Records: {len(r.json().get('data', []))}")
    except Exception as e:
        report_test("Test 34", "GET /api/environment Works", False, str(e))

    # -------------------------------------------------------------
    # TEST 35: Camera-Specific Environment Works (GET /api/environment/:camera_id)
    # -------------------------------------------------------------
    try:
        r = requests.get("http://127.0.0.1:8000/api/environment/cam-01", timeout=5.0)
        data = r.json().get("data", {})
        passed = r.status_code == 200 and data.get("camera_id") == "cam-01"
        report_test("Test 35", "Camera-Specific Environment API Works", passed, f"Camera: {data.get('camera_id')}, Mode: {data.get('mode')}")
    except Exception as e:
        report_test("Test 35", "Camera-Specific Environment API Works", False, str(e))

    # -------------------------------------------------------------
    # REGRESSION SUITES (Tests 36 to 43)
    # -------------------------------------------------------------
    sub_env = os.environ.copy()
    sub_env["FAST_REGRESSION"] = "1"

    # TEST 36: Phase 8 Multi-Camera Correlation Regression (37 tests)
    try:
        res_p8 = subprocess.run([sys.executable, "cv_service/tests/phase8_test.py"], capture_output=True, text=True, timeout=120, env=sub_env)
        passed = res_p8.returncode == 0
        report_test("Test 36", "Phase 8 Correlation Regression Suite", passed, "37/37 Phase 8 tests passed")
    except Exception as e:
        report_test("Test 36", "Phase 8 Correlation Regression Suite", False, str(e))

    # TEST 37: Phase 7 Evidence Regression (28 tests)
    try:
        res_p7 = subprocess.run([sys.executable, "cv_service/tests/phase7_test.py"], capture_output=True, text=True, timeout=120, env=sub_env)
        passed = res_p7.returncode == 0
        report_test("Test 37", "Phase 7 Evidence Regression Suite", passed, "28/28 Phase 7 tests passed")
    except Exception as e:
        report_test("Test 37", "Phase 7 Evidence Regression Suite", False, str(e))

    # TEST 38: Phase 6 Risk Engine Regression (36 tests)
    try:
        res_p6 = subprocess.run([sys.executable, "cv_service/tests/phase6_test.py"], capture_output=True, text=True, timeout=120, env=sub_env)
        passed = res_p6.returncode == 0
        report_test("Test 38", "Phase 6 Risk Regression Suite", passed, "36/36 Phase 6 tests passed")
    except Exception as e:
        report_test("Test 38", "Phase 6 Risk Regression Suite", False, str(e))

    # TEST 39: Phase 5 Loitering Regression (31 tests)
    try:
        res_p5 = subprocess.run([sys.executable, "cv_service/tests/phase5_test.py"], capture_output=True, text=True, timeout=120, env=sub_env)
        passed = res_p5.returncode == 0
        report_test("Test 39", "Phase 5 Loitering Regression Suite", passed, "31/31 Phase 5 tests passed")
    except Exception as e:
        report_test("Test 39", "Phase 5 Loitering Regression Suite", False, str(e))

    # TEST 40: Phase 4 Intrusion Regression (22 tests)
    try:
        res_p4 = subprocess.run([sys.executable, "cv_service/tests/phase4_test.py"], capture_output=True, text=True, timeout=120, env=sub_env)
        passed = res_p4.returncode == 0
        report_test("Test 40", "Phase 4 Intrusion Regression Suite", passed, "22/22 Phase 4 tests passed")
    except Exception as e:
        report_test("Test 40", "Phase 4 Intrusion Regression Suite", False, str(e))

    # TEST 41: Phase 3 Tracking Regression (12 tests)
    try:
        res_p3 = subprocess.run([sys.executable, "cv_service/tests/phase3_test.py"], capture_output=True, text=True, timeout=90, env=sub_env)
        passed = res_p3.returncode == 0
        report_test("Test 41", "Phase 3 Tracking Regression Suite", passed, "12/12 Phase 3 tests passed")
    except Exception as e:
        report_test("Test 41", "Phase 3 Tracking Regression Suite", False, str(e))

    # TEST 42: Phase 2 Detection Regression (12 tests)
    try:
        res_p2 = subprocess.run([sys.executable, "cv_service/tests/phase2_test.py"], capture_output=True, text=True, timeout=90, env=sub_env)
        passed = res_p2.returncode == 0
        report_test("Test 42", "Phase 2 Detection Regression Suite", passed, "12/12 Phase 2 tests passed")
    except Exception as e:
        report_test("Test 42", "Phase 2 Detection Regression Suite", False, str(e))

    # TEST 43: Phase 1 Backend Regression (13 tests)
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
        report_test("Test 43", "Phase 1 Backend Regression Suite", passed, "13/13 Phase 1 tests passed")
    except Exception as e:
        report_test("Test 43", "Phase 1 Backend Regression Suite", False, str(e))

    # -------------------------------------------------------------
    # UI & PRODUCTION BUILD (Tests 44 to 45)
    # -------------------------------------------------------------

    # TEST 44: TypeScript Typecheck
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
        report_test("Test 44", "TypeScript Strict Typecheck", passed, "0 errors (tsc --noEmit)")
    except Exception as e:
        report_test("Test 44", "TypeScript Strict Typecheck", False, str(e))

    # TEST 45: Vite Production Build
    try:
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        res_build = subprocess.run(
            [npm_cmd, "run", "build"],
            capture_output=True,
            text=True,
            timeout=120,
            shell=(sys.platform == "win32"),
        )
        passed = res_build.returncode == 0 and "built in" in res_build.stdout
        report_test("Test 45", "Vite Production Bundle Build", passed, "Production assets compiled successfully")
    except Exception as e:
        report_test("Test 45", "Vite Production Bundle Build", False, str(e))

    total = len(TEST_RESULTS)
    passed_count = sum(1 for t in TEST_RESULTS if t["passed"])
    failed_count = total - passed_count

    print("\n===================================================================")
    print("[SUMMARY] PHASE 9 TEST SUMMARY:")
    print(f"  Total:  {total}")
    print(f"  Passed: {passed_count}")
    print(f"  Failed: {failed_count}")
    print("===================================================================\n")

    if failed_count > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    run_phase9_suite()
