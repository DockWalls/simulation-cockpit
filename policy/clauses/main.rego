package main

deny["Region not allowed for tenant"] {
    input.tenant == "commander"
    input.region != "us-west-2"
}

deny["Severity not allowed for tenant"] {
    input.tenant == "observer"
    input.severity == "critical"
}

deny["Severity not allowed for tenant"] {
    input.tenant == "analyst"
    input.severity == "critical"
}
