# Быстрый деплой на VPS

## Минимальные шаги для запуска

### 1. На VPS выполните:

```bash
# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PM2
sudo npm install -g pm2

# Установка Nginx
sudo apt install -y nginx
```

### 2. Загрузите проект на VPS

```bash
# Через git или SCP/SFTP загрузите файлы в ~/PipirkaTube
cd ~/PipirkaTube
npm run install-all
```

### 3. Настройте Backend

```bash
cd backend

# Создайте .env файл
nano .env
```

Добавьте:
```env
PORT=5000
JWT_SECRET=сгенерируйте-случайную-строку-минимум-32-символа
FRONTEND_URL=http://ваш-домен.com
NODE_ENV=production
```

```bash
# Создайте папки
mkdir -p uploads/videos uploads/thumbnails logs

# Запустите с PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Соберите Frontend

```bash
cd ../frontend

# Создайте .env.production
echo "REACT_APP_API_URL=http://ваш-домен.com/api" > .env.production

# Соберите
npm run build
```

### 5. Настройте Nginx

```bash
sudo nano /etc/nginx/sites-available/pipirka-tube
```

Вставьте конфигурацию из `DEPLOY.md` (раздел "Настройка Nginx")

```bash
sudo ln -s /etc/nginx/sites-available/pipirka-tube /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Настройте Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Готово! ✅

Откройте `http://ваш-домен.com` и проверьте работу.

**Важно**: 
- Видео будут сохраняться в `~/PipirkaTube/backend/uploads/`
- Следите за свободным местом на диске!
- Для HTTPS установите SSL: `sudo certbot --nginx -d ваш-домен.com`

Подробная инструкция в файле `DEPLOY.md`

