mv stage stage2
node bin/build.js build
mv stage badmsc
mv stage2 stage
chmod -R u=rwX,go= badmsc/*
chmod -R u-x+X badmsc/*
chmod -R u=rwx,go= badmsc/bin/*
rm dist/badmsc.spl
tar -cpzf dist/badmsc.spl --exclude=badmsc/.* --exclude=badmsc/local badmsc
rm -rf badmsc

