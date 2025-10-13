package security.main

import rego.v1

# all_resources flattens all module resources into one list
all_resources := [r | r := input.planned_values.root_module.resources[_]]

# addr returns the address or name of a resource
addr(r) := object.get(r, "address", object.get(r, "name", "<unknown>"))

deny contains msg if {
  r := all_resources[_]
  r.type == "google_container_cluster"
  not object.get(r.values, "enable_private_nodes", false)
  msg := sprintf("Cluster %q must enable private nodes (enable_private_nodes=true)", [addr(r)])
}

deny contains msg if {
  r := all_resources[_]
  r.type == "google_cloud_run_service"

  name := sprintf("%v", [object.get(r, "name", "")])
  not startswith(name, "verified-")
  not has_verified_label(r)
  not has_verified_annotation(r)
  msg := sprintf("Service %q must be prefixed with 'verified-' or labeled/annotated as verified", [addr(r)])
}

has_verified_label(r) if {
  # Try top-level labels
  labels := object.get(r.values, "labels", {})
  lower(sprintf("%v", [labels["verified"]])) == "true"
}

has_verified_label(r) if {
  # Walk nested template metadata labels if present
  some path, v
  walk(r.values, [path, v])
  is_object(v)
  v["labels"] != null
  lower(sprintf("%v", [v.labels["verified"]])) == "true"
}

has_verified_annotation(r) if {
  some path, v
  walk(r.values, [path, v])
  is_object(v)
  v["annotations"] != null
  lower(sprintf("%v", [v.annotations["security/verified"]])) == "true"
}

deny contains msg if {
  r := all_resources[_]
  r.type == "google_logging_project_sink"

  f := sprintf("%v", [object.get(r.values, "filter", "")])
  f == ""
  msg := sprintf("Telemetry sink %q must define a non-empty filter", [addr(r)])
}

deny contains msg if {
  r := all_resources[_]
  r.type == "google_logging_project_sink"

  f := sprintf("%v", [object.get(r.values, "filter", "")])
  is_ineffective_filter(f)
  msg := sprintf("Telemetry sink %q filter must scope by severity or resource; current filter is too permissive", [addr(r)])
}

deny contains msg if {
  r := all_resources[_]
  r.type == "google_logging_project_sink"

  d := sprintf("%v", [object.get(r.values, "destination", "")])
  d == ""
  msg := sprintf("Telemetry sink %q must set a destination", [addr(r)])
}

deny contains msg if {
  r := all_resources[_]
  r.type == "google_logging_project_sink"

  not object.get(r.values, "unique_writer_identity", false)
  msg := sprintf("Telemetry sink %q must enable unique_writer_identity=true", [addr(r)])
}

is_ineffective_filter(f) if {
  lower(trim_whitespace(f)) == "true"
}

is_ineffective_filter(f) if {
  trim_whitespace(f) == "*"
}

is_ineffective_filter(f) if {
  not contains(f, "severity")
  not contains(f, "resource.type")
  not contains(f, "logName")
}

trim_whitespace(s) = out if {
  out := trim(trim(trim(trim(s, " "), "\t"), "\n"), "\r")
}

deny contains msg if {
  r := all_resources[_]
  r.type == "google_compute_disk"

  labels := object.get(r.values, "labels", {})
  not labels["ephemeral"]
  msg := sprintf("Disk %q must be labeled 'ephemeral' to enforce stateless architecture", [addr(r)])
}
