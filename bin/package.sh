cp -R stage badmsc

### Remove Python Compiled Files
shopt -s globstar
rm -r badmsc/**/__pycache__
rm badmsc/**/*.pyc
rm badmsc/**/*.so
rm -r badmsc/lib/**/tests

### Remove Extraneous Files
rm badmsc/**/.DS_STORE
rm badmsc/**/__MACOSX
rm badmsc/**/thumbs.db

### Remove READMEs and metadata
rm -f badmsc/metadata/local.meta
rm -f badmsc/bin/README
rm -f badmsc/default/data/ui/views/README

### Remove the backup lookup file dir created by the lookup editor
rm -f badmsc/lookups/lookup_file_backups/

### Ensure permissions are correct
chmod -R u=rwX,go= badmsc/* #
chmod -R u-x+X badmsc/*
chmod -R u=rwx,go= badmsc/bin/* #u=rwx,g=r,o=r

### Package App
rm dist/badmsc.spl
tar -cpzf dist/badmsc.spl --exclude=badmsc/.* --exclude=badmsc/local badmsc