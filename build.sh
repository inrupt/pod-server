rm -r node_modules
rm package-lock.json
npm install
cd node_modules/solid-idp
npm install
cd node_modules/oidc-provider
npm install
npm run build
cd ../../
npm run build
cd ../../
npm run build
