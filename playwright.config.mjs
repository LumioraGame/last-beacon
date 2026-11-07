import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/mobile',timeout:30000,workers:1,fullyParallel:false,
  use:{baseURL:'http://127.0.0.1:4185',headless:true,hasTouch:true,isMobile:true,viewport:{width:390,height:844},trace:'retain-on-failure'},
  webServer:{command:'PORT=4185 node server.mjs',url:'http://127.0.0.1:4185',reuseExistingServer:!process.env.CI},
  reporter:process.env.CI?'github':'list'
});
