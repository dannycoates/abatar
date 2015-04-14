#!/usr/bin/env bash

# run with `npm run cover`
rm -rf coverage
for FILE in test/*.js; do
  istanbul cover --report none --print none --include-pid $FILE
done
istanbul report
open coverage/lcov-report/index.html
