#!/bin/bash

NPM_LIB_PATH=$(npm root -g)
TRONBOX_PATH=$NPM_LIB_PATH/tronbox
sed -i '' -e 's/0\.8\.21/0\.8\.20/g' "$TRONBOX_PATH/build/components/TronSolc.js"
echo "Replace done!"
