#!/bin/bash
export PATH="/home/master/bin/npm/lib/node_modules/bin:$PATH"
git pull
npm install
npm run build
pm2 delete eden-next || true
rm -rf .next/cache
pm2 start npm --name "eden-next" -- start -- -p 3000
pm2 save