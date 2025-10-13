from openlineage.client.run import RunEvent, RunState, Run, Job
from openlineage.client.serde import Serde
from openlineage.client.client import OpenLineageClient
from datetime import datetime, timezone
import uuid

client = OpenLineageClient(url="http://localhost:5002")
producer = "https://github.com/your-org/your-project"

# Create a valid run ID and timestamp
run_id = str(uuid.uuid4())
run = Run(runId=run_id)

# Set eventTime to ISO 8601 UTC timestamp
event_time = datetime.now(timezone.utc).isoformat()

# Define the job
job = Job(name="simulation_data_processing", namespace="default")

# Send the START event
client.emit(
    RunEvent(
        eventType=RunState.START,
        eventTime=event_time,
        run=run,
        job=job,
        producer=producer
    )
)
