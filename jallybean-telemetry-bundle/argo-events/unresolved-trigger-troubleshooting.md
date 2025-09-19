# Unresolved Trigger Issue: Sensor → Tekton PipelineRun

## Status

- ✅ EventSource receives HTTP POST events (tested via curl)
- ✅ Sensor pod is running, electing leadership, and connected to NATS
- ❌ Sensor is NOT triggering Tekton PipelineRun

## Observations

- Event is received and acknowledged
- No PipelineRun appears after submission
- No logs in Sensor show failed trigger evaluation

## Suggested Next Steps

- Check if Tekton CRDs (Pipeline, PipelineRun) are installed correctly
- Validate if RBAC allows Sensor to create PipelineRuns
- Confirm Sensor logs with debug flag enabled (`SENSOR_LOGLEVEL=debug`)
- Try sending a minimal test PipelineRun via Sensor YAML without parameters
