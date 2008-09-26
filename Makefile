
all:
	@echo "Usage:"
	@echo " make install        -- install webdev.js as symlink"
	@echo " make install-hard   -- copy webdev.js to plugins dir"

install: dir
	ln -s $$(pwd)/webdev.js ~/.vimperator/plugin/

install-hard: dir
	cp webdev.js ~/.vimperator/plugin/

dir:
	test -d ~/.vimperator/plugin || mkdir -p ~/.vimperator/plugin

.PHONY: all install install-hard dir