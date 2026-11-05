param([string]$Target = 'http://host.docker.internal:3000')
$ErrorActionPreference = 'Stop'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is required for the OWASP ZAP baseline scan.' }
New-Item -ItemType Directory -Force -Path security-results | Out-Null
docker run --rm --network host -v "${PWD}/security-results:/zap/wrk:rw" -v "${PWD}/security-tests/zap-baseline.conf:/zap/wrk/zap-baseline.conf:ro" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t $Target -c zap-baseline.conf -J zap-report.json -r zap-report.html

