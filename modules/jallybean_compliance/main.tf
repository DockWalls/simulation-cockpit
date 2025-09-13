terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.2.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2.4"
    }
  }
}

# YAML lint check (points to workflows in project root)


# Terraform validate
resource "null_resource" "tf_validate" {
  provisioner "local-exec" {
    command = "terraform validate"
  }
}

# Jallybean Compliance Rulebook check
resource "null_resource" "rulebook_check" {
  provisioner "local-exec" {
    command = <<EOT
      echo "Running Jallybean Compliance Rulebook checks..."
      ${path.root}/scripts/rulebook_check.sh
    EOT
  }
}
