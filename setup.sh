shopt -s globstar
rm -r src/main/resources/splunk/lib/*.egg-info
/opt/splunk/bin/splunk cmd python3 -m pip install --upgrade -t src/main/resources/splunk/lib splunk-sdk --no-dependencies
rm -r src/main/resources/splunk/lib/**/__pycache__