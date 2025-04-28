#!/bin/bash

# This script helps set up branch protection rules for master/main
# Run this script with appropriate GitHub CLI permissions

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI is not installed. Please install it first."
    exit 1
fi

# Get repository name
REPO=$(gh repo view --json name -q .name)
OWNER=$(gh repo view --json owner -q .owner.login)

# Set up branch protection for master
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER/$REPO/branches/master/protection" \
  -f required_status_checks='[{"context":"validate","strict":true}]' \
  -f enforce_admins=true \
  -f required_pull_request_reviews=null \
  -f restrictions=null \
  -f allow_force_pushes=false \
  -f allow_deletions=false

# Set up branch protection for main (if it exists)
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER/$REPO/branches/main/protection" \
  -f required_status_checks='[{"context":"validate","strict":true}]' \
  -f enforce_admins=true \
  -f required_pull_request_reviews=null \
  -f restrictions=null \
  -f allow_force_pushes=false \
  -f allow_deletions=false

echo "Branch protection rules have been set up for master and main branches." 