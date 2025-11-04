#!/bin/bash

# Create SSH directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Format the SSH key properly with newlines
# Extract the header, body, and footer
KEY_DATA="$SSH_KEY"

# Write the properly formatted key
{
  echo "-----BEGIN OPENSSH PRIVATE KEY-----"
  # Extract just the base64 data (between headers) and format it
  echo "$KEY_DATA" | sed 's/-----BEGIN OPENSSH PRIVATE KEY----- //' | sed 's/ -----END OPENSSH PRIVATE KEY-----//' | fold -w 70
  echo "-----END OPENSSH PRIVATE KEY-----"
} > ~/.ssh/id_rsa

# Set correct permissions
chmod 600 ~/.ssh/id_rsa

# Add a trailing newline (important!)
echo "" >> ~/.ssh/id_rsa

echo "SSH key setup complete"

# Verify
if ssh-keygen -l -f ~/.ssh/id_rsa 2>/dev/null; then
  echo "✓ SSH key is valid"
else
  echo "✗ SSH key validation failed"
  exit 1
fi
