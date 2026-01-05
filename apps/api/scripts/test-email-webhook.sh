#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api/v1"
WEBHOOK_URL="$API_URL/email/webhook"

# Mock SendGrid Inbound Parse Webhook Payload
# SendGrid sends multipart/form-data, but our controller might accept JSON if configured so,
# or we can simulate the relevant fields. 
# Looking at the controller: it expects body.to, body.from, body.subject etc.
# Typically SendGrid sends form-data. Let's try sending JSON first as NestJS parses it by default.

echo "Testing Email Webhook at $WEBHOOK_URL..."

# Payload mimicking a parsed email
PAYLOAD='{
  "to": "support@example.com",
  "from": "Sender Name <sender@test.com>",
  "subject": "Test Webhook Email",
  "text": "This is a test email content received via webhook.",
  "html": "<p>This is a test email content received via webhook.</p>",
  "messageId": "test-message-id-123"
}'

# Send Request
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if [ "$response" -eq 201 ] || [ "$response" -eq 200 ]; then
  echo "✅ Webhook Test Passed (Status: $response)"
else
  echo "❌ Webhook Test Failed (Status: $response)"
  # Try to show response body for debugging
  curl -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d "$PAYLOAD"
fi
