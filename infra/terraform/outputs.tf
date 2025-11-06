output "vpc_id" {
  description = "ID of the provisioned VPC"
  value       = module.network.vpc_id
}

output "public_subnet_ids" {
  description = "IDs for public subnets"
  value       = module.network.public_subnets
}

output "private_subnet_ids" {
  description = "IDs for private subnets"
  value       = module.network.private_subnets
}
