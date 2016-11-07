ci: test
	npm run coverage
	npm run docs

test: lint
	npm run $@

lint: node_modules
	npm run $@

clean:
	rm -rf node_modules

node_modules: package.json
	npm install

.PHONY: node_modules
