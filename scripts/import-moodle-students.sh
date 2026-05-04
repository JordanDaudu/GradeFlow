#!/usr/bin/env bash

set -euo pipefail

pnpm --filter @workspace/api-server run import:moodle-students -- "$@"
