#!/bin/bash
cd /home/kavia/workspace/code-generation/branding-compliance-validator-214344-214346/branding_compliance_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

