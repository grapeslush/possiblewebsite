terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.36"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Example network scaffold
module "network" {
  source = "hashicorp/vpc/aws"

  name = "possiblewebsite"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 2)
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Placeholder for ECS or Kubernetes deployment modules
# module "application" {
#   source = "./modules/app"
#   vpc_id = module.network.vpc_id
# }
