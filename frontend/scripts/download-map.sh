#!/bin/bash
# Download world map GeoJSON for ECharts
echo "Downloading world map GeoJSON..."
curl -o public/world.json https://raw.githubusercontent.com/apache/echarts-examples/gh-pages/public/data/asset/geo/world.json
echo "Done!"
