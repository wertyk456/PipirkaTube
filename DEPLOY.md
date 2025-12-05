# Инструкция по развертыванию PipirkaTube на VPS

## Подготовка VPS

### 1. Установка необходимого ПО

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js (версия 18 или выше)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PM2 (процесс-менеджер)
sudo npm install -g pm2

# Установка Nginx (для проксирования)
sudo apt install -y nginx
```

### 2. Клонирование проекта

```bash
# Перейдите в домашнюю директорию
cd ~

# Клонируйте ваш репозиторий (или загрузите файлы через SCP/SFTP)
git clone <ваш-репозиторий> PipirkaTube
cd PipirkaTube
```

### 3. Установка зависимостей

```bash
npm run install-all
```

## Настройка Backend

### 1. Создание файла .env

```bash
cd backend
nano .env
```

Добавьте следующее содержимое:

```env
PORT=5000
JWT_SECRET=ваш-очень-случайный-секретный-ключ-минимум-32-символа
FRONTEND_URL=http://ваш-домен.com
NODE_ENV=production
```

**Важно**: Сгенерируйте случайный JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Создание папок для загрузок

```bash
mkdir -p ~/PipirkaTube/backend/uploads/videos
mkdir -p ~/PipirkaTube/backend/uploads/thumbnails
chmod -R 755 ~/PipirkaTube/backend/uploads
```

### 3. Запуск Backend с PM2

```bash
cd ~/PipirkaTube/backend

# Создайте файл ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'pipirka-tube-backend',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
EOF

# Создайте папку для логов
mkdir -p logs

# Запустите приложение
pm2 start ecosystem.config.js

# Сохраните конфигурацию PM2
pm2 save

# Настройте автозапуск при перезагрузке
pm2 startup
```

## Настройка Frontend

### 1. Сборка React приложения

```bash
cd ~/PipirkaTube/frontend

# Создайте файл .env.production
cat > .env.production << EOF
REACT_APP_API_URL=http://ваш-домен.com/api
EOF

# Соберите приложение
npm run build
```

### 2. Обновите API URL в коде

Отредактируйте файл `frontend/src/context/AuthContext.js`:

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
```

Или используйте переменную окружения при сборке.

## Настройка Nginx

### 1. Создание конфигурации Nginx

```bash
sudo nano /etc/nginx/sites-available/pipirka-tube
```

Добавьте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name ваш-домен.com www.ваш-домен.com;

    # Увеличение лимитов для загрузки больших файлов
    client_max_body_size 500M;
    client_body_timeout 300s;

    # Frontend (React build)
    location / {
        root /home/ваш-пользователь/PipirkaTube/frontend/build;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Увеличение таймаутов для загрузки видео
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Статические файлы (видео и превью)
    location /uploads {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Кэширование статических файлов
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**Важно**: Замените:
- `ваш-домен.com` на ваш реальный домен
- `ваш-пользователь` на имя вашего пользователя на VPS

### 2. Активация конфигурации

```bash
# Создайте символическую ссылку
sudo ln -s /etc/nginx/sites-available/pipirka-tube /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию (если нужно)
sudo rm /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
sudo nginx -t

# Перезапустите Nginx
sudo systemctl restart nginx
```

## Настройка SSL (HTTPS) - Рекомендуется

### Использование Let's Encrypt (Certbot)

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение SSL сертификата
sudo certbot --nginx -d ваш-домен.com -d www.ваш-домен.com

# Автоматическое обновление сертификата
sudo certbot renew --dry-run
```

## Настройка Firewall

```bash
# Разрешить HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Разрешить SSH (если еще не разрешено)
sudo ufw allow 22/tcp

# Включить firewall
sudo ufw enable
```

## Проверка работы

### 1. Проверка Backend

```bash
# Проверьте статус PM2
pm2 status

# Проверьте логи
pm2 logs pipirka-tube-backend

# Проверьте API напрямую
curl http://localhost:5000/api/health
```

### 2. Проверка Frontend

Откройте в браузере: `http://ваш-домен.com`

## Полезные команды PM2

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs pipirka-tube-backend

# Перезапуск
pm2 restart pipirka-tube-backend

# Остановка
pm2 stop pipirka-tube-backend

# Удаление из PM2
pm2 delete pipirka-tube-backend
```

## Обновление приложения

```bash
cd ~/PipirkaTube

# Получите последние изменения
git pull

# Установите новые зависимости
npm run install-all

# Пересоберите frontend
cd frontend
npm run build

# Перезапустите backend
cd ../backend
pm2 restart pipirka-tube-backend
```

## Важные замечания

### Хранение видео

⚠️ **Внимание**: Видео хранятся локально на VPS. Убедитесь, что у вас достаточно места на диске!

Для продакшена рекомендуется:
- Использовать облачное хранилище (AWS S3, Google Cloud Storage, etc.)
- Настроить автоматическое резервное копирование
- Мониторить использование дискового пространства

### Безопасность

1. **Измените JWT_SECRET** на случайную строку
2. **Используйте HTTPS** (SSL сертификат)
3. **Настройте регулярные бэкапы** базы данных
4. **Ограничьте размер загружаемых файлов** (уже настроено: 500MB)
5. **Используйте сильные пароли** для пользователей

### Мониторинг

Рекомендуется установить:
- PM2 Plus для мониторинга
- Логирование ошибок
- Мониторинг дискового пространства

## Решение проблем

### Видео не загружаются

1. Проверьте права доступа к папке uploads:
```bash
ls -la ~/PipirkaTube/backend/uploads
chmod -R 755 ~/PipirkaTube/backend/uploads
```

2. Проверьте логи PM2:
```bash
pm2 logs pipirka-tube-backend
```

3. Проверьте логи Nginx:
```bash
sudo tail -f /var/log/nginx/error.log
```

### Ошибка 413 (Request Entity Too Large)

Увеличьте лимит в Nginx:
```nginx
client_max_body_size 500M;
```

### CORS ошибки

Проверьте `FRONTEND_URL` в `.env` файле backend.

## Готово! 🎉

После выполнения всех шагов ваш PipirkaTube будет доступен по адресу вашего домена, и пользователи смогут загружать и просматривать видео!

