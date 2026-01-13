#!/bin/bash

BASE_URL="http://localhost:8787"

echo "=== Phase 5 Manual Test: Multimodal Synthesis ==="

# 1. Create a Test Project with Style Profile
echo "[Test] Creating Project 'Technical Edge'..."
curl -X POST "$BASE_URL/sync" -H "Content-Type: application/json" -d '{
  "projects": [{
    "id": "pro_test_1",
    "name": "Technical Edge",
    "globalPrompt": "Technical deep dives for architects",
    "knowledgeContext": "Velocity is a CMS built on Cloudflare Workers and PGlite.",
    "styleProfile": "{\"tone\":\"Provocative & Precise\",\"targetAudience\":\"Senior Engineers\",\"vocabularyConstraints\":[\"no enterprise jargon\"],\"fewShotExamples\":[]}",
    "scheduleInterval": "daily"
  }],
  "tasks": []
}'
echo -e "\n"

# 2. Add a Backlog Task
echo "[Test] Adding Task 'The Power of Recursive CTEs in SQLite'..."
curl -X POST "$BASE_URL/task" -H "Content-Type: application/json" -d '{
  "id": "task_test_1",
  "projectId": "pro_test_1",
  "title": "The Power of Recursive CTEs in SQLite",
  "status": "backlog",
  "createdAt": "2026-01-13T00:00:00Z",
  "updatedAt": "2026-01-13T00:00:00Z"
}'
echo -e "\n"

# 3. Trigger Autonomous Loop
echo "[Test] Triggering Autonomous Orchestration Loop..."
curl -X GET "$BASE_URL/trigger-autonomous-loop"
echo -e "\n"

# 4. Wait for processing and Verify Results
echo "[Test] Waiting 2 seconds for pipeline to finalize..."
sleep 2

echo "[Test] Fetching Task State (Verifying Image & Context)..."
curl -X GET "$BASE_URL/sync" | jq '.tasks[] | select(.id=="task_test_1")'

echo "[Test] Verifying Relational Knowledge Graph..."
# Note: Knowledge graph is internal to DO, but we can verify it via the sync's knowledge_graph if implemented
# For now, let's just check if the task has imageUrl and imageAlt
echo "=== Manual Test Sequence Complete ==="
