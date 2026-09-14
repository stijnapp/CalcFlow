the example equasion on the homescreen should actually be generated on the spot. so when i select a different difficulty or i change the configuration of chapters, it should immediately show a realistic example (not just realistic, but an exact example actually)

the app is not in actual use yet, so migrations/backward compatability isn't really necessary
- about that, i want to "host" it on my server (that's the "prodesk" allowed endpoint in the vite config). how to i run it on my server, and update when there are pushes on git? so: i update code on this laptop, push to git (just straight to main, im the only one using this project and am totally fine with pushing straight to main), server sees that/gets notified, pulls latest code, restarts docker, it should be updated. after putting that in place, you should keep migrations in mind, since from that point i'll actually use the app

also, update the readme with all the updates

docker wont start:
app-1  | Node.js v24.21.0
app-1  | node:internal/modules/package_json_reader:331
app-1  |   throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base), null);
app-1  |         ^
app-1  | 
app-1  | Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@calcflow/shared' imported from /app/dist/validate.js
app-1  |     at Object.getPackageJSONURL (node:internal/modules/package_json_reader:331:9)
app-1  |     at packageResolve (node:internal/modules/esm/resolve:784:25)
app-1  |     at moduleResolve (node:internal/modules/esm/resolve:873:18)
app-1  |     at defaultResolve (node:internal/modules/esm/resolve:1006:11)
app-1  |     at #cachedDefaultResolve (node:internal/modules/esm/loader:705:20)
app-1  |     at #resolveAndMaybeBlockOnLoaderThread (node:internal/modules/esm/loader:725:38)
app-1  |     at ModuleLoader.resolveSync (node:internal/modules/esm/loader:763:56)
app-1  |     at #resolve (node:internal/modules/esm/loader:687:17)
app-1  |     at ModuleLoader.getOrCreateModuleJob (node:internal/modules/esm/loader:607:35)
app-1  |     at ModuleJob.syncLink (node:internal/modules/esm/module_job:276:33) {
app-1  |   code: 'ERR_MODULE_NOT_FOUND'
app-1  | }
app-1  | 
app-1  | Node.js v24.21.0
app-1  | node:internal/modules/package_json_reader:331
app-1  |   throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base), null);
app-1  |         ^
app-1  | 
app-1  | Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@calcflow/shared' imported from /app/dist/validate.js
app-1  |     at Object.getPackageJSONURL (node:internal/modules/package_json_reader:331:9)
app-1  |     at packageResolve (node:internal/modules/esm/resolve:784:25)
app-1  |     at moduleResolve (node:internal/modules/esm/resolve:873:18)
app-1  |     at defaultResolve (node:internal/modules/esm/resolve:1006:11)
app-1  |     at #cachedDefaultResolve (node:internal/modules/esm/loader:705:20)
app-1  |     at #resolveAndMaybeBlockOnLoaderThread (node:internal/modules/esm/loader:725:38)
app-1  |     at ModuleLoader.resolveSync (node:internal/modules/esm/loader:763:56)
app-1  |     at #resolve (node:internal/modules/esm/loader:687:17)
app-1  |     at ModuleLoader.getOrCreateModuleJob (node:internal/modules/esm/loader:607:35)
app-1  |     at ModuleJob.syncLink (node:internal/modules/esm/module_job:276:33) {
app-1  |   code: 'ERR_MODULE_NOT_FOUND'
app-1  | }
app-1  | 
app-1  | Node.js v24.21.0