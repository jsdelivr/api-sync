cd /home/api-sync
git fetch --all
git reset --hard origin/master
git pull -p
npm install
PORT=80 npm run start
