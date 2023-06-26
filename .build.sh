#!/bin/bash
cd "${0%/*}"
OUTPUT="${1:-badmsc.spl}"
pwd
echo $OUTPUT
yarn install --non-interactive
yarn run build
chmod -R u=rwX,go= stage/*
chmod -R u-x+X stage/*
chmod -R u=rwx,go= stage/bin/*
mv stage badmsc
tar -cpzf $OUTPUT --exclude=badmsc/.* --overwrite badmsc 
rm -rf badmsc