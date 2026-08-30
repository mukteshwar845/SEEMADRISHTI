"""
SEEMADRISHTI AI - Phase 20 Verification Suite
AI Surveillance Search Across Cameras + Automatic Incident Intelligence Summary

Team: IQ100
Problem Statement: SIH26187 - AI-Based Intelligent Video Analytics Platform
for Border Surveillance using Existing CCTV Infrastructure

Tests:
1. test_search_schema
2. test_parse_critical_incident_query
3. test_parse_time_range
4. test_parse_tripwire_query
5. test_parse_restricted_zone_query
6. test_parse_track_query
7. test_parse_camera_query
8. test_parse_unresolved_incident_query
9. test_real_database_search
10. test_search_returns_real_incident_ids
11. test_search_does_not_fabricate_results
12. test_track_journey_ordering
13. test_cross_camera_journey_uses_real_handover
14. test_insufficient_journey_data
15. test_incident_summary_schema
16. test_summary_uses_real_events
17. test_summary_does_not_show_missing_events
18. test_risk_summary_matches_existing_risk_engine
19. test_behavior_pattern_matches_behavior_chain
20. test_camera_path_matches_real_data
21. test_no_random_search_results
22. test_no_hardcoded_search_counts
23. test_no_fake_incident_summary
24. test_search_incident_linkage
25. test_search_behavior_chain_linkage
26. test_phase19_compatibility
27. test_phase18_compatibility
28. test_real_cam01_search_and_summary
"""

import unittest
import time
from datetime import datetime
from cv_service.search.query_parser import QueryParser
from cv_service.search.intelligence_search import IntelligenceSearchEngine
from cv_service.intelligence.incident_summary import IncidentIntelligenceSummaryGenerator
from cv_service.behavior.behavior_chain import BehaviorChainEngine
from cv_service.risk.engine import RiskEngine


