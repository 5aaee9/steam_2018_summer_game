# Steam 2018 年暑期小游戏刷分脚本

<p align="center">
<img alt="Version" src="https://img.shields.io/badge/version-1.0.0-757575.svg?style=flat-square"/>
<a href="https://blog.indexyz.me"><img alt="Author" src="https://img.shields.io/badge/author-Indexyz-444444.svg?style=flat-square"/></a>
<a href="https://www.typescriptlang.org/"><img alt="Typescript" src="https://img.shields.io/badge/typescript-2.9.2-0e83cd.svg?style=flat-square"/></a>
<a href="https://nodejs.org/"><img alt="node.js" src="https://img.shields.io/badge/node.js-7.0+-43853d.svg?style=flat-square"/></a>
</p>

## 快速使用 (Linux)
使用前先在 steam 页面上加入星球
```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
nvm install 10
bash
npm install -g yarn
git clone https://github.com/Indexyz/steam_2018_summer_game.git
# 编辑 src/index.ts
# 去 https://steamcommunity.com/saliengame/gettoken 获取 token
# const userList = [
#    'YOUR_TOKEN',
# ]
# 将 YOUR_TOKEN 改为你的 TOKEN
# 可以填写多个用户的 token
yarn
yarn run build
node dist/index.js
# Enjoy!
```
