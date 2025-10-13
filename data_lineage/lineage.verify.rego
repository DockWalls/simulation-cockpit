package lineage.verify

import rego.v1

default deny = []

deny contains msg if {
    some job in input.marquez.jobs
    count(job.inputs) == 0
    msg := sprintf("Job %q has no inputs.", [job.name])
}

deny contains msg if {
    some job in input.marquez.jobs
    count(job.outputs) == 0
    msg := sprintf("Job %q has no outputs.", [job.name])
}

deny contains msg if {
    some dataset in input.datahub.datasets
    not dataset.ownership
    msg := sprintf("Dataset %q has no owner.", [dataset.name])
}

deny contains msg if {
    some dataset in input.datahub.datasets
    not dataset.tags
    msg := sprintf("Dataset %q has no governance tags.", [dataset.name])
}