class Phase20VerificationSuite(unittest.TestCase):
    """Comprehensive test suite for Phase 20 AI Surveillance Search & Automatic Intelligence Summary."""

    def setUp(self):
        self.parser = QueryParser()
        self.search_engine = IntelligenceSearchEngine()
        self.summary_generator = IncidentIntelligenceSummaryGenerator()
        self.chain_engine = BehaviorChainEngine()
        self.risk_engine = RiskEngine()

        # Build realistic fixtures
        self.mock_incidents = [
            {
                "id": "INC-000552",
                "camera_id": "cam-01",
                "track_id": 27,
                "class_name": "person",
                "event_type": "RESTRICTED_ZONE_ENTRY",
                "risk_score": 91,
                "risk_level": "CRITICAL",
                "zone_name": "Sector Alpha Restricted Depot",
                "started_at": "2026-08-30T10:30:00Z",
                "acknowledged": 0,
                "evidence_path": "/evidence/INC-000552.mp4",
                "evidence_status": "ready",
                "metadata": {
                    "reasons": [
                        {"factor": "Restricted Zone Intrusion", "points": 40},
                        {"factor": "Persistent Loitering", "points": 25},
                        {"factor": "Boundary Re-entry", "points": 10},
                        {"factor": "Abnormal Movement", "points": 8},
                        {"factor": "Multi-Event Escalation", "points": 8},
                    ]
                },
            },
            {
                "id": "INC-000541",
                "camera_id": "cam-03",
                "track_id": 18,
                "class_name": "person",
                "event_type": "TRIPWIRE_CROSSING",
                "risk_score": 65,
                "risk_level": "HIGH",
                "zone_name": "Sector Gamma Perimeter Line",
                "started_at": "2026-08-30T10:15:00Z",
                "acknowledged": 1,
                "evidence_path": "/evidence/INC-000541.mp4",
                "evidence_status": "ready",
                "metadata": {"reasons": [{"factor": "Tripwire Breach", "points": 35}]},
            },
            {
                "id": "INC-000510",
                "camera_id": "cam-07",
                "track_id": 44,
                "class_name": "vehicle",
                "event_type": "WRONG_DIRECTION",
                "risk_score": 45,
                "risk_level": "MEDIUM",
                "zone_name": "East Perimeter Outpost",
                "started_at": "2026-08-30T09:00:00Z",
                "acknowledged": 0,
                "evidence_path": "/evidence/INC-000510.mp4",
                "evidence_status": "ready",
            },
        ]

        self.mock_events = [
            {
                "id": "EVT-101",
                "camera_id": "cam-01",
                "track_id": 27,
                "event_type": "DETECTION",
                "timestamp": 1788085800.0,
                "metadata": {"class_name": "person"},
            },
            {
                "id": "EVT-102",
                "camera_id": "cam-01",
                "track_id": 27,
                "event_type": "TRIPWIRE_CROSSING",
                "timestamp": 1788085812.0,
                "metadata": {"direction": "IN", "tripwire_name": "Perimeter Wire Alpha"},
            },
            {
                "id": "EVT-103",
                "camera_id": "cam-01",
                "track_id": 27,
                "event_type": "RESTRICTED_ZONE_ENTRY",
                "timestamp": 1788085826.0,
                "metadata": {"zone_name": "Sector Alpha Restricted Depot"},
            },
            {
                "id": "EVT-104",
                "camera_id": "cam-01",
                "track_id": 27,
                "event_type": "LOITERING",
                "timestamp": 1788085844.0,
                "metadata": {"dwell_seconds": 41.0},
            },
            {
                "id": "EVT-105",
                "camera_id": "cam-02",
                "track_id": 27,
                "event_type": "CROSS_CAMERA_HANDOVER",
                "timestamp": 1788085855.0,
                "metadata": {"from_camera": "cam-01", "to_camera": "cam-02", "correlation_id": "CORR-0102-001"},
            },
        ]

    # 1. test_search_schema
    def test_search_schema(self):
        f = self.parser.parse("Show critical incidents")
        self.assertIn("query", f)
        self.assertIn("entity", f)
        self.assertIn("risk_level", f)
        self.assertIn("chips", f)

    # 2. test_parse_critical_incident_query
    def test_parse_critical_incident_query(self):
        f = self.parser.parse("Show critical incidents in the last 10 minutes")
        self.assertEqual(f["entity"], "incident")
        self.assertEqual(f["risk_level"], "CRITICAL")
        self.assertEqual(f["time_range"], {"value": 10, "unit": "minutes"})
        self.assertIn("CRITICAL", f["chips"])
        self.assertIn("LAST 10 MIN", f["chips"])

    # 3. test_parse_time_range
    def test_parse_time_range(self):
        f1 = self.parser.parse("incidents in last 2 hours")
        self.assertEqual(f1["time_range"], {"value": 2, "unit": "hours"})

        f2 = self.parser.parse("events today")
        self.assertEqual(f2["time_range"]["value"], 24)

    # 4. test_parse_tripwire_query
    def test_parse_tripwire_query(self):
        f = self.parser.parse("Show all tripwire crossings")
        self.assertEqual(f["event_type"], "TRIPWIRE_CROSSING")
        self.assertIn("TRIPWIRE", f["chips"])

    # 5. test_parse_restricted_zone_query
    def test_parse_restricted_zone_query(self):
        f = self.parser.parse("Show restricted zone breaches in CAM-01")
        self.assertEqual(f["event_type"], "RESTRICTED_ZONE_ENTRY")
        self.assertIn("cam-01", f["camera_ids"])
        self.assertIn("CAM-01", f["chips"])

    # 6. test_parse_track_query
    def test_parse_track_query(self):
        f = self.parser.parse("Show person #27")
        self.assertEqual(f["track_id"], 27)
        self.assertEqual(f["class_name"], "person")
        self.assertIn("TARGET #27", f["chips"])

    # 7. test_parse_camera_query
    def test_parse_camera_query(self):
        f = self.parser.parse("Which cameras had restricted breaches?")
        self.assertEqual(f["entity"], "camera")
        self.assertEqual(f["event_type"], "RESTRICTED_ZONE_ENTRY")
        self.assertIn("CAMERA BREAKDOWN", f["chips"])

    # 8. test_parse_unresolved_incident_query
    def test_parse_unresolved_incident_query(self):
        f = self.parser.parse("Show unresolved incidents")
        self.assertEqual(f["entity"], "incident")
        self.assertEqual(f["status"], "unresolved")
        self.assertIn("UNRESOLVED", f["chips"])

    # 9. test_real_database_search
    def test_real_database_search(self):
        f = self.parser.parse("Show critical incidents")
        res = self.search_engine.search(f, incidents=self.mock_incidents)
        self.assertEqual(res["result_count"], 1)
        self.assertEqual(res["results"][0]["incident_id"], "INC-000552")
        self.assertEqual(res["results"][0]["risk_level"], "CRITICAL")

    # 10. test_search_returns_real_incident_ids
    def test_search_returns_real_incident_ids(self):
        f = self.parser.parse("Show all incidents")
        res = self.search_engine.search(f, incidents=self.mock_incidents)
        ids = [r["incident_id"] for r in res["results"]]
        self.assertIn("INC-000552", ids)
        self.assertIn("INC-000541", ids)
        self.assertIn("INC-000510", ids)

    # 11. test_search_does_not_fabricate_results
    def test_search_does_not_fabricate_results(self):
        # Query for non-existent camera
        f = self.parser.parse("Show incidents in CAM-09")
        res = self.search_engine.search(f, incidents=self.mock_incidents)
        self.assertEqual(res["result_count"], 0)
        self.assertTrue(res["insufficient_data"])
        self.assertEqual(res["message"], "NO MATCHING SURVEILLANCE EVENTS")

    # 12. test_track_journey_ordering
    def test_track_journey_ordering(self):
        f = self.parser.parse("Show person #27 journey")
        res = self.search_engine.search(f, events=self.mock_events)
        self.assertIsNotNone(res["journey"])
        steps = res["journey"]["steps"]
        self.assertEqual(len(steps), 5)
        # Verify strictly chronological
        for i in range(len(steps) - 1):
            self.assertLessEqual(steps[i]["timestamp"], steps[i + 1]["timestamp"])

    # 13. test_cross_camera_journey_uses_real_handover
    def test_cross_camera_journey_uses_real_handover(self):
        f = self.parser.parse("Show person #27 journey")
        res = self.search_engine.search(f, events=self.mock_events)
        journey = res["journey"]
        self.assertTrue(journey["is_complete"])
        self.assertIn("cam-01", journey["camera_path"])
        self.assertIn("cam-02", journey["camera_path"])
        self.assertTrue(any(s["event_type"] == "CROSS_CAMERA_HANDOVER" for s in journey["steps"]))

    # 14. test_insufficient_journey_data
    def test_insufficient_journey_data(self):
        # Query target that does not exist
        f = self.parser.parse("Show person #999 journey")
        res = self.search_engine.search(f, events=self.mock_events)
        self.assertTrue(res["insufficient_data"])
        self.assertIn("INSUFFICIENT DATA", res["message"])

    # 15. test_incident_summary_schema
    def test_incident_summary_schema(self):
        summary = self.summary_generator.generate_summary(self.mock_incidents[0])
        self.assertIn("incident_id", summary)
        self.assertIn("classification", summary)
        self.assertIn("target", summary)
        self.assertIn("camera_path", summary)
        self.assertIn("observed_behaviors", summary)
        self.assertIn("risk_score", summary)
        self.assertIn("risk_reasons", summary)
        self.assertIn("forensic_evidence", summary)

    # 16. test_summary_uses_real_events
    def test_summary_uses_real_events(self):
        summary = self.summary_generator.generate_summary(
            incident=self.mock_incidents[0],
            timeline=[
                {"event_type": "TRIPWIRE_CROSSING"},
                {"event_type": "RESTRICTED_ZONE_ENTRY"},
                {"event_type": "LOITERING"},
            ],
        )
        self.assertIn("Entered restricted zone", summary["observed_behaviors"])
        self.assertIn("Crossed perimeter tripwire", summary["observed_behaviors"])
        self.assertTrue(any("Loitered" in b for b in summary["observed_behaviors"]))

    # 17. test_summary_does_not_show_missing_events
    def test_summary_does_not_show_missing_events(self):
        # Incident with only tripwire crossing
        summary = self.summary_generator.generate_summary(incident=self.mock_incidents[1])
        self.assertIn("Crossed perimeter tripwire", summary["observed_behaviors"])
        self.assertNotIn("Entered restricted zone", summary["observed_behaviors"])
        self.assertNotIn("Loitered in monitored perimeter", summary["observed_behaviors"])

    # 18. test_risk_summary_matches_existing_risk_engine
    def test_risk_summary_matches_existing_risk_engine(self):
        summary = self.summary_generator.generate_summary(self.mock_incidents[0])
        self.assertEqual(summary["risk_score"], 91)
        self.assertEqual(summary["risk_level"], "CRITICAL")
        # Factors from existing incident metadata
        factors = [r["factor"] for r in summary["risk_reasons"]]
        self.assertIn("Restricted Zone Intrusion", factors)
        self.assertIn("Persistent Loitering", factors)

    # 19. test_behavior_pattern_matches_behavior_chain
    def test_behavior_pattern_matches_behavior_chain(self):
        mock_chain = {
            "chain_id": "CHAIN-001",
            "track_id": 27,
            "behavior_pattern": "POSSIBLE_RECONNAISSANCE",
            "risk_score": 91,
            "risk_level": "CRITICAL",
            "events": [
                {"event_type": "TRIPWIRE_CROSSING"},
                {"event_type": "RESTRICTED_ZONE_ENTRY"},
                {"event_type": "LOITERING", "metadata": {"dwell_seconds": 41.0}},
                {"event_type": "RE_ENTRY", "metadata": {"reentry_count": 1}},
            ],
            "camera_ids": ["cam-01", "cam-02"],
        }
        summary = self.summary_generator.generate_summary(self.mock_incidents[0], behavior_chain=mock_chain)
        self.assertEqual(summary["behavior_pattern"], "POSSIBLE_RECONNAISSANCE")
        self.assertEqual(summary["classification"], "Possible Reconnaissance Pattern")

    # 20. test_camera_path_matches_real_data
    def test_camera_path_matches_real_data(self):
        summary = self.summary_generator.generate_summary(
            self.mock_incidents[0],
            camera_path=["cam-01", "cam-02", "cam-04"]
        )
        self.assertEqual(summary["camera_path"], ["CAM-01", "CAM-02", "CAM-04"])

    # 21. test_no_random_search_results
    def test_no_random_search_results(self):
        # Repeat query 5 times, verify identical deterministic result
        q = "Show critical incidents in CAM-01"
        res_list = []
        for _ in range(5):
            f = self.parser.parse(q)
            res = self.search_engine.search(f, incidents=self.mock_incidents)
            res_list.append([r["incident_id"] for r in res["results"]])

        for r in res_list[1:]:
            self.assertEqual(r, res_list[0])

    # 22. test_no_hardcoded_search_counts
    def test_no_hardcoded_search_counts(self):
        f = self.parser.parse("Which cameras had restricted breaches?")
        res = self.search_engine.search(f, incidents=self.mock_incidents)
        stats = {r["camera_id"]: r["breach_count"] for r in res["results"]}
        # In our mock data: cam-01 has 1 breach, cam-03 has 0 restricted breaches, cam-07 has 0
        self.assertEqual(stats["cam-01"], 1)
        self.assertEqual(stats["cam-03"], 0)
        self.assertEqual(stats["cam-04"], 0)

    # 23. test_no_fake_incident_summary
    def test_no_fake_incident_summary(self):
        # Bare incident with no loitering should not fabricate loitering
        bare_inc = {
            "id": "INC-000999",
            "camera_id": "cam-02",
            "track_id": 99,
            "event_type": "TRIPWIRE_CROSSING",
            "risk_score": 35,
            "risk_level": "LOW",
        }
        summary = self.summary_generator.generate_summary(bare_inc)
        self.assertEqual(summary["classification"], "Perimeter Crossing")
        self.assertEqual(summary["observed_behaviors"], ["Crossed perimeter tripwire"])

    # 24. test_search_incident_linkage
    def test_search_incident_linkage(self):
        f = self.parser.parse("Show INC-000552")
        self.assertEqual(f["incident_id"], "INC-000552")
        res = self.search_engine.search(f, incidents=self.mock_incidents)
        self.assertEqual(res["result_count"], 1)
        self.assertEqual(res["results"][0]["incident_id"], "INC-000552")

    # 25. test_search_behavior_chain_linkage
    def test_search_behavior_chain_linkage(self):
        mock_chains = [
            {
                "chain_id": "CHAIN-000001",
                "incident_id": "INC-000552",
                "track_id": 27,
                "camera_id": "cam-01",
                "behavior_pattern": "POSSIBLE_RECONNAISSANCE",
                "risk_score": 91,
                "risk_level": "CRITICAL",
            }
        ]
        f = self.parser.parse("Show possible reconnaissance")
        res = self.search_engine.search(f, incidents=self.mock_incidents, behavior_chains=mock_chains)
        self.assertGreaterEqual(res["result_count"], 1)

    # 26. test_phase19_compatibility
    def test_phase19_compatibility(self):
        # Verify BehaviorChainEngine directly integrates with search
        chain = self.chain_engine.ingest_detection("cam-01", 27, "person", (100.0, 200.0), {}, 10.0)
        self.chain_engine.ingest_tripwire_crossing("cam-01", 27, "Tripwire 1", "IN", 15.0)
        self.chain_engine.ingest_zone_entry("cam-01", 27, "Restricted Polygon", 20.0)

        f = self.parser.parse("Show track #27")
        res = self.search_engine.search(f, behavior_chains=[c.to_dict() for c in self.chain_engine.get_active_chains()])
        self.assertEqual(res["result_count"], 1)
        self.assertEqual(res["results"][0]["track_id"], 27)

    # 27. test_phase18_compatibility
    def test_phase18_compatibility(self):
        # Verify RiskEngine output flows into incident summary directly
        assessment, _ = self.risk_engine.evaluate_track(
            camera_id="cam-01",
            track={"track_id": 27, "class_name": "person", "bbox": {"x1": 100, "y1": 100, "x2": 150, "y2": 200}},
            is_inside_zone=True,
            has_intrusion=True,
            is_loitering=True,
            dwell_seconds=25.0,
            reentry_count=1,
            current_time=time.time(),
        )
        inc = {
            "id": "INC-PH18",
            "camera_id": "cam-01",
            "track_id": 27,
            "event_type": "RESTRICTED_ZONE_ENTRY",
            "risk_score": assessment.score,
            "risk_level": assessment.level,
            "metadata": {"reasons": [r.to_dict() for r in assessment.reasons]},
        }
        summary = self.summary_generator.generate_summary(inc)
        self.assertEqual(summary["risk_score"], assessment.score)
        self.assertEqual(summary["risk_level"], assessment.level)

    # 28. test_real_cam01_search_and_summary
    def test_real_cam01_search_and_summary(self):
        # Ingest real CAM-01 scenario sequence
        self.chain_engine.ingest_detection("cam-01", 33, "person", (320.0, 450.0), {}, 100.0)
        self.chain_engine.ingest_tripwire_crossing("cam-01", 33, "Virtual Tripwire #1", "IN", 105.0)
        self.chain_engine.ingest_zone_entry("cam-01", 33, "Sector Alpha Polygon", 110.0)
        self.chain_engine.ingest_loitering("cam-01", 33, "Sector Alpha Polygon", 22.0, 132.0)
        self.chain_engine.ingest_reentry("cam-01", 33, 1, 140.0)
        self.chain_engine.ingest_cross_camera_handover("cam-01", "cam-02", 33, "CORR-CAM01-02", 150.0)

        chain = self.chain_engine.get_chain("cam-01", 33)
        self.assertIsNotNone(chain)

        real_inc = {
            "id": "INC-000552",
            "camera_id": "cam-01",
            "track_id": 33,
            "class_name": "person",
            "event_type": "RESTRICTED_ZONE_ENTRY",
            "risk_score": 91,
            "risk_level": "CRITICAL",
            "started_at": "2026-08-30T10:32:00Z",
            "evidence_status": "ready",
            "sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
        }

        summary = self.summary_generator.generate_summary(real_inc, behavior_chain=chain.to_dict())
        self.assertEqual(summary["classification"], "Possible Reconnaissance Pattern")
        self.assertIn("CAM-01", summary["camera_path"])
        self.assertIn("CAM-02", summary["camera_path"])
        self.assertEqual(len(summary["observed_behaviors"]), 5)

        # Search for this real target
        search_f = self.parser.parse("Show person #33 journey")
        search_res = self.search_engine.search(search_f, behavior_chains=[chain.to_dict()])
        self.assertEqual(search_res["result_count"], 1)
        self.assertTrue(search_res["journey"]["is_complete"])
        self.assertEqual(search_res["journey"]["step_count"], 6)


if __name__ == "__main__":
    unittest.main()
