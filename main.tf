variable "project_id" {
  type    = string
  default = "ivory-mountain-470414-k1"
}

module "compliance" {
  source     = "./modules/jallybean_compliance"
  project_id = var.project_id
  region     = "us-central1"
}

module "access_control" {
  source     = "./modules/access_control"
  project_id = var.project_id
  principals = {
    "roles/cloudbuild.builds.editor"     = ["user:dockwalls2@gmail.com"]
    "roles/iam.serviceAccountUser"       = ["user:dockwalls2@gmail.com"]
    "roles/secretmanager.secretAccessor" = ["user:dockwalls2@gmail.com"]
  }
}