mv stage temp
yarn run build
chmod -R u=rwX,go= stage/*
chmod -R u-x+X stage/*
chmod -R u=rwx,go= stage/bin/*
mv stage badmsc
rm dist/badmsc.spl
tar -cpzf dist/badmsc.spl --exclude=badmsc/.* --exclude=badmsc/local badmsc
rm -rf badmsc
mv temp stage
