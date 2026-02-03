#!/bin/bash

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "❌ gsutil is NOT installed."
    echo "To fix the Image Upload error, you need to install the Google Cloud CLI."
    echo ""
    echo "👉 Please install it from here: https://cloud.google.com/sdk/docs/install"
    echo ""
    echo "After installing, login with: gcloud auth login"
    echo "Then run this script again."
    exit 1
fi

# Apply CORS config
echo "✅ gsutil found. Applying CORS configuration..."
gsutil cors set cors.json gs://ecocycle-b409a.appspot.com

if [ $? -eq 0 ]; then
    echo "🎉 Success! CORS rules applied. Image uploads should work now."
else
    echo "❌ Failed to apply CORS rules. Make sure you are logged in (gcloud auth login)."
fi
