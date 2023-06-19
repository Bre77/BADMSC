mv stage stage2
node bin/build.js build
mv stage badmsc
mv stage2 stage
chmod -R u=rwX,go= badmsc/*
chmod -R u-x+X badmsc/*
chmod -R u=rwx,go= badmsc/bin/*
rm $1
tar -cpzf $1 --exclude=badmsc/.* --exclude=badmsc/local badmsc
rm -rf badmsc

