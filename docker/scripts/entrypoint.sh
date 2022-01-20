#!/bin/bash

# fetch new updates on docker restarts
 git pull
ls -a

yarn install --save --no-progress

npm start

