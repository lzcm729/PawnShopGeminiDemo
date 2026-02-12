---
name: deploy-web
description: 构建并部署项目到 Web 服务器。执行 Vite 生产构建，通过 SSH/SCP 上传到远程服务器，替换 Nginx 托管目录，验证部署结果。触发场景：(1) 用户说"部署"、"deploy"、"上线"、"发布到服务器" (2) 用户说"更新服务器"、"同步到线上" (3) 用户说"部署到网站"、"deploy web"
---

# Deploy Web

构建 Vite 项目并通过 SSH 部署到远程 Nginx 服务器。

## Server Config

| Key | Value |
|-----|-------|
| Server | `124.222.217.9` |
| User | `ubuntu` |
| Auth | SSH key (no password) |
| Web server | Nginx |
| Deploy path | `/var/www/game/pawnshop/` |
| URL | `http://124.222.217.9/pawnshop/` |
| Domain | `game-underwaterspeaker.cloud` |

## Deploy Workflow

Run the deploy script:

```bash
bash .claude/skills/deploy-web/scripts/deploy.sh
```

The script handles: clean dist → vite build → scp upload → atomic swap → verify HTTP 200.

Optional args: `bash deploy.sh [server] [user] [remote_path]`

## Manual Steps (if script fails)

1. **Clean and build**: `rm -rf dist && node ./node_modules/vite/bin/vite.js build`
   - MUST clean dist/ first — OneDrive may lock old files causing exit 127
2. **Upload**: `scp -r dist/* ubuntu@124.222.217.9:/tmp/pawnshop-deploy/`
3. **Swap**: SSH in, `sudo rm -rf /var/www/game/pawnshop/* && sudo cp -r /tmp/pawnshop-deploy/* /var/www/game/pawnshop/ && sudo chown -R www-data:www-data /var/www/game/pawnshop/`
4. **Verify**: `curl -s -o /dev/null -w '%{http_code}' http://localhost/pawnshop/` should return 200

## Known Issues

### OneDrive dist/ lock (exit 127)
Vite build exits 127 if dist/ has files locked by OneDrive. Fix: `rm -rf dist` before build.

### Absolute asset paths
Code uses absolute paths (`/audio/...`, `/characters/...`) that resolve to server root, not `/pawnshop/`. Nginx config has alias rules to redirect these. If new asset directories are added, update `/etc/nginx/conf.d/game.conf`.

Current Nginx aliases:
```
/audio/       → /var/www/game/pawnshop/audio/
/characters/  → /var/www/game/pawnshop/characters/
/cursors/     → /var/www/game/pawnshop/cursors/
/items/       → /var/www/game/pawnshop/items/
/backgrounds/ → /var/www/game/pawnshop/backgrounds/
/data/        → /var/www/game/pawnshop/data/
/kenney/      → /var/www/game/pawnshop/kenney/
```

### crypto.randomUUID on HTTP
`crypto.randomUUID()` requires HTTPS. A polyfill in `index.tsx` handles this for HTTP deployments. Do not remove it unless the server uses HTTPS.

## Updating Nginx Config

```bash
ssh ubuntu@124.222.217.9 "sudo nano /etc/nginx/conf.d/game.conf"
ssh ubuntu@124.222.217.9 "sudo nginx -t && sudo systemctl reload nginx"
```
