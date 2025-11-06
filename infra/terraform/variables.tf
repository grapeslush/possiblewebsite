variable "aws_region" {
  type        = string
  description = "AWS region to deploy infrastructure into"
  default     = "us-east-1"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the primary VPC"
  default     = "10.0.0.0/16"
}

variable "public_subnets" {
  type        = list(string)
  description = "Public subnet CIDRs"
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnets" {
  type        = list(string)
  description = "Private subnet CIDRs"
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}
